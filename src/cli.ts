#!/usr/bin/env node
import { describeInput, doctor, formatReport } from '#doctor';
import pkg from '#pkg' with { type: 'json' };
import { aliasesFor, allRuntimes, envKey, resolveRuntime } from '#registry';
import { runScript, RuntimeNotFoundError } from '#run';
import type { RuntimeAdapter } from '#types';
import { VERSION } from '#version';
import { arg, cli, CLIError, command } from '@kjanat/dreamcli';
import { createNodeAdapter } from '@kjanat/dreamcli/runtime';
import { dim, underline } from 'ansispeck/safe';

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

function runtimeOrThrow(id: string): RuntimeAdapter {
	const adapter = resolveRuntime(id);
	if (!adapter) {
		throw new CLIError(`unknown runtime "${id}"`, {
			code: 'UNKNOWN_RUNTIME',
			exitCode: 2,
			suggest: `run 'actions-shell list' to see the available runtimes`,
		});
	}
	return adapter;
}

const runtimeArg = arg.string().variadic().describe('Runtime arguments, script path last');

const runCommand = (id: string, adapter: RuntimeAdapter) =>
	command(id)
		.description(adapter.title)
		.arg('args', runtimeArg)
		.example((m) => `shell: ${m.name} ${id} {0}`, 'GitHub Actions step')
		.example((m) => `${m.name} ${id} ./script`, 'Anywhere else')
		.action(async ({ args, out }) => {
			const scriptPath = args.args.at(-1);
			if (!scriptPath) {
				throw new CLIError(`usage: actions-shell ${id} [runtime-args...] <file>`, {
					code: 'MISSING_SCRIPT',
					exitCode: 2,
				});
			}
			try {
				out.setExitCode(await runScript({ adapter, scriptPath, userArgs: args.args.slice(0, -1) }));
			} catch (e) {
				if (e instanceof RuntimeNotFoundError) {
					throw new CLIError(e.message, { code: 'RUNTIME_NOT_FOUND', exitCode: 127, cause: e });
				}
				throw e;
			}
		});

const list = command('list')
	.description('List runtimes and aliases')
	.action(({ out }) => out.log(listText()));

const describe = command('describe')
	.description('Show how a runtime is invoked')
	.arg('runtime', arg.string().describe('Runtime id or alias'))
	.action(({ args, out }) => {
		const adapter = runtimeOrThrow(args.runtime);
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
		out.log(lines.join('\n'));
	});

const doctorCommand = command('doctor')
	.description('Report whether runtimes are ready on this machine')
	.arg('runtime', arg.string().optional().describe('Runtime id or alias; all when omitted'))
	.action(({ args, out }) => {
		if (args.runtime) {
			const adapter = runtimeOrThrow(args.runtime);
			const report = doctor(adapter);
			out.log(formatReport(report));
			if (report.status !== 'ready') {
				if (process.env.GITHUB_ACTIONS === 'true') {
					out.log(`::warning title=actions-shell::runtime ${adapter.name} is ${report.status} (${report.command})`);
				}
				out.setExitCode(1);
			}
			return;
		}
		const reports = allRuntimes().map((a) => doctor(a));
		out.log(reports.map(formatReport).join('\n\n'));
		const ready = reports.filter((r) => r.status === 'ready').length;
		out.log(`\n${ready}/${reports.length} runtimes ready`);
	});

let app = cli('actions-shell')
	.manifest(pkg).links().completions({ as: 'flag' })
	.version(VERSION)
	.description(`More shells for ${underline`${dim`run:`}`}`)
	.builtins({ json: 'off', quiet: 'off' })
	.command(list)
	.command(describe)
	.command(doctorCommand);

for (const adapter of allRuntimes()) {
	app = app.command(runCommand(adapter.name, adapter));
	for (const alias of aliasesFor(adapter.name)) app = app.command(runCommand(alias, adapter).hidden());
}

const raw = process.argv.slice(2);
const last = raw.at(-1);
const argv = raw.length >= 2 && last && !last.startsWith('-')
	? [raw[0] as string, '--', ...raw.slice(1).filter((t) => t !== '--')]
	: raw;

await app.run({ adapter: createNodeAdapter({ ...process, argv: [...process.argv.slice(0, 2), ...argv] }) });
