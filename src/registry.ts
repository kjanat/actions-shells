import { adapters, aliases } from '#runtimes';
import type { RuntimeAdapter } from '#types';

const byName = new Map<string, RuntimeAdapter>(adapters.map((a) => [a.name, a]));

export const runtimeNames = (): string[] => adapters.map((a) => a.name);
export const aliasesFor = (name: string): string[] =>
	Object.entries(aliases).filter(([, target]) => target === name).map(([alias]) => alias).sort();
export const resolveRuntime = (id: string): RuntimeAdapter | undefined => {
	const key = id.toLowerCase();
	return byName.get(key) ?? byName.get(aliases[key] ?? '');
};
export const allRuntimes = (): readonly RuntimeAdapter[] => adapters;

/** `rust-script` → `RUST_SCRIPT`, used for ACTIONS_SHELL_<ID>_COMMAND / _ARGS. */
export const envKey = (name: string): string => name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

export interface ResolvedInvocation {
	command: string;
	extraArgs: string[];
}

/** Apply environment overrides for a runtime. */
export function applyEnvOverrides(
	adapter: RuntimeAdapter,
	env: NodeJS.ProcessEnv = process.env,
): ResolvedInvocation {
	const key = envKey(adapter.name);
	const command = env[`ACTIONS_SHELL_${key}_COMMAND`]?.trim() || adapter.command;
	const raw = env[`ACTIONS_SHELL_${key}_ARGS`]?.trim();
	const extraArgs = raw ? splitArgs(raw) : [];
	return { command, extraArgs };
}

/** Minimal shell-ish splitter: whitespace-separated, with single/double quotes. */
export function splitArgs(input: string): string[] {
	const out: string[] = [];
	let cur = '';
	let quote: '"' | "'" | null = null;
	let has = false;
	for (const ch of input) {
		if (quote) {
			if (ch === quote) quote = null;
			else cur += ch;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
			has = true;
		} else if (/\s/.test(ch)) {
			if (has || cur) out.push(cur);
			cur = '';
			has = false;
		} else {
			cur += ch;
		}
	}
	if (has || cur) out.push(cur);
	return out;
}
