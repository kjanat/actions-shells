import type { PreparedSource } from '#prepare';
import { cleanupSource, prepareSource } from '#prepare';
import { applyEnvOverrides } from '#registry';
import { planSpawn } from '#spawn-args';
import type { RuntimeAdapter, RuntimePreparation, RuntimeTool, Stage } from '#types';
import { which } from '#which';
import { spawn } from 'node:child_process';
import { openSync, rmSync } from 'node:fs';
import os from 'node:os';

export class RuntimeNotFoundError extends Error {
	constructor(
		readonly adapter: RuntimeTool,
		readonly command: string,
		runtime = adapter.name,
	) {
		super(
			`actions-shell: runtime "${runtime}" needs \`${command}\` on PATH, but it was not found.`
				+ (adapter.install ? `\n  hint: install it with ${adapter.install}` : '')
				+ `\n  hint: run \`actions-shell doctor ${runtime}\` for details`,
		);
	}
}

export interface RunOptions {
	adapter: RuntimeAdapter;
	scriptPath: string;
	userArgs: readonly string[];
	env?: NodeJS.ProcessEnv;
}

/** Resolve the executable for an adapter, honouring env overrides and fallbacks. */
export function resolveCommand(
	adapter: RuntimeTool,
	env: NodeJS.ProcessEnv = process.env,
): { command: string; resolved: string | undefined; extraArgs: string[] } {
	const { command, extraArgs } = applyEnvOverrides(adapter, env);
	const names = command === adapter.command ? [command, ...(adapter.fallbackCommands ?? [])] : [command];
	for (const name of names) {
		const resolved = which(name, env);
		if (resolved) return { command: name, resolved, extraArgs };
	}
	return { command, resolved: undefined, extraArgs };
}

export interface Invocation {
	/** Optional compile stage, run first; its output becomes `run.executable`. */
	compile?: Stage & { output: string };
	run: Stage;
	prepared: PreparedSource;
	preparation?: RuntimePreparation;
}

/** Build the full invocation (compile + run stages) without running anything. */
export function buildInvocation(opts: RunOptions): Invocation {
	const env = opts.env ?? process.env;
	const { adapter } = opts;
	if (adapter.platforms && !adapter.platforms.includes(process.platform)) {
		throw new Error(`actions-shell: ${adapter.name} supports hosts: ${adapter.platforms.join(', ')}.`);
	}
	const { command, resolved, extraArgs } = resolveCommand(adapter, env);
	if (!resolved) throw new RuntimeNotFoundError(adapter, command);
	const resolve = (tool: RuntimeTool) => {
		const result = resolveCommand(tool, env);
		if (!result.resolved) throw new RuntimeNotFoundError(tool, result.command, adapter.name);
		return { executable: result.resolved, extraArgs: result.extraArgs };
	};
	for (const tool of adapter.requirements?.(env) ?? []) resolve(tool);
	const prepared = prepareSource(opts.scriptPath, adapter.input);
	if (adapter.prepare) {
		let preparation: RuntimePreparation | undefined;
		try {
			preparation = adapter.prepare(prepared.path, opts.userArgs, { env, resolve });
			return {
				run: { executable: resolved, args: [...extraArgs, ...adapter.args(preparation.path, opts.userArgs)] },
				prepared,
				preparation,
			};
		} catch (error) {
			preparation?.cleanup();
			cleanupSource(prepared, env);
			throw error;
		}
	}
	if (adapter.compile) {
		const c = adapter.compile(prepared.path, opts.userArgs);
		return {
			compile: { executable: resolved, args: [...extraArgs, ...c.args], output: c.output },
			run: { executable: c.output, args: adapter.args(c.output, []).filter((a) => a !== c.output) },
			prepared,
		};
	}
	const args = [...extraArgs, ...adapter.args(prepared.path, opts.userArgs)];
	return { run: { executable: resolved, args }, prepared };
}

/** Run the script and resolve with the exit code to use for our own process. */
export async function runScript(opts: RunOptions): Promise<number> {
	const inv = buildInvocation(opts);
	const env = inv.preparation?.env ?? opts.env ?? process.env;
	const debug = env.ACTIONS_SHELL_DEBUG === '1' || env.ACTIONS_SHELL_DEBUG === 'true';
	const cancellation = inv.preparation?.onSignal ? { onSignal: inv.preparation.onSignal } : {};

	try {
		for (const stage of inv.preparation?.stages ?? []) {
			const code = await spawnStage(stage, { debug, env, stdin: 'inherit', ...cancellation });
			if (code !== 0) return code;
		}
		if (inv.compile) {
			const code = await spawnStage(inv.compile, { debug, env, stdin: 'inherit' });
			if (code !== 0) return code;
		}
		return await spawnStage(inv.run, {
			...cancellation,
			debug,
			env,
			stdin: inv.prepared.useStdin ? openSync(inv.prepared.original, 'r') : 'inherit',
		});
	} finally {
		inv.preparation?.cleanup();
		cleanupSource(inv.prepared, env);
		if (inv.compile) cleanupArtifact(inv.compile.output, env);
	}
}

function cleanupArtifact(file: string, env: NodeJS.ProcessEnv): void {
	if (env.ACTIONS_SHELL_KEEP === '1' || env.ACTIONS_SHELL_KEEP === 'true') return;
	try {
		rmSync(file, { force: true });
	} catch {
		/* best effort */
	}
}

interface SpawnStageOptions {
	debug: boolean;
	env: NodeJS.ProcessEnv;
	stdin: number | 'inherit';
	onSignal?: (signal: NodeJS.Signals) => void;
}

function spawnStage(stage: Stage, o: SpawnStageOptions): Promise<number> {
	const { executable, args } = stage;
	if (o.debug) process.stderr.write(`actions-shell: ${[executable, ...args].map(quote).join(' ')}\n`);
	return new Promise<number>((resolve) => {
		const plan = planSpawn(executable, args);
		const processGroup = Boolean(o.onSignal) && process.platform !== 'win32';
		const child = spawn(plan.file, plan.args, {
			detached: processGroup,
			stdio: [o.stdin, stage.stdout ?? 'inherit', 'inherit'],
			env: o.env,
			windowsHide: true,
			windowsVerbatimArguments: plan.windowsVerbatimArguments,
		});

		let interrupted: NodeJS.Signals | undefined;
		const forward = (signal: NodeJS.Signals) => () => {
			interrupted ??= signal;
			if (processGroup && child.pid) {
				try {
					process.kill(-child.pid, signal);
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
				}
			} else if (!child.killed) child.kill(signal);
			o.onSignal?.(signal);
		};
		const onInt = forward('SIGINT');
		const onTerm = forward('SIGTERM');
		process.on('SIGINT', onInt);
		process.on('SIGTERM', onTerm);

		const finish = (code: number) => {
			process.off('SIGINT', onInt);
			process.off('SIGTERM', onTerm);
			resolve(interrupted ? signalExitCode(interrupted) : code);
		};

		child.on('error', (err) => {
			process.stderr.write(`actions-shell: failed to start ${executable}: ${err.message}\n`);
			finish(127);
		});
		child.on('exit', (code, signal) => {
			if (signal) {
				process.stderr.write(`actions-shell: ${executable} terminated by ${signal}\n`);
				finish(signalExitCode(signal));
			} else {
				finish(code ?? 1);
			}
		});
	});
}

function signalExitCode(signal: NodeJS.Signals): number {
	if (process.platform === 'win32') return 1;
	const num = (os.constants.signals as Record<string, number>)[signal];
	return num ? 128 + num : 1;
}

function quote(arg: string): string {
	return /^[\w./:@=+-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
