import { resolveRuntime } from '#registry';
import { resolveCommand } from '#run';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../cli.mjs');
const python = resolveRuntime('python');
const executable = python && resolveCommand(python).resolved;
const version = executable && spawnSync(executable, ['-c', 'import sys; print("%s.%s" % sys.version_info[:2])'], { encoding: 'utf8' }).stdout.trim();
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell 'python ")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe.skipIf(!version)('installed Python selection', () => {
	it.skipIf(process.platform !== 'win32')('finds a versioned Windows executable using PATHEXT', () => {
		const script = path.join(dir, 'script');
		writeFileSync(script, 'import sys\nprint("%s.%s" % sys.version_info[:2])');
		writeFileSync(path.join(dir, `python${version}.CMD`), `@"${executable}" %*\r\n`);
		const result = spawnSync(process.execPath, [cli, `py${version}`, script], {
			encoding: 'utf8', env: { ...process.env, PATH: dir, Path: dir, PATHEXT: '.CMD' },
		});
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe(version);
	});
	it.each(['python', 'py', `python${version}`, `py${version}`])('runs %s with flags and preserves exits', runtime => {
		const script = path.join(dir, 'script');
		const source = 'import sys\nprint("%s.%s" % sys.version_info[:2])\nassert sys.flags.dont_write_bytecode\nraise SystemExit(23)';
		writeFileSync(script, source);
		const result = spawnSync(process.execPath, [cli, runtime, '-B', script], { encoding: 'utf8' });
		expect(result.status, result.stderr).toBe(23);
		expect(result.stdout.trim()).toBe(version);
		expect(readFileSync(script, 'utf8')).toBe(source);
		expect(readdirSync(dir)).toEqual(['script']);
	});

	it('reports readiness and describes versioned aliases', () => {
		for (const command of ['doctor', 'describe']) {
			const result = spawnSync(process.execPath, [cli, command, `py${version}`], { encoding: 'utf8' });
			expect(result.status, result.stderr).toBe(0);
			expect(result.stdout).toContain(`python${version}`);
		}
	});

	it('refuses another minor version before executing the script', () => {
		const script = path.join(dir, 'script');
		writeFileSync(script, 'print("unreachable")');
		const result = spawnSync(process.execPath, [cli, 'py3.999', script], { encoding: 'utf8' });
		expect(result.status).toBe(127);
		expect(result.stderr).toContain('no compatible version');
		expect(result.stdout).not.toContain('unreachable');
	});
});
