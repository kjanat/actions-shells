# Runtime guides

Choose a runtime for a GitHub Actions `run:` step. Each guide includes an example, the required tools, accepted arguments, and runtime-specific behavior.

The examples assume you have installed the language tools and added `actions-shell` to the runner. See [runtime setup](../README.md#runtime-setup) for the setup steps. The action's `doctor` input checks whether tools are ready. It does not install them.

| Guide                                   | Example `shell:` value                                       | Other names                  |
| --------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| [Bash](bash.md)                         | `actions-shell bash {0}`                                     |                              |
| [PowerShell](pwsh.md)                   | `actions-shell pwsh {0}`                                     |                              |
| [Node.js](node.md)                      | `actions-shell node {0}`                                     | `js`, `javascript`           |
| [Deno](deno.md)                         | `actions-shell deno {0}`                                     | `ts`, `typescript`           |
| [Bun](bun.md)                           | `actions-shell bun {0}`                                      |                              |
| [Rust with rust-script](rust-script.md) | `actions-shell rust {0}`                                     | `rust-script`                |
| [Rust with Cross](cross.md)             | `actions-shell cross --target aarch64-unknown-linux-gnu {0}` |                              |
| [Cargo scripts](cargo-script.md)        | `actions-shell cargo-script {0}`                             |                              |
| [Go](go.md)                             | `actions-shell go {0}`                                       |                              |
| [Kotlin](kotlin.md)                     | `actions-shell kotlin {0}`                                   | `kt`, `kts`                  |
| [Swift](swift.md)                       | `actions-shell swift {0}`                                    |                              |
| [C#](csharp.md)                         | `actions-shell csharp {0}`                                   | `cs`                         |
| [F#](fsharp.md)                         | `actions-shell fsharp {0}`                                   | `fs`                         |
| [Python](python.md)                     | `actions-shell py3.11 {0}`                                   | `python3.11`, `python`, `py` |
| [Python through uv](uv-python.md)       | `actions-shell uv-python3.11 {0}`                            | `uv-python`, `uv`            |
| [Ruby](ruby.md)                         | `actions-shell ruby {0}`                                     | `rb`                         |
| [Perl](perl.md)                         | `actions-shell perl {0}`                                     | `pl`                         |
| [PHP](php.md)                           | `actions-shell php {0}`                                      |                              |
| [Lua](lua.md)                           | `actions-shell lua {0}`                                      |                              |
| [Julia](julia.md)                       | `actions-shell julia {0}`                                    | `jl`                         |
| [R](r.md)                               | `actions-shell r {0}`                                        | `rscript`                    |

The Python guides cover version selectors such as `py3.11` and `uv-python3.11`. Plain `python` and `py` use an installed interpreter on `PATH`. Plain `uv-python` and `uv` let uv select Python.

## Arguments and script files

Put runtime arguments before `{0}`. Keep the script path last:

```yaml
- shell: actions-shell bash +u {0}
  run: printf '%s\n' "${OPTIONAL_VALUE}"
```

GitHub substitutes the script path for `{0}`. You can also pass a local file:

```sh
actions-shell bash ./check.sh
```

Some runtimes need a filename extension. The adapter creates a sibling file with that extension, using a hard link or a copy, and removes it after execution. `ACTIONS_SHELL_KEEP=1` retains files that the adapter creates. Cross prepares a temporary Cargo package, as its guide explains.

## Inspect an invocation

```sh
actions-shell list
actions-shell describe uv-python3.11
actions-shell doctor py3.11
```

`list` shows the runtime families and their aliases. `describe` shows the command, script handling, and environment overrides for a runtime. `doctor` checks the executable and its declared prerequisites. The guides describe checks that happen only when a script runs, such as uv's Python selection and Cross's target execution.

Set `ACTIONS_SHELL_DEBUG=1` to print the commands that the adapter runs. To select a different executable or supply default arguments, use the `ACTIONS_SHELL_<ID>_COMMAND` and `ACTIONS_SHELL_<ID>_ARGS` variables shown by `describe`.
