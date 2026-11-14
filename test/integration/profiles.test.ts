import { resolveRuntime } from '#registry';
import { resolveCommand } from '#run';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../cli.mjs');
let dir: string;
beforeEach(() => {
	dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell 'profiles "));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function available(runtime: string): boolean {
	const adapter = resolveRuntime(runtime);
	return !!adapter && !!resolveCommand(adapter).resolved;
}

function run(runtime: string, source: string, args: string[] = [], relative = false) {
	const script = path.join(dir, 'script');
	writeFileSync(script, source);
	const result = spawnSync(process.execPath, [cli, runtime, ...args, relative ? path.basename(script) : script], {
		cwd: dir,
		encoding: 'utf8',
		timeout: 15_000,
	});
	expect(result.error).toBeUndefined();
	expect(readFileSync(script, 'utf8')).toBe(source);
	expect(readdirSync(dir)).toEqual(['script']);
	return result;
}

describe.skipIf(!available('bash'))('Bash profile', () => {
	it.each([
		'false\nprintf "unreachable"',
		'false | true\nprintf "unreachable"',
		'unset PROFILE_MISSING\nprintf "%s" "$PROFILE_MISSING"\nprintf "unreachable"',
	])('stops after an unhandled failure: %s', source => {
		const result = run('bash', source);
		expect(result.status).not.toBe(0);
		expect(result.stdout).not.toContain('unreachable');
	});

	it('preserves an explicit exit status', () => {
		const result = run('bash', 'printf "hello"\nexit 23');
		expect(result.stdout).toBe('hello');
		expect(result.status).toBe(23);
	});

	it('lets callers opt out of nounset', () => {
		const result = run('bash', 'unset PROFILE_MISSING\nprintf "ok%s" "$PROFILE_MISSING"', ['+u']);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toBe('ok');
	});

	it('retains normal conditional failure handling', () => {
		const result = run('bash', 'if false; then exit 1; fi\nprintf "handled"');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toBe('handled');
	});

	it.each(
		[
			['-x', []],
			['-x +u', ['--posix']],
			['--posix -x', ['+u']],
			['-o noclobber', ['--posix', '+u']],
		] as const,
	)('orders environment arguments %s with caller arguments', (extra, args) => {
		const script = path.join(dir, 'script');
		writeFileSync(script, 'printf "ok"');
		const env = { ...process.env, ACTIONS_SHELL_BASH_ARGS: extra };
		const result = spawnSync(process.execPath, [cli, 'bash', ...args, script], { encoding: 'utf8', env });
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toBe('ok');
		const doctor = spawnSync(process.execPath, [cli, 'doctor', 'bash'], { encoding: 'utf8', env });
		expect(doctor.status, doctor.stderr).toBe(0);
	});

	it('accepts long options before short-option overrides', () => {
		const result = run('bash', 'unset PROFILE_MISSING\nprintf "ok%s" "$PROFILE_MISSING"\n[[ -o posix ]]', [
			'--posix',
			'+u',
		]);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toBe('ok');
	});
});

describe.skipIf(!available('pwsh'))('PowerShell profile', () => {
	it('runs a bare filename from the working directory', () => {
		const result = run('pwsh', 'Write-Output "ok"', [], true);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('ok');
	});
	it.each(['Write-Error "broken"', 'throw "broken"'])('stops after %s', failure => {
		const result = run('pwsh', `${failure}\nWrite-Output "unreachable"`);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('broken');
		expect(result.stdout).not.toContain('unreachable');
	});

	it('preserves explicit script exits and handles quoted paths', () => {
		const result = run('pwsh', 'Write-Output "hello"; exit 23');
		expect(result.status, result.stderr).toBe(23);
		expect(result.stdout.trim()).toBe('hello');
	});

	it('stops on native failures and preserves their exit status', () => {
		const node = process.execPath.replaceAll("'", "''");
		const result = run('pwsh', `& '${node}' -e 'process.exit(37)'\nWrite-Output "unreachable"`);
		expect(result.status, result.stderr).toBe(37);
		expect(result.stdout).not.toContain('unreachable');
	});

	it('succeeds after successful PowerShell and native commands', () => {
		const node = process.execPath.replaceAll("'", "''");
		const result = run('pwsh', `& '${node}' -e 'process.exit(0)'\nWrite-Output "ok"`);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('ok');
	});

	it('allows a script to handle an expected native failure', () => {
		const node = process.execPath.replaceAll("'", "''");
		const result = run('pwsh', `try { & '${node}' -e 'process.exit(9)' } catch { Write-Output "handled" }; exit 0`);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('handled');
	});
});
