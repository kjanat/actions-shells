import { doctor } from '#doctor';
import { splitArgs } from '#registry';
import { buildInvocation, runScript } from '#run';
import { cross } from '#runtimes/cross';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let dir: string;
let script: string;
let env: NodeJS.ProcessEnv;
beforeEach(() => {
	dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-test 'cross "));
	script = path.join(dir, 'input');
	writeFileSync(script, 'println!("hello");');
	const helper = path.join(dir, 'helper.mjs');
	writeFileSync(
		helper,
		`
		import fs from 'node:fs';
		const dir = process.argv[process.argv.indexOf('--pkg-path') + 1];
		fs.writeFileSync(process.env.TEST_PACKAGE_PATH, dir);
		fs.writeFileSync(dir + '/Cargo.toml', '[package]');
		process.exit(Number(process.env.TEST_PREPARE_EXIT ?? 0));
	`,
	);
	const runner = path.join(dir, 'runner.mjs');
	writeFileSync(
		runner,
		`
		import fs from 'node:fs';
		const manifest = process.argv.at(-1);
		if (!fs.existsSync(manifest)) throw new Error('package was not prepared');
		fs.writeFileSync(process.env.TEST_EXECUTED, 'yes');
		process.exit(42);
	`,
	);
	env = {
		...process.env,
		ACTIONS_SHELL_CROSS_COMMAND: process.execPath,
		ACTIONS_SHELL_CROSS_ARGS: `"${runner}"`,
		ACTIONS_SHELL_RUST_SCRIPT_COMMAND: process.execPath,
		ACTIONS_SHELL_RUST_SCRIPT_ARGS: `"${helper}"`,
		ACTIONS_SHELL_RUSTUP_COMMAND: process.execPath,
		ACTIONS_SHELL_CROSS_CONTAINER_ENGINE_COMMAND: process.execPath,
		TEST_PACKAGE_PATH: path.join(dir, 'package-path'),
		TEST_EXECUTED: path.join(dir, 'executed'),
	};
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe.skipIf(process.platform !== 'linux')('cross preparation', () => {
	it('executes the generated package, preserves its exit code, and removes only owned files', async () => {
		const code = await runScript({
			adapter: cross,
			scriptPath: script,
			userArgs: ['--target', 'aarch64-unknown-linux-gnu'],
			env,
		});
		expect(code).toBe(42);
		expect(readFileSync(env.TEST_EXECUTED as string, 'utf8')).toBe('yes');
		expect(existsSync(readFileSync(env.TEST_PACKAGE_PATH as string, 'utf8'))).toBe(false);
		expect(readFileSync(script, 'utf8')).toBe('println!("hello");');
	});

	it('stops on a failed preparation stage and still cleans the package', async () => {
		env.TEST_PREPARE_EXIT = '23';
		const code = await runScript({
			adapter: cross,
			scriptPath: script,
			userArgs: ['--target=x86_64-unknown-linux-musl'],
			env,
		});
		expect(code).toBe(23);
		expect(existsSync(env.TEST_EXECUTED as string)).toBe(false);
		expect(existsSync(readFileSync(env.TEST_PACKAGE_PATH as string, 'utf8'))).toBe(false);
	});

	it('keeps the generated package when requested', async () => {
		env.ACTIONS_SHELL_KEEP = '1';
		await runScript({ adapter: cross, scriptPath: script, userArgs: ['--target=x86_64-unknown-linux-musl'], env });
		const packageDir = readFileSync(env.TEST_PACKAGE_PATH as string, 'utf8');
		try {
			expect(existsSync(path.join(packageDir, 'Cargo.toml'))).toBe(true);
		} finally {
			rmSync(packageDir, { recursive: true, force: true });
		}
	});

	it('mounts workspace and GitHub files without placing environment values in command arguments', () => {
		const output = path.join(dir, 'output');
		writeFileSync(output, '');
		const inv = buildInvocation({
			adapter: cross,
			scriptPath: script,
			userArgs: ['+stable', '--target', 'aarch64-unknown-linux-gnu'],
			env: {
				...env,
				GITHUB_WORKSPACE: dir,
				GITHUB_OUTPUT: output,
				PRIVATE_TEST_VALUE: 'private',
				CROSS_CONTAINER_OPTS: '--network host',
			},
		});
		try {
			const args = splitArgs(inv.preparation?.env.CROSS_CONTAINER_OPTS ?? '');
			expect(args.slice(0, 2)).toEqual(['--network', 'host']);
			expect(args).toContain(`${dir}:${dir}`);
			expect(args).toContain(`${output}:${output}`);
			expect(args).toContain('GITHUB_OUTPUT');
			expect(args).not.toContain('PRIVATE_TEST_VALUE');
			expect(args.join(' ')).not.toContain('private');
			expect(inv.run.args.slice(1, 3)).toEqual(['+stable', 'run']);
			expect(inv.run.args.at(-1)).toBe(inv.preparation?.path);
		} finally {
			inv.preparation?.cleanup();
		}
	});

	it.each([
		[[], 'requires --target'],
		[['--target'], 'needs a target triple'],
		[['--target='], 'needs a target triple'],
		[['--target=x', '--target=y'], 'one --target'],
		[['--target=x', '--manifest-path=other'], 'manages --manifest-path'],
	])('rejects invalid adapter arguments %j', (args, error) => {
		expect(() => buildInvocation({ adapter: cross, scriptPath: script, userArgs: args, env })).toThrow(error);
	});

	it('reports a missing package generator before allocating a package', () => {
		expect(() => buildInvocation({
			adapter: cross,
			scriptPath: script,
			userArgs: ['--target=x'],
			env: { ...env, ACTIONS_SHELL_RUST_SCRIPT_COMMAND: '/missing/rust-script' },
		})).toThrow('rust-script');
	});
});

it('doctor distinguishes a missing prerequisite from an installed primary command', () => {
	const report = doctor({
		name: 'example',
		title: 'Example',
		command: process.execPath,
		input: { kind: 'file' },
		args: (p) => [p],
		requirements: () => [{ name: 'helper', title: 'Helper', command: '/missing/helper' }],
	});
	expect(report.status).toBe('prerequisite-check-failed');
	expect(report.requirements?.[0]?.status).toBe('missing');
});
