import type { RuntimeAdapter } from '#types';

export const python: RuntimeAdapter = {
	name: 'python',
	title: 'Python',
	command: 'python3',
	fallbackCommands: ['python'],
	input: { kind: 'file' },
	args: (path, userArgs) => [...userArgs, path],
	install: 'actions/setup-python',
	notes: 'Uses Python on PATH. Select an installed minor version with python3.11 or py3.11.',
};

export function versionedPython(id: string): RuntimeAdapter | undefined {
	const version = /^(?:python|py)(3\.(?:0|[1-9]\d*))$/.exec(id)?.[1];
	if (!version) return undefined;
	return {
		...python,
		name: `python${version}`,
		title: `Python ${version}`,
		command: `python${version}`,
		fallbackCommands: ['python3', 'python'],
		requiredVersion: new RegExp(`^Python ${version.replace('.', '\\.')}\\.`),
		install: `actions/setup-python with python-version: '${version}'`,
		notes: `Requires Python ${version} on PATH as python${version}, python3 or python. Other versions are skipped.`,
	};
}
