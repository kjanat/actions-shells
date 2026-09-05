#!/usr/bin/env node
import { addPath, debug, exportVariable, getBooleanInput, getInput, info, setFailed, setOutput } from '#actions';
import { writeShims } from '#shim';
import { VERSION } from '#version';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function run(): void {
	// Both files sit side by side in the release tag root (and in the repo root after `pnpm build`).
	const cliPath = path.join(import.meta.dirname, 'cli.mjs');
	if (!existsSync(cliPath)) {
		setFailed(
			`cli.mjs not found next to setup.mjs (${cliPath}). Use a release tag such as kjanat/actions-shells@v1 — master carries no built files.`,
		);
		return;
	}

	const root = process.env['RUNNER_TEMP'] || os.tmpdir();
	const binDir = path.join(root, 'actions-shell', 'bin');
	const written = writeShims({ binDir, nodePath: process.execPath, cliPath });

	addPath(binDir);
	exportVariable('ACTIONS_SHELL_CLI', cliPath);
	setOutput('bin-dir', binDir);
	setOutput('cli', cliPath);
	setOutput('version', VERSION);
	info(`actions-shell ${VERSION} installed to ${binDir}`);
	debug(`shims: ${written.join(', ')}`);

	if (getBooleanInput('doctor')) {
		const runtimes = getInput('runtimes').split(/[\s,]+/).filter(Boolean);
		const targets = runtimes.length ? runtimes : [undefined];
		let failed = false;
		for (const rt of targets) {
			const args = [cliPath, 'doctor', ...(rt ? [rt] : [])];
			const res = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
			if (res.status !== 0) failed = true;
		}
		if (failed && runtimes.length) setFailed('one or more requested runtimes are not ready');
	}
}

try {
	run();
} catch (e) {
	setFailed(e instanceof Error ? e.message : String(e));
}
