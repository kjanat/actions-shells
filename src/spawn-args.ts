import path from 'node:path';

export interface SpawnPlan {
	file: string;
	args: string[];
	/** Pass through to child_process options. */
	windowsVerbatimArguments: boolean;
}

/**
 * Node refuses to spawn `.cmd`/`.bat` files directly on Windows (CVE-2024-27980,
 * `spawn EINVAL`). Many runtimes ship as batch launchers there (kotlinc.bat,
 * gradlew.bat, …). Run those through `cmd.exe /d /s /c "<quoted command line>"`
 * with verbatim arguments so we control the quoting instead of `shell: true`.
 */
export function planSpawn(file: string, args: readonly string[]): SpawnPlan {
	if (process.platform !== 'win32') return { file, args: [...args], windowsVerbatimArguments: false };

	const ext = path.extname(file).toLowerCase();
	if (ext !== '.cmd' && ext !== '.bat') return { file, args: [...args], windowsVerbatimArguments: false };

	const line = [file, ...args].map(quoteWindowsArg).join(' ');
	return {
		file: process.env.ComSpec || 'cmd.exe',
		args: ['/d', '/s', '/c', `"${line}"`],
		windowsVerbatimArguments: true,
	};
}

/** Quote one argument the way CommandLineToArgvW expects. */
export function quoteWindowsArg(arg: string): string {
	if (arg !== '' && !/[\s"]/.test(arg)) return arg;
	let out = '"';
	let backslashes = 0;
	for (const ch of arg) {
		if (ch === '\\') {
			backslashes++;
			continue;
		}
		if (ch === '"') out += `${'\\'.repeat(backslashes * 2 + 1)}"`;
		else out += `${'\\'.repeat(backslashes)}${ch}`;
		backslashes = 0;
	}
	out += `${'\\'.repeat(backslashes * 2)}"`;
	return out;
}
