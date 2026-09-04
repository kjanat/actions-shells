import type { RuntimeAdapter } from '#types';

const file = (extension?: string) =>
	extension === undefined ? ({ kind: 'file' } as const) : ({ kind: 'file', extension } as const);

const pass = (path: string, userArgs: readonly string[]) => [...userArgs, path];

export const adapters: readonly RuntimeAdapter[] = [
	// JavaScript family
	{
		name: 'node',
		title: 'Node.js',
		command: 'node',
		input: file(),
		args: pass,
		install: 'actions/setup-node',
		notes: 'Extensionless files are treated as CommonJS. Use `deno` or `bun` for TypeScript.',
	},
	{
		name: 'deno',
		title: 'Deno',
		command: 'deno',
		input: file(),
		args: (path, userArgs) => ['run', '--allow-all', '--ext=ts', ...userArgs, path],
		install: 'denoland/setup-deno',
		notes: 'Runs with --allow-all; pass narrower --allow-* flags before {0} to override.',
	},
	{
		name: 'bun',
		title: 'Bun',
		command: 'bun',
		input: file('.ts'),
		args: (path, userArgs) => ['run', ...userArgs, path],
		install: 'oven-sh/setup-bun',
		notes: "Script is copied to a sibling .ts file so Bun's loader picks TypeScript.",
	},

	// Rust
	{
		name: 'rust-script',
		title: 'Rust (rust-script)',
		command: 'rust-script',
		input: file(),
		args: pass,
		install: 'dtolnay/rust-toolchain + `cargo install rust-script`',
		notes: 'Bare statements, `fn main()`, and embedded `//! ```cargo` manifests are all accepted. '
			+ 'Compiled artifacts are cached by rust-script.',
	},
	{
		name: 'cargo-script',
		title: 'Rust (cargo -Zscript)',
		command: 'cargo',
		input: file('.rs'),
		args: (path, userArgs) => ['+nightly', '-Zscript', ...userArgs, path],
		versionArgs: ['+nightly', '--version'],
		install: 'dtolnay/rust-toolchain@nightly',
		notes: "Cargo's built-in script support; nightly-only as of Cargo 1.98. Requires `fn main()`.",
	},

	// Compiled-ish
	{
		name: 'go',
		title: 'Go',
		command: 'go',
		input: file('.go'),
		args: (path) => [path],
		compile: (path, userArgs) => {
			const output = `${path}${process.platform === 'win32' ? '.exe' : '.bin'}`;
			return { args: ['build', ...userArgs, '-o', output, path], output };
		},
		versionArgs: ['version'],
		install: 'actions/setup-go',
		notes: 'Script must declare `package main` and `func main()`. Compiled with `go build` then '
			+ 'executed directly so `os.Exit(n)` propagates (`go run` would always exit 1).',
	},
	{
		name: 'kotlin',
		title: 'Kotlin script',
		command: 'kotlinc',
		input: file('.main.kts'),
		args: (path, userArgs) => ['-script', ...userArgs, path],
		versionArgs: ['-version'],
		install: 'fwilhe2/setup-kotlin',
		notes: 'Uses `.main.kts`, so `@file:DependsOn` and `@file:Repository` work.',
	},
	{
		name: 'swift',
		title: 'Swift',
		command: 'swift',
		input: file('.swift'),
		args: pass,
		install: 'swift-actions/setup-swift',
		notes: 'Top-level code is allowed; no `main` needed.',
	},
	{
		name: 'csharp',
		title: 'C# (dotnet run file-based app)',
		command: 'dotnet',
		input: file('.cs'),
		args: (path, userArgs) => ['run', ...userArgs, path],
		install: 'actions/setup-dotnet (10.x or newer)',
		notes: 'Top-level statements and `#:package` directives are supported by .NET 10+.',
	},
	{
		name: 'fsharp',
		title: 'F# script (dotnet fsi)',
		command: 'dotnet',
		input: file('.fsx'),
		args: (path, userArgs) => ['fsi', ...userArgs, path],
		install: 'actions/setup-dotnet',
	},

	// Scripting languages
	{
		name: 'python',
		title: 'Python',
		command: 'python3',
		fallbackCommands: ['python'],
		input: file(),
		args: pass,
		install: 'actions/setup-python',
		notes: 'GitHub has a built-in `python` shell; this adapter exists for uniformity.',
	},
	{
		name: 'ruby',
		title: 'Ruby',
		command: 'ruby',
		input: file(),
		args: pass,
		install: 'ruby/setup-ruby',
	},
	{
		name: 'perl',
		title: 'Perl',
		command: 'perl',
		input: file(),
		args: pass,
		install: 'shogo82148/actions-setup-perl',
	},
	{
		name: 'php',
		title: 'PHP',
		command: 'php',
		input: file(),
		args: pass,
		install: 'shivammathur/setup-php',
	},
	{
		name: 'lua',
		title: 'Lua',
		command: 'lua',
		fallbackCommands: ['lua5.4', 'lua5.3', 'luajit'],
		input: file(),
		args: pass,
		versionArgs: ['-v'],
		install: 'leafo/gh-actions-lua',
	},
	{
		name: 'julia',
		title: 'Julia',
		command: 'julia',
		input: file(),
		args: pass,
		install: 'julia-actions/setup-julia',
	},
	{
		name: 'r',
		title: 'R (Rscript)',
		command: 'Rscript',
		input: file(),
		args: pass,
		install: 'r-lib/actions/setup-r',
	},
];

/** Alias → canonical adapter name. */
export const aliases: Readonly<Record<string, string>> = {
	rust: 'rust-script',
	js: 'node',
	javascript: 'node',
	ts: 'deno',
	typescript: 'deno',
	cs: 'csharp',
	fs: 'fsharp',
	kt: 'kotlin',
	kts: 'kotlin',
	rb: 'ruby',
	pl: 'perl',
	jl: 'julia',
	py: 'python',
	rscript: 'r',
};
