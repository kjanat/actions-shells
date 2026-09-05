# actions-shells

**More shells for `run:`.**

GitHub Actions lets a step pick its interpreter with `shell:`. Out of the box that means bash, pwsh, python, and a few others. This action adds the rest: Rust, Go, Deno, Bun, Kotlin, Swift, C#, F#, Ruby, Perl, PHP, Lua, Julia, R.

````yaml
jobs:
  test:
    runs-on: ubuntu-latest
    defaults:
      run:
        shell: actions-shell rust-script {0}

    steps:
      - uses: dtolnay/rust-toolchain@stable
      - uses: taiki-e/install-action@v2
        with: { tool: rust-script }

      - uses: kjanat/actions-shells@v0     # Use latest major floating release
      - uses: kjanat/actions-shells@v0.1   # Use latest minor floating release
      - uses: kjanat/actions-shells@v0.1.0 # Patch releases are "immutable", so this should be safe
      - uses: kjanat/actions-shells@697bb547ef1ce427e202b4cbcdb19886aa587da7 # or pin to the commit

      - run: println!("hello, Actions");

      - run: |
          //! ```cargo
          //! [dependencies]
          //! serde_json = "1"
          //! ```
          let value: serde_json::Value = serde_json::from_str(r#"{"hello":"world"}"#).unwrap();
          println!("{value}");

      - run: |
          use std::process::Command;

          let status = Command::new("cargo").arg("test").status().unwrap();
          std::process::exit(status.code().unwrap_or(1));
````

## How it works

GitHub writes the `run:` body to an extensionless temp file and substitutes its path for `{0}`. `actions-shell <runtime> {0}` turns that file into valid input for the runtime and execs it:

```text
GitHub extensionless temp file
        ↓  (hardlink/copy to a sibling with the right extension, if the runtime needs one)
runtime  ←  correct flags, exit code and signals propagated, temp file cleaned up
```

That is the whole job. `actions-shells` does **not**:

- install runtimes — pair it with the official setup action for each language (table below);
- rewrite your source — if a runtime needs `fn main()`, you write `fn main()`;
- need any `GITHUB_*` variables — `actions-shell go ./script` works on a laptop too.

## Runtimes

| `shell:`                         | Runs                                 | Pair with                                                                 | Notes                                                                                                                      |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `actions-shell rust-script {0}`  | [rust-script]                        | `dtolnay/rust-toolchain` + `taiki-e/install-action` (`tool: rust-script`) | Bare statements, ``fn main()``, embedded ``//! \``\`\`cargo` manifests. Compiled artifacts are cached.                     |
| `actions-shell cargo-script {0}` | `cargo +nightly -Zscript`            | `dtolnay/rust-toolchain@nightly`                                          | Nightly-only as of Cargo 1.98. Needs `fn main()`.                                                                          |
| `actions-shell rust {0}`         | alias for `rust-script`              |                                                                           | Convenience alias. May move to `cargo-script` in a future **major** version; pin `rust-script` for strict reproducibility. |
| `actions-shell go {0}`           | `go build` + exec                    | `actions/setup-go`                                                        | `package main` + `func main()`. Built then run directly so `os.Exit(n)` propagates (`go run` would always exit 1).         |
| `actions-shell deno {0}`         | `deno run --allow-all --ext=ts`      | `denoland/setup-deno`                                                     | TypeScript. Put narrower `--allow-*` flags before `{0}` to override.                                                       |
| `actions-shell bun {0}`          | `bun run`                            | `oven-sh/setup-bun`                                                       | TypeScript; copied to a sibling `.ts`.                                                                                     |
| `actions-shell node {0}`         | `node`                               | `actions/setup-node`                                                      | CommonJS JavaScript.                                                                                                       |
| `actions-shell kotlin {0}`       | `kotlinc -script` (`.main.kts`)      | `fwilhe2/setup-kotlin`                                                    | `@file:DependsOn` works.                                                                                                   |
| `actions-shell swift {0}`        | `swift`                              | `swift-actions/setup-swift`                                               | Top-level code. Not on Windows runners.                                                                                    |
| `actions-shell csharp {0}`       | `dotnet run file.cs`                 | `actions/setup-dotnet` (10.x+)                                            | Top-level statements, `#:package` directives.                                                                              |
| `actions-shell fsharp {0}`       | `dotnet fsi`                         | `actions/setup-dotnet`                                                    |                                                                                                                            |
| `actions-shell python {0}`       | `python3` / `python`                 | `actions/setup-python`                                                    | GitHub has a built-in `python` shell; this exists for uniformity.                                                          |
| `actions-shell ruby {0}`         | `ruby`                               | `ruby/setup-ruby`                                                         |                                                                                                                            |
| `actions-shell perl {0}`         | `perl`                               | `shogo82148/actions-setup-perl`                                           |                                                                                                                            |
| `actions-shell php {0}`          | `php`                                | `shivammathur/setup-php`                                                  | Start with `<?php`.                                                                                                        |
| `actions-shell lua {0}`          | `lua` (`lua5.4`, `luajit` fallbacks) | `leafo/gh-actions-lua`                                                    |                                                                                                                            |
| `actions-shell julia {0}`        | `julia`                              | `julia-actions/setup-julia`                                               |                                                                                                                            |
| `actions-shell r {0}`            | `Rscript`                            | `r-lib/actions/setup-r`                                                   |                                                                                                                            |

Aliases: `rust`→rust-script, `js`/`javascript`→node, `ts`/`typescript`→deno, `cs`→csharp, `fs`→fsharp, `kt`/`kts`→kotlin, `rb`→ruby, `pl`→perl, `jl`→julia, `py`→python, `rscript`→r.

`actions-shell list` prints this table from the binary itself.

[rust-script]: https://rust-script.org

## Usage

Per step:

```yaml
- uses: kjanat/actions-shells@v1

- shell: actions-shell go {0}
  run: |
    package main
    import "fmt"
    func main() { fmt.Println("hello from Go") }
```

Job-wide:

```yaml
defaults: { run: { shell: "actions-shell deno {0}" } }
steps:
  - uses: denoland/setup-deno@v2
  - uses: kjanat/actions-shells@v1 # a `uses:` step, so the default shell does not apply to it
  - run: console.log(Deno.version.deno);
```

Runtime flags go between the runtime name and `{0}`, exactly as GitHub's `command [options] {0} [more_options]` contract allows:

```yaml
- shell: actions-shell deno --no-check --allow-net {0}
- shell: actions-shell go -tags=integration {0}
```

### Action inputs and outputs

| Input      | Default | Meaning                                                                                     |
| ---------- | ------- | ------------------------------------------------------------------------------------------- |
| `doctor`   | `false` | Print `actions-shell doctor` after install.                                                 |
| `runtimes` | `""`    | With `doctor: true`, fail the step unless these runtimes are ready, e.g. `rust-script, go`. |

| Output    | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `bin-dir` | Directory holding the `actions-shell` shim (already on `PATH`). |
| `cli`     | Absolute path to the bundled `cli.mjs`.                         |
| `version` | Installed version.                                              |

### Introspection

```console
$ actions-shell doctor rust-script
runtime:            rust-script
command:            /home/runner/.cargo/bin/rust-script
input:              file
extension required: none
version:            rust-script 0.36.0
status:             ready

$ actions-shell doctor go
runtime:            go
command:            /opt/hostedtoolcache/go/1.26.0/x64/bin/go
input:              temporary .go file
extension required: .go
version:            go version go1.26.0 linux/amd64
status:             ready

$ actions-shell describe cargo-script
$ actions-shell list
$ actions-shell doctor          # every runtime, exit 0; prints "n/17 runtimes ready"
```

`doctor <runtime>` exits 1 when the runtime is missing and emits a `::warning::` annotation on GitHub, so a failing job says *why* instead of "Process completed with exit code 1".

### Environment variables

| Variable                          | Effect                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ACTIONS_SHELL_<RUNTIME>_COMMAND` | Use this executable instead of the default, e.g. `ACTIONS_SHELL_CARGO_SCRIPT_COMMAND=/opt/cargo`. |
| `ACTIONS_SHELL_<RUNTIME>_ARGS`    | Extra arguments inserted before the adapter's own (quotes honoured).                              |
| `ACTIONS_SHELL_DEBUG=1`           | Print the resolved command line to stderr.                                                        |
| `ACTIONS_SHELL_KEEP=1`            | Keep the normalised sibling file (and Go binary) after the run.                                   |

`<RUNTIME>` is the runtime id upper-cased with `-` → `_`.

### Exit codes and diagnostics

- The step's exit code is the script's exit code. Signals become `128 + signal`.
- Unknown runtime: exit 2 with a did-you-mean suggestion. Runtime not on `PATH`: exit 127 with an install hint.
- For runtimes that need an extension, the sibling file is created **next to** GitHub's temp file, so compiler output reads `/home/runner/work/_temp/abc123.rs:3:5` — same directory, same name, just an extension. It is removed after the run.

### Outside GitHub

```console
actions-shell rust-script hello
actions-shell go ./script
node cli.mjs deno ./script      # without the shim
```

Nothing depends on `GITHUB_*` variables, which is also how the test-suite works.

## Windows

Supported. The setup action writes both `actions-shell` (sh) and `actions-shell.cmd`, using the runner's own Node, and adds their directory to `PATH`. `actions-shells` works as well, so the repository name and the executable name are interchangeable. Paths with spaces are handled; nothing is passed through `cmd.exe` quoting. Swift and Lua have no Windows setup action in CI, so they are untested there.

## Versioning

- `vX.Y.Z` — immutable release tags. Each is an orphan commit containing exactly `README.md`, `LICENSE`, `action.yml`, `cli.mjs`, `setup.mjs` (no source, no `node_modules`, fast to fetch).
- `vX.Y`, `vX` — floating tags moved to the newest matching release.
- `master` — source only. **Not usable as `uses:`** (there is nothing built there).
- Every release ships `cli.mjs`, `setup.mjs` and `action.yml` with [build provenance attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) and a `SHA256SUMS` file:

  ```console
  gh attestation verify cli.mjs --repo kjanat/actions-shells
  ```

## Why not…

- **…teach this action to install Rust/Deno/Go?** The official setup actions already handle versions, caches, architectures, mirrors and auth. One job per tool.
- **…wrap scripts in `main()` for the user?** Then the language in `run:` is no longer the language, and diagnostics stop matching what you wrote.
- **…one executable per language?** `actions-shell <runtime> {0}` is a single install, a single code path for exit codes, signals, Windows paths and cleanup, and a single `doctor`.

Related: [scriptisto](https://github.com/igor-petruk/scriptisto) makes compiled languages usable as shebang scripts in general; `actions-shells` only makes language runtimes satisfy GitHub's `shell:` protocol.

## License

[MIT](LICENSE)

 <!-- markdownlint-disable-file line-length -->
