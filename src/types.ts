/**
 * How a runtime wants to receive the script GitHub hands us as `{0}`.
 *
 * - `file`: the extensionless temp file is passed through as-is.
 * - `file` + `extension`: a sibling file with the given extension is created
 *   (hardlink, falling back to copy) and passed instead.
 * - `stdin`: the file is streamed to the runtime's stdin.
 */
export type InputSpec = { kind: 'file'; extension?: string; description?: string } | { kind: 'stdin' };

export interface RuntimeTool {
	/** Tool id used in diagnostics and executable overrides. */
	readonly name: string;
	/** Human-readable language / tool name for `list` and `describe`. */
	readonly title: string;
	/** Executable looked up on PATH. Overridable via ACTIONS_SHELL_<NAME>_COMMAND. */
	readonly command: string;
	/** Alternative executables tried, in order, when `command` is not on PATH. */
	readonly fallbackCommands?: readonly string[];
	/** Arguments for doctor's readiness probe. Defaults to `["--version"]`. */
	readonly versionArgs?: readonly string[];
	/** Installation hint for diagnostics and describe output. */
	readonly install?: string;
}

export interface Stage {
	executable: string;
	args: string[];
	stdout?: 'ignore';
}

export interface RuntimePreparation {
	path: string;
	stages: readonly Stage[];
	env: NodeJS.ProcessEnv;
	/** Stop external resources as well as the command's process group on cancellation. */
	onSignal?(signal: NodeJS.Signals): void;
	cleanup(): void;
}

export interface PreparationContext {
	env: NodeJS.ProcessEnv;
	resolve(tool: RuntimeTool): { executable: string; extraArgs: string[] };
}

export interface RuntimeAdapter extends RuntimeTool {
	readonly input: InputSpec;
	readonly platforms?: readonly NodeJS.Platform[];
	readonly exampleArgs?: readonly string[];
	/** Tools checked by doctor and resolved before preparing input. */
	requirements?(env: NodeJS.ProcessEnv): readonly RuntimeTool[];
	/** Prepare input and commands that must succeed before the runtime starts. */
	prepare?(path: string, userArgs: readonly string[], context: PreparationContext): RuntimePreparation;
	/**
	 * Build the argv (excluding argv[0]).
	 * `path` is the prepared script path, or `"-"` for stdin runtimes.
	 * `userArgs` are extra arguments the workflow placed before `{0}`.
	 */
	args(path: string, userArgs: readonly string[]): string[];
	/**
	 * Optional compile stage, for runtimes whose "run" front-end mangles exit codes
	 * (e.g. `go run` always exits 1 and prints "exit status N"). When present, the
	 * adapter's `command` is invoked with `compile(...).args` first; if it succeeds,
	 * `compile(...).output` is executed directly with `userArgs` ignored (they were
	 * consumed by the compile step).
	 */
	compile?(path: string, userArgs: readonly string[]): { args: string[]; output: string };
	/** Free-form caveats shown by `describe`. */
	readonly notes?: string;
}
