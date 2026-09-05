import { addPath, exportVariable, getBooleanInput, getInput, setOutput } from '#actions';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let dir: string;
const saved: Record<string, string | undefined> = {};
const KEYS = ['GITHUB_PATH', 'GITHUB_ENV', 'GITHUB_OUTPUT', 'INPUT_DOCTOR', 'INPUT_RUNTIMES', 'PATH'];

beforeEach(() => {
	dir = mkdtempSync(path.join(os.tmpdir(), 'actions-shell-actions-'));
	for (const k of KEYS) saved[k] = process.env[k];
	for (const k of ['GITHUB_PATH', 'GITHUB_ENV', 'GITHUB_OUTPUT']) {
		process.env[k] = path.join(dir, k);
		writeFileSync(process.env[k], '');
	}
});
afterEach(() => {
	for (const k of KEYS) {
		if (saved[k] === undefined) delete process.env[k];
		else process.env[k] = saved[k];
	}
	rmSync(dir, { recursive: true, force: true });
});

describe('actions', () => {
	it('reads inputs the way the runner exposes them', () => {
		process.env['INPUT_DOCTOR'] = ' true ';
		process.env['INPUT_RUNTIMES'] = 'go, rust';
		expect(getBooleanInput('doctor')).toBe(true);
		expect(getInput('runtimes')).toBe('go, rust');
		process.env['INPUT_DOCTOR'] = 'nope';
		expect(() => getBooleanInput('doctor')).toThrow(TypeError);
	});

	it('appends to GITHUB_PATH and prepends to the live PATH', () => {
		addPath('/x/bin');
		expect(readFileSync(process.env['GITHUB_PATH'] as string, 'utf8')).toBe(`/x/bin${os.EOL}`);
		expect(process.env['PATH']?.startsWith(`/x/bin${path.delimiter}`)).toBe(true);
	});

	it('writes heredoc file commands for env and output', () => {
		exportVariable('FOO', 'bar\nbaz');
		setOutput('cli', '/c.mjs');
		expect(process.env['FOO']).toBe('bar\nbaz');
		expect(readFileSync(process.env['GITHUB_ENV'] as string, 'utf8')).toMatch(
			/^FOO<<(actions-shell_[0-9a-f-]+)\nbar\nbaz\n\1\n$/,
		);
		expect(readFileSync(process.env['GITHUB_OUTPUT'] as string, 'utf8')).toMatch(
			/^cli<<(actions-shell_[0-9a-f-]+)\n\/c\.mjs\n\1\n$/,
		);
	});
});
