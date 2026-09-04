/**
 * How a runtime wants to receive the script GitHub hands us as `{0}`.
 *
 * - `file`: the extensionless temp file is passed through as-is.
 * - `file` + `extension`: a sibling file with the given extension is created
 *   (hardlink, falling back to copy) and passed instead.
 * - `stdin`: the file is streamed to the runtime's stdin.
 */
export type InputSpec = { kind: "file"; extension?: string } | { kind: "stdin" };

export interface RuntimeAdapter {
  /** Canonical id used on the command line: `actions-shell <name> {0}`. */
  readonly name: string;
  /** Human-readable language / tool name for `list` and `describe`. */
  readonly title: string;
  /** Executable looked up on PATH. Overridable via ACTIONS_SHELL_<NAME>_COMMAND. */
  readonly command: string;
  /** Alternative executables tried, in order, when `command` is not on PATH. */
  readonly fallbackCommands?: readonly string[];
  readonly input: InputSpec;
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
  /** Arguments used by `doctor` to probe the version. Defaults to `["--version"]`. */
  readonly versionArgs?: readonly string[];
  /** Suggested way to get the runtime onto a runner, shown in errors and `describe`. */
  readonly install?: string;
  /** Free-form caveats shown by `describe`. */
  readonly notes?: string;
}
