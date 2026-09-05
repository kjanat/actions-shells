import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { EOL } from 'node:os';
import { delimiter } from 'node:path';
import { env } from 'node:process';

const escapeData = (value: string): string =>
	value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');

const escapeProperty = (value: string): string => escapeData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');

const command = (name: string, value: string, properties: Record<string, string> = {}): void => {
	const serialized = Object.entries(properties)
		.map(([key, property]) => `${key}=${escapeProperty(property)}`)
		.join(',');
	process.stdout.write(`::${name}${serialized === '' ? '' : ` ${serialized}`}::${escapeData(value)}${EOL}`);
};

const fileCommand = (variable: string, name: string, value: string): boolean => {
	const file = env[variable];
	if (file === undefined || file === '') return false;
	const marker = `actions-shell_${randomUUID()}`;
	if (value.includes(marker)) throw new Error(`Unable to write ${name}: value contains generated delimiter`);
	appendFileSync(file, `${name}<<${marker}${EOL}${value}${EOL}${marker}${EOL}`, { encoding: 'utf8' });
	return true;
};

export const getInput = (name: string): string =>
	(env[`INPUT_${name.replaceAll(' ', '_').toUpperCase()}`] ?? '').trim();

export const getBooleanInput = (name: string): boolean => {
	const value = getInput(name);
	if (['true', 'True', 'TRUE'].includes(value)) return true;
	if (['false', 'False', 'FALSE', ''].includes(value)) return false;
	throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${name}`);
};

export const info = (message: string): void => void process.stdout.write(`${message}${EOL}`);

export const debug = (message: string): void => command('debug', message);

export const error = (message: string): void => command('error', message);

export const setFailed = (message: string): void => {
	process.exitCode = 1;
	error(message);
};

export const setOutput = (name: string, value: string): void => {
	if (!fileCommand('GITHUB_OUTPUT', name, value)) command('set-output', value, { name });
};

export const exportVariable = (name: string, value: string): void => {
	env[name] = value;
	if (!fileCommand('GITHUB_ENV', name, value)) command('set-env', value, { name });
};

export const addPath = (path: string): void => {
	env['PATH'] = `${path}${delimiter}${env['PATH'] ?? ''}`;
	const file = env['GITHUB_PATH'];
	if (file !== undefined && file !== '') appendFileSync(file, `${path}${EOL}`, { encoding: 'utf8' });
	else command('add-path', path);
};
