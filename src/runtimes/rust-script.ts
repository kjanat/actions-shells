import type { RuntimeAdapter } from '#types';

export const rustScript: RuntimeAdapter = {
	name: 'rust-script',
	title: 'Rust (rust-script)',
	command: 'rust-script',
	input: { kind: 'file' },
	args: (path, userArgs) => [...userArgs, path],
	install: 'dtolnay/rust-toolchain + `cargo install rust-script`',
	notes: 'Bare statements, `fn main()`, and embedded `//! ```cargo` manifests are all accepted. '
		+ 'Compiled artifacts are cached by rust-script.',
};
