#!/usr/bin/env node
import { describeInput, doctor, formatReport } from '#doctor';
import { aliasesFor, allRuntimes, envKey, resolveRuntime } from '#registry';
import { runScript, RuntimeNotFoundError } from '#run';
import { VERSION } from '#version';
import { dim, underline } from 'ansispeck/safe';

const USAGE = `actions-shell ${VERSION} — more shells for ${underline`${dim`run:`}`}

Usage (GitHub Actions):
  shell: actions-shell <runtime> [runtime-args...] {0}

Usage (anywhere):
  actions-shell <runtime> [runtime-args...] <file>
  actions-shell list
  actions-shell describe <runtime>
  actions-shell doctor [runtime]
  actions-shell --version | --help

Environment:
  ACTIONS_SHELL_<RUNTIME>_COMMAND   override the executable (e.g. ACTIONS_SHELL_CARGO_SCRIPT_COMMAND)
  ACTIONS_SHELL_<RUNTIME>_ARGS      extra arguments inserted before the adapter's own
  ACTIONS_SHELL_DEBUG=1             print the resolved command line to stderr
  ACTIONS_SHELL_KEEP=1              keep the normalised temp file after the run
`;

const out = (text: string) => process.stdout.write(`${text}\n`);
const err = (text: string) => process.stderr.write(`${text}\n`);

function listText(): string {
	const rows = allRuntimes().map((a) => {
		const al = aliasesFor(a.name);
		return [a.name, a.title, a.command, al.length ? al.join(', ') : ''];
	});
	const widths = [0, 1, 2].map((i) => Math.max(...rows.map((r) => r[i]?.length ?? 0)));
	return rows
		.map(
			(r) =>
				`${(r[0] ?? '').padEnd(widths[0] ?? 0)}  ${(r[1] ?? '').padEnd(widths[1] ?? 0)}  ${
					(r[2] ?? '').padEnd(widths[2] ?? 0)
				}${r[3] ? `  aliases: ${r[3]}` : ''}`,
		)
		.join('\n');
}

const unknownRuntime = (id: string): number => {
	err(`actions-shell: unknown runtime "${id}"\n\nAvailable runtimes:\n${listText()}`);
	return 2;
};

async function main(argv: string[]): Promise<number> {
	const [first, ...rest] = argv;

	if (!first || first === '--help' || first === '-h' || first === 'help') {
		out(USAGE.trimEnd());
		return first ? 0 : 2;
	}
	if (first === '--version' || first === '-V' || first === 'version') {
		out(VERSION);
		return 0;
	}
	if (first === 'list') {
		out(listText());
		return 0;
	}
	if (first === 'describe') {
		const id = rest[0];
		if (!id) {
			err('usage: actions-shell describe <runtime>');
			return 2;
		}
		const adapter = resolveRuntime(id);
		if (!adapter) return unknownRuntime(id);
		const { input, extension } = describeInput(adapter);
		const key = envKey(adapter.name);
		const example = adapter.args('{0}', []).join(' ');
		const lines = [
			`runtime:            ${adapter.name}`,
			`title:              ${adapter.title}`,
			`aliases:            ${aliasesFor(adapter.name).join(', ') || 'none'}`,
			`command:            ${adapter.command}${
				adapter.fallbackCommands?.length ? ` (fallbacks: ${adapter.fallbackCommands.join(', ')})` : ''
			}`,
			`input:              ${input}`,
			`extension required: ${extension}`,
			`invocation:         ${adapter.command} ${example}`,
			`workflow:           shell: actions-shell ${adapter.name} {0}`,
			`env overrides:      ACTIONS_SHELL_${key}_COMMAND, ACTIONS_SHELL_${key}_ARGS`,
		];
		if (adapter.install) lines.push(`install:            ${adapter.install}`);
		if (adapter.notes) lines.push(`notes:              ${adapter.notes}`);
		out(lines.join('\n'));
		return 0;
	}
	if (first === 'doctor') {
		const id = rest[0];
		if (id) {
			const adapter = resolveRuntime(id);
			if (!adapter) return unknownRuntime(id);
			const report = doctor(adapter);
			out(formatReport(report));
			if (report.status !== 'ready' && process.env.GITHUB_ACTIONS === 'true') {
				out(`::warning title=actions-shell::runtime ${adapter.name} is ${report.status} (${report.command})`);
			}
			return report.status === 'ready' ? 0 : 1;
		}
		const reports = allRuntimes().map((a) => doctor(a));
		out(reports.map(formatReport).join('\n\n'));
		const ready = reports.filter((r) => r.status === 'ready').length;
		out(`\n${ready}/${reports.length} runtimes ready`);
		return 0;
	}

	// Script execution: actions-shell <runtime> [runtime-args...] [--] <file>
	const adapter = resolveRuntime(first);
	if (!adapter) return unknownRuntime(first);

	const args = [...rest];
	const dashdash = args.indexOf('--');
	const userArgs = dashdash >= 0 ? args.slice(0, dashdash) : args.slice(0, -1);
	const scriptPath = dashdash >= 0 ? args[dashdash + 1] : args[args.length - 1];
	if (!scriptPath) {
		err(`usage: actions-shell ${adapter.name} [runtime-args...] <file>`);
		return 2;
	}

	try {
		return await runScript({ adapter, scriptPath, userArgs });
	} catch (e) {
		if (e instanceof RuntimeNotFoundError) {
			err(e.message);
			return 127;
		}
		err(`actions-shell: ${e instanceof Error ? e.message : String(e)}`);
		return 1;
	}
}

main(process.argv.slice(2)).then(
	(code) => {
		process.exitCode = code;
	},
	(e) => {
		err(`actions-shell: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
		process.exitCode = 1;
	},
);
