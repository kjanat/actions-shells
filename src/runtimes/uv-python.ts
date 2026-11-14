import type { RuntimeAdapter } from '#types';

export const uvPython: RuntimeAdapter = {
	name: 'uv-python',
	title: 'Python (uv)',
	command: 'uv',
	input: { kind: 'file', extension: '.py' },
	args: (path, userArgs) => ['run', ...userArgs, path],
	install: 'astral-sh/setup-uv or mise (uv)',
	notes:
		'Runs Python through uv, including inline script dependencies. Pass --python 3.11 or use uv-python3.11 to select a version; --no-project skips project discovery. Doctor checks uv itself; uv resolves Python when the script runs.',
};

export function versionedUvPython(id: string): RuntimeAdapter | undefined {
	const version = /^uv-python(3\.(?:0|[1-9]\d*))$/.exec(id)?.[1];
	if (!version) return undefined;
	return {
		...uvPython,
		name: `uv-python${version}`,
		title: `Python ${version} (uv)`,
		args: (path, userArgs) => ['run', '--python', version, ...userArgs, path],
		notes:
			`Runs Python ${version} through uv, downloading it if necessary. Supports inline script dependencies and uv run flags. Doctor checks uv itself.`,
	};
}
