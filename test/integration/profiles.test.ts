import { resolveRuntime } from '#registry';
import { resolveCommand } from '#run';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../cli.mjs');
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell 'profiles ")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function available(runtime: string): boolean {
	const adapter = resolveRuntime(runtime);
	return !!adapter && !!resolveCommand(adapter).resolved;
}

function run(runtime: string, source: string, args: string[] = []) {
	const script = path.join(dir, 'script');
	writeFileSync(script, source);
	const result = spawnSync(process.execPath, [cli, runtime, ...args, script], {
		encoding: 'utf8', timeout: 15_000,
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

	it('accepts long options before short-option overrides', () => {
		const result = run('bash', 'unset PROFILE_MISSING\nprintf "ok%s" "$PROFILE_MISSING"\n[[ -o posix ]]', ['--posix', '+u']);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toBe('ok');
	});
});
