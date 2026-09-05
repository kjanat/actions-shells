import { planSpawn } from '#spawn-args';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');
const SETUP = path.resolve(ROOT, 'setup.mjs');

describe('setup action', () => {
	it('writes shims, adds to GITHUB_PATH and works end-to-end', () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), 'actions-shell-setup-'));
		try {
			const ghPath = path.join(dir, 'github_path');
			const ghEnv = path.join(dir, 'github_env');
			const ghOut = path.join(dir, 'github_output');
			for (const f of [ghPath, ghEnv, ghOut]) writeFileSync(f, '');
			const r = spawnSync(process.execPath, [SETUP], {
				encoding: 'utf8',
				env: {
					...process.env,
					RUNNER_TEMP: dir,
					GITHUB_PATH: ghPath,
					GITHUB_ENV: ghEnv,
					GITHUB_OUTPUT: ghOut,
					INPUT_DOCTOR: 'false',
					INPUT_RUNTIMES: '',
				},
				windowsHide: true,
			});
			expect(r.status, r.stderr + r.stdout).toBe(0);
			const binDir = readFileSync(ghPath, 'utf8').trim();
			expect(binDir).toBe(path.join(dir, 'actions-shell', 'bin'));
			expect(existsSync(path.join(binDir, 'actions-shell'))).toBe(true);
			expect(existsSync(path.join(binDir, 'actions-shell.cmd'))).toBe(true);

			const script = path.join(dir, 'step');
			writeFileSync(script, 'console.log("via shim")');
			const shim = path.join(
				binDir,
				process.platform === 'win32' ? 'actions-shell.cmd' : 'actions-shell',
			);
			const plan = planSpawn(shim, ['node', script]);
			const s = spawnSync(plan.file, plan.args, {
				encoding: 'utf8',
				windowsHide: true,
				windowsVerbatimArguments: plan.windowsVerbatimArguments,
			});
			expect(s.stdout.trim(), s.stderr).toBe('via shim');
			expect(s.status).toBe(0);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
