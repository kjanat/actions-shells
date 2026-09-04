import { spawn } from "node:child_process";
import { openSync, rmSync } from "node:fs";
import os from "node:os";
import { cleanupSource, type PreparedSource, prepareSource } from "./prepare.js";
import { applyEnvOverrides } from "./registry.js";
import { planSpawn } from "./spawn-args.js";
import type { RuntimeAdapter } from "./types.js";
import { which } from "./which.js";

export class RuntimeNotFoundError extends Error {
  constructor(
    readonly adapter: RuntimeAdapter,
    readonly command: string,
  ) {
    super(
      `actions-shell: runtime "${adapter.name}" needs \`${command}\` on PATH, but it was not found.` +
        (adapter.install ? `\n  hint: install it with ${adapter.install}` : "") +
        `\n  hint: run \`actions-shell doctor ${adapter.name}\` for details`,
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
  adapter: RuntimeAdapter,
  env: NodeJS.ProcessEnv = process.env,
): { command: string; resolved: string | undefined; extraArgs: string[] } {
  const { command, extraArgs } = applyEnvOverrides(adapter, env);
  const names =
    command === adapter.command ? [command, ...(adapter.fallbackCommands ?? [])] : [command];
  for (const name of names) {
    const resolved = which(name, env);
    if (resolved) return { command: name, resolved, extraArgs };
  }
  return { command, resolved: undefined, extraArgs };
}

export interface Stage {
  executable: string;
  args: string[];
}

export interface Invocation {
  /** Optional compile stage, run first; its output becomes `run.executable`. */
  compile?: Stage & { output: string };
  run: Stage;
  prepared: PreparedSource;
}

/** Build the full invocation (compile + run stages) without running anything. */
export function buildInvocation(opts: RunOptions): Invocation {
  const env = opts.env ?? process.env;
  const { adapter } = opts;
  const { command, resolved, extraArgs } = resolveCommand(adapter, env);
  if (!resolved) throw new RuntimeNotFoundError(adapter, command);
  const prepared = prepareSource(opts.scriptPath, adapter.input);
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
  const env = opts.env ?? process.env;
  const inv = buildInvocation(opts);
  const debug = env.ACTIONS_SHELL_DEBUG === "1" || env.ACTIONS_SHELL_DEBUG === "true";

  try {
    if (inv.compile) {
      const code = await spawnStage(inv.compile, { debug, env, stdin: "inherit" });
      if (code !== 0) return code;
    }
    return await spawnStage(inv.run, {
      debug,
      env,
      stdin: inv.prepared.useStdin ? openSync(inv.prepared.original, "r") : "inherit",
    });
  } finally {
    cleanupSource(inv.prepared, env);
    if (inv.compile) cleanupArtifact(inv.compile.output, env);
  }
}

function cleanupArtifact(file: string, env: NodeJS.ProcessEnv): void {
  if (env.ACTIONS_SHELL_KEEP === "1" || env.ACTIONS_SHELL_KEEP === "true") return;
  try {
    rmSync(file, { force: true });
  } catch {
    /* best effort */
  }
}

interface SpawnStageOptions {
  debug: boolean;
  env: NodeJS.ProcessEnv;
  stdin: number | "inherit";
}

function spawnStage(stage: Stage, o: SpawnStageOptions): Promise<number> {
  const { executable, args } = stage;
  if (o.debug) {
    process.stderr.write(`actions-shell: ${[executable, ...args].map(quote).join(" ")}\n`);
  }
  return new Promise<number>((resolve) => {
    const plan = planSpawn(executable, args);
    const child = spawn(plan.file, plan.args, {
      stdio: [o.stdin, "inherit", "inherit"],
      env: o.env,
      windowsHide: true,
      windowsVerbatimArguments: plan.windowsVerbatimArguments,
    });

    const forward = (signal: NodeJS.Signals) => () => {
      if (!child.killed) child.kill(signal);
    };
    const onInt = forward("SIGINT");
    const onTerm = forward("SIGTERM");
    process.on("SIGINT", onInt);
    process.on("SIGTERM", onTerm);

    const finish = (code: number) => {
      process.off("SIGINT", onInt);
      process.off("SIGTERM", onTerm);
      resolve(code);
    };

    child.on("error", (err) => {
      process.stderr.write(`actions-shell: failed to start ${executable}: ${err.message}\n`);
      finish(127);
    });
    child.on("exit", (code, signal) => {
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
  if (process.platform === "win32") return 1;
  const num = (os.constants.signals as Record<string, number>)[signal];
  return num ? 128 + num : 1;
}

function quote(arg: string): string {
  return /^[\w./:@=+-]+$/.test(arg) ? arg : JSON.stringify(arg);
}
