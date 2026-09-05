#!/usr/bin/env node
import { writeShims } from '#shim';
import { VERSION } from '#version';
import * as core from '@actions/core';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function run(): void {
	// Both files sit side by side in the release tag root (and in the repo root after `pnpm build`).
	const cliPath = path.join(import.meta.dirname, 'cli.mjs');
	if (!existsSync(cliPath)) {
		core.setFailed(
			`cli.mjs not found next to setup.mjs (${cliPath}). Use a release tag such as kjanat/actions-shells@v1 — master carries no built files.`,
		);
		return;
	}

	const root = process.env.RUNNER_TEMP || os.tmpdir();
	const binDir = path.join(root, 'actions-shell', 'bin');
	const written = writeShims({ binDir, nodePath: process.execPath, cliPath });

	core.addPath(binDir);
	core.exportVariable('ACTIONS_SHELL_CLI', cliPath);
	core.setOutput('bin-dir', binDir);
	core.setOutput('cli', cliPath);
	core.setOutput('version', VERSION);
	core.info(`actions-shell ${VERSION} installed to ${binDir}`);
	core.debug(`shims: ${written.join(', ')}`);

	if (core.getBooleanInput('doctor')) {
		const runtimes = core
			.getInput('runtimes')
			.split(/[\s,]+/)
			.filter(Boolean);
		const targets = runtimes.length ? runtimes : [undefined];
		let failed = false;
		for (const rt of targets) {
			const args = [cliPath, 'doctor', ...(rt ? [rt] : [])];
			const res = spawnSync(process.execPath, args, { stdio: 'inherit', windowsHide: true });
			if (res.status !== 0) failed = true;
		}
		if (failed && runtimes.length) core.setFailed('one or more requested runtimes are not ready');
	}
}

try {
	run();
} catch (e) {
	core.setFailed(e instanceof Error ? e.message : String(e));
}
