import type { InputSpec } from '#types';
import { copyFileSync, linkSync, rmSync } from 'node:fs';

export interface PreparedSource {
	/** Path to hand to the runtime, or `"-"` when streaming via stdin. */
	path: string;
	/** Original file path as given by GitHub. */
	original: string;
	/** When `true`, `path` is a file we created next to the original. */
	created: boolean;
	/** Stream the original to stdin instead of passing a path. */
	useStdin: boolean;
}

/**
 * GitHub writes `run:` bodies to an extensionless temp file. Some runtimes need a
 * specific extension; we create `<original><ext>` right next to it so compiler
 * diagnostics stay recognisable (`.../abc123.rs:3:5`) and the file lives in the
 * same writable, per-job temp directory.
 */
export function prepareSource(original: string, input: InputSpec): PreparedSource {
	if (input.kind === 'stdin') return { path: '-', original, created: false, useStdin: true };
	if (input.extension === undefined || original.endsWith(input.extension)) {
		return { path: original, original, created: false, useStdin: false };
	}
	const target = original + input.extension;
	try {
		linkSync(original, target);
	} catch {
		copyFileSync(original, target);
	}
	return { path: target, original, created: true, useStdin: false };
}

export function cleanupSource(
	prepared: PreparedSource,
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (!prepared.created) return;
	if (env.ACTIONS_SHELL_KEEP === '1' || env.ACTIONS_SHELL_KEEP === 'true') return;
	try {
		rmSync(prepared.path, { force: true });
	} catch {
		/* best effort */
	}
}
