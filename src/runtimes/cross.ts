import { rustScript } from '#runtimes/rust-script';
import type { PreparationContext, RuntimeAdapter, RuntimePreparation, RuntimeTool } from '#types';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const githubFiles = ['GITHUB_OUTPUT', 'GITHUB_ENV', 'GITHUB_PATH', 'GITHUB_STEP_SUMMARY', 'GITHUB_STATE'];

function requirements(env: NodeJS.ProcessEnv): RuntimeTool[] {
	return [
		rustScript,
		{ name: 'rustup', title: 'Rustup', command: 'rustup', install: 'dtolnay/rust-toolchain' },
		{
			name: 'cross-container-engine',
			title: 'Cross container engine',
			command: env.CROSS_CONTAINER_ENGINE || 'docker',
			fallbackCommands: env.CROSS_CONTAINER_ENGINE ? [] : ['podman'],
			versionArgs: ['info'],
			install: 'Docker or Podman with a running local container engine',
		},
	];
}

function splitCrossArgs(args: readonly string[]): { options: string[]; program: string[] } {
	const separator = args.indexOf('--');
	return {
		options: args.slice(0, separator < 0 ? args.length : separator),
		program: separator < 0 ? [] : args.slice(separator),
	};
}

function crossArgs(manifest: string, userArgs: readonly string[]): string[] {
	const { options: args, program } = splitCrossArgs(userArgs);
	const toolchain = args[0]?.startsWith('+') ? [args.shift() as string] : [];
	return [...toolchain, 'run', ...args, '--manifest-path', manifest, ...program];
}

function validateArgs(userArgs: readonly string[]): void {
	const { options: args } = splitCrossArgs(userArgs);
	let target: string | undefined;
	for (const [i, arg] of args.entries()) {
		if (arg === '--manifest-path' || arg.startsWith('--manifest-path=')) {
			throw new Error('actions-shell: cross manages --manifest-path for the inline script.');
		}
		if (arg === '--target' || arg.startsWith('--target=')) {
			if (target !== undefined) throw new Error('actions-shell: cross accepts one --target per script.');
			target = arg === '--target' ? args[i + 1] : arg.slice('--target='.length);
			if (!target || target.startsWith('-')) throw new Error('actions-shell: cross --target needs a target triple.');
		}
	}
	if (!target) throw new Error('actions-shell: cross requires --target <triple> before the script path.');
}

// CROSS_CONTAINER_OPTS is parsed by Cross, not passed to a host shell.
const quote = (value: string) => `'${value.replaceAll("'", "'\"'\"'")}'`;

function containerEnv(env: NodeJS.ProcessEnv, name: string): NodeJS.ProcessEnv {
	const opts: string[] = ['--name', name];
	const mounted = new Set<string>();
	const mount = (value: string) => {
		const absolute = path.resolve(value);
		if (absolute.includes(':')) throw new Error('actions-shell: cross mount paths cannot contain a colon.');
		if (!mounted.has(absolute)) {
			opts.push('--volume', `${absolute}:${absolute}`);
			mounted.add(absolute);
		}
	};
	mount(process.cwd());
	if (env.GITHUB_WORKSPACE) {
		if (!statSync(env.GITHUB_WORKSPACE).isDirectory()) throw new Error('GITHUB_WORKSPACE must be a directory.');
		mount(env.GITHUB_WORKSPACE);
		opts.push('--env', 'GITHUB_WORKSPACE');
	}
	for (const key of githubFiles) {
		const value = env[key];
		if (!value) continue;
		if (!path.isAbsolute(value) || !statSync(value).isFile()) {
			throw new Error(`${key} must name an existing absolute file.`);
		}
		mount(value);
		opts.push('--env', key);
	}
	for (const key of ['GITHUB_ACTIONS', 'CI']) {
		if (env[key] !== undefined) opts.push('--env', key);
	}
	const config = env.CROSS_CONFIG || (existsSync('Cross.toml') ? path.resolve('Cross.toml') : undefined);
	return {
		...env,
		...(config ? { CROSS_CONFIG: path.resolve(config) } : {}),
		CROSS_CONTAINER_OPTS: [env.CROSS_CONTAINER_OPTS, ...opts.map(quote)].filter(Boolean).join(' '),
	};
}

function prepare(script: string, args: readonly string[], context: PreparationContext): RuntimePreparation {
	for (const key of ['CROSS_REMOTE', 'CROSS_CONTAINER_IN_CONTAINER']) {
		if (context.env[key] === '1' || context.env[key] === 'true') {
			throw new Error(`actions-shell: cross requires a local container engine on the host (${key} is enabled).`);
		}
	}
	validateArgs(args);
	const helper = context.resolve(rustScript);
	const engine = context.resolve(requirements(context.env)[2] as RuntimeTool);
	const container = `actions-shell-cross-${randomUUID()}`;
	const env = containerEnv({ ...context.env, CROSS_CONTAINER_ENGINE: engine.executable }, container);
	const dir = mkdtempSync(path.join(os.tmpdir(), 'actions-shell-cross-'));
	const cleanup = () => {
		if (env.ACTIONS_SHELL_KEEP === '1' || env.ACTIONS_SHELL_KEEP === 'true') return;
		rmSync(dir, { recursive: true, force: true });
	};
	try {
		const source = path.join(dir, 'script.rs');
		copyFileSync(script, source);
		return {
			path: path.join(dir, 'Cargo.toml'),
			stages: [{
				executable: helper.executable,
				args: [...helper.extraArgs, '--package', '--pkg-path', dir, '--base-path', process.cwd(), source],
				stdout: 'ignore',
			}],
			env,
			onSignal: () => {
				spawnSync(engine.executable, [...engine.extraArgs, 'rm', '--force', container], {
					env,
					stdio: 'ignore',
					timeout: 10_000,
				});
			},
			cleanup,
		};
	} catch (error) {
		cleanup();
		throw error;
	}
}

export const cross: RuntimeAdapter = {
	name: 'cross',
	title: 'Rust (cross)',
	command: 'cross',
	input: { kind: 'file', description: 'temporary Cargo package (rust-script)' },
	platforms: ['linux'],
	exampleArgs: ['--target', 'aarch64-unknown-linux-gnu'],
	args: crossArgs,
	requirements,
	prepare,
	install: 'dtolnay/rust-toolchain + taiki-e/install-action (cross, rust-script) + Docker or Podman',
	notes: 'Runs inline Rust on an explicit --target using Cross. Linux hosts with a local container engine. '
		+ 'Accepts rust-script statements and embedded Cargo manifests. Other environment variables use Cross passthrough.',
};
