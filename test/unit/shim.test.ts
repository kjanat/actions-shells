import { shimSources, writeShims } from '#shim';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('shims', () => {
	it('quote paths with spaces and apostrophes', () => {
		const { posix, cmd } = shimSources({ binDir: '/b', nodePath: '/opt/host ed/node', cliPath: "/tmp/it's/cli.mjs" });
		expect(posix).toContain(`exec '/opt/host ed/node' '/tmp/it'\\''s/cli.mjs' "$@"`);
		expect(posix.startsWith('#!/bin/sh\n')).toBe(true);
		expect(cmd).toContain(`"/opt/host ed/node" "/tmp/it's/cli.mjs" %*`);
		expect(cmd).toContain('\r\n');
	});

	it('write all shim files, executable on posix', () => {
		const dir = mkdtempSync(path.join(os.tmpdir(), 'actions-shell-shim-'));
		try {
			const written = writeShims({ binDir: path.join(dir, 'bin'), nodePath: process.execPath, cliPath: '/c.js' });
			expect(written.map((w) => path.basename(w)).sort())
				.toEqual(['actions-shell', 'actions-shell.cmd', 'actions-shells', 'actions-shells.cmd']);
			const posix = written.find((w) => w.endsWith('actions-shell')) ?? '';
			expect(readFileSync(posix, 'utf8')).toContain(process.execPath);
			if (process.platform !== 'win32') expect(statSync(posix).mode & 0o111).not.toBe(0);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
