import { resolveRuntime } from '#registry';
import { resolveCommand } from '#run';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const cli = path.resolve(import.meta.dirname, '../../cli.mjs');
const adapter = resolveRuntime('uv-python');
const available = adapter && resolveCommand(adapter).resolved;
let dir: string;
beforeEach(() => { dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell 'uv ")); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function run(runtime: string, source: string, args: string[] = []) {
	const script = path.join(dir, 'script');
	writeFileSync(script, source);
	const result = spawnSync(process.execPath, [cli, runtime, ...args, script], {
		cwd: dir, encoding: 'utf8', timeout: 120_000,
	});
	expect(result.error).toBeUndefined();
	expect(readFileSync(script, 'utf8')).toBe(source);
	expect(readdirSync(dir)).toEqual(['script']);
	return result;
}

describe.skipIf(!available)('uv Python', () => {
	it.each(['uv', 'uv-python'])('runs %s and preserves script exits', runtime => {
		const result = run(runtime, 'print("ok")\nraise SystemExit(23)', ['--no-project']);
		expect(result.status, result.stderr).toBe(23);
		expect(result.stdout.trim()).toBe('ok');
	});

	it.each([
		['uv-python3.11', []],
		['uv', ['--python', '3.11']],
	] as const)('selects Python through %s', (runtime, args) => {
		const result = run(runtime, 'import sys\nprint("%s.%s" % sys.version_info[:2])', [...args]);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('3.11');
	}, 120_000);

	it('resolves inline dependencies from an extensionless source', () => {
		const result = run('uv', '# /// script\n# dependencies = ["idna==3.11"]\n# ///\nimport idna\nprint(idna.encode("münich.example").decode())');
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('xn--mnich-kva.example');
	}, 120_000);

	it('forwards per-invocation dependencies', () => {
		const result = run('uv-python', 'import idna\nprint(idna.__version__)', ['--with', 'idna==3.11']);
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout.trim()).toBe('3.11');
	}, 120_000);

	it('reports uv readiness for a versioned selector without downloading Python', () => {
		const result = spawnSync(process.execPath, [cli, 'doctor', 'uv-python3.999'], { encoding: 'utf8' });
		expect(result.status, result.stderr).toBe(0);
		expect(result.stdout).toContain('ready');
	});
});
