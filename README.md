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

      - uses: kjanat/actions-shells@v0.1.0

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

- install runtimes — use your project's tool manager or one of the setup options below;
- rewrite your source — if a runtime needs `fn main()`, you write `fn main()`;
- need any `GITHUB_*` variables — `actions-shell go ./script` works on a laptop too.

## Runtimes

| `shell:`                                    | Runs                                  | Setup                                                                                   | Notes                                                                                              |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `actions-shell rust-script {0}`             | [rust-script]                         | [Rust and script tools](#rust-and-script-tools)                                         | Bare statements, `fn main()`, and embedded Cargo manifests. rust-script caches compiled artifacts. |
| `actions-shell cross --target <triple> {0}` | `rust-script --package` + `cross run` | [Cross guide](https://github.com/kjanat/actions-shells/blob/master/docs/cross.md)       | Inline Rust on another target. Linux host and local Docker or Podman required. Unreleased.         |
| `actions-shell cargo-script {0}`            | `cargo +nightly -Zscript`             | [Nightly Rust](#rust-and-script-tools)                                                  | Requires `fn main()`.                                                                              |
| `actions-shell rust {0}`                    | alias for `rust-script`               | [Rust and script tools](#rust-and-script-tools)                                         | Pin `rust-script` when the exact backend matters.                                                  |
| `actions-shell go {0}`                      | `go build` + exec                     | mise `go`, or [setup-go@v7](https://github.com/actions/setup-go)                        | `package main` + `func main()`. Direct execution preserves `os.Exit(n)`.                           |
| `actions-shell deno {0}`                    | `deno run --allow-all --ext=ts`       | mise `deno`, or [setup-deno@v2](https://github.com/denoland/setup-deno)                 | TypeScript with all permissions enabled by the adapter.                                            |
| `actions-shell bun {0}`                     | `bun run`                             | mise `bun`, or [setup-bun@v2](https://github.com/oven-sh/setup-bun)                     | TypeScript; input gets a `.ts` extension.                                                          |
| `actions-shell node {0}`                    | `node`                                | mise `node`, or [setup-node@v7](https://github.com/actions/setup-node)                  | CommonJS JavaScript.                                                                               |
| `actions-shell kotlin {0}`                  | `kotlinc -script`                     | [mise: Java + Kotlin](#runtime-setup)                                                   | Requires a JDK as well as Kotlin. `.main.kts` supports `@file:DependsOn`.                          |
| `actions-shell swift {0}`                   | `swift`                               | Swift supplied by a macOS runner, or [mise Swift](https://mise.jdx.dev/lang/swift.html) | Top-level code. CI exercises the macOS runner's installed Swift.                                   |
| `actions-shell csharp {0}`                  | `dotnet run file.cs`                  | mise `dotnet`, or [setup-dotnet@v6](https://github.com/actions/setup-dotnet), SDK 10+   | Top-level statements and `#:package` directives.                                                   |
| `actions-shell fsharp {0}`                  | `dotnet fsi`                          | mise `dotnet`, or [setup-dotnet@v6](https://github.com/actions/setup-dotnet)            | F# scripts.                                                                                        |
| `actions-shell python {0}`                  | `python3` / `python`                  | mise `python`, or [setup-python@v7](https://github.com/actions/setup-python)            | GitHub also has a built-in `python` shell.                                                         |
| `actions-shell ruby {0}`                    | `ruby`                                | [setup-ruby@v1](https://github.com/ruby/setup-ruby), or mise `ruby`                     | setup-ruby provides prebuilt Rubies and Bundler caching.                                           |
| `actions-shell perl {0}`                    | `perl`                                | [actions-setup-perl@v1](https://github.com/shogo82148/actions-setup-perl)               | Includes Windows support; mise `perl` is another option on supported platforms.                    |
| `actions-shell php {0}`                     | `php`                                 | [setup-php@v2](https://github.com/shivammathur/setup-php)                               | Handles PHP extensions and configuration. Start the script with `<?php`.                           |
| `actions-shell lua {0}`                     | `lua` / `lua5.4` / `luajit`           | [mise: Lua](#runtime-setup)                                                             | CI tests Lua on Linux and macOS.                                                                   |
| `actions-shell julia {0}`                   | `julia`                               | [setup-julia@v3](https://github.com/julia-actions/setup-julia), or mise `julia`         | Julia scripts.                                                                                     |
| `actions-shell r {0}`                       | `Rscript`                             | [r-lib/actions/setup-r@v2](https://github.com/r-lib/actions/tree/v2/setup-r)            | Use the R community's setup action for R versions and package-repository configuration.            |

Aliases: `rust`→rust-script, `js`/`javascript`→node, `ts`/`typescript`→deno, `cs`→csharp, `fs`→fsharp, `kt`/`kts`→kotlin, `rb`→ruby, `pl`→perl, `jl`→julia, `py`→python, `rscript`→r.

`actions-shell list` prints this table from the binary itself.

[rust-script]: https://rust-script.org

## Runtime setup

Use the tool versions already declared by your project. For a repository with `mise.toml`, [jdx/mise-action@v5](https://github.com/jdx/mise-action) installs those tools and exposes them to later steps:

```yaml
- uses: actions/checkout@v7
- uses: jdx/mise-action@v5
- uses: kjanat/actions-shells@v0.1.0
  with: { doctor: true, runtimes: "kotlin, lua" }
```

For workflow-only configuration, the same action accepts `mise_toml`. This is the setup used for Kotlin and Lua in this repository's Linux/macOS CI:

```yaml
- uses: jdx/mise-action@v5
  with:
    mise_toml: |
      [tools]
      java = "21"
      kotlin = "2.4.21"
      lua = "5.4"
```

Kotlin needs both `java` and `kotlinc` on `PATH`. The macOS CI job uses the Swift toolchain already installed on the runner. Use mise's Swift support when you need a selected Swift version. Check each mise backend's platform support when building a Windows matrix; the repository currently tests Lua on Linux/macOS and Swift on macOS.

The runtime table also links maintained language-specific actions. They are useful when you need features such as Bundler caching, PHP extensions, or R package-repository setup. Configure the language version explicitly, for example `node-version: "24"`, `dotnet-version: "10.0.x"`, or `python-version: "3.14"` with the corresponding action. Use one installation approach for each runtime. For reproducible workflows, pin action commit SHAs and commit your tool versions and lockfile; [mise's CI guide](https://mise.jdx.dev/continuous-integration.html) covers locked installs.

### Rust and script tools

[dtolnay/rust-toolchain](https://github.com/dtolnay/rust-toolchain) selects a rustup toolchain, and [taiki-e/install-action@v2](https://github.com/taiki-e/install-action) installs the script executable:

```yaml
- uses: dtolnay/rust-toolchain@stable
- uses: taiki-e/install-action@v2
  with: { tool: "rust-script@0.36.0" }
```

For `cargo-script`, install `dtolnay/rust-toolchain@nightly`. For `cross`, install both `cross` and `rust-script` and provide a working container engine; the [Cross guide](https://github.com/kjanat/actions-shells/blob/master/docs/cross.md) gives the full setup and support scope. A project that already manages Rust through mise can keep that toolchain setup and install the script tools separately.

## Usage

See the [actions-rs CI workflow](https://github.com/kjanat/actions-rs/blob/51db99e661078f308e150f55644c07cde50e0679/.github/workflows/ci.yml) for a real-world example.

Per step:

```yaml
- uses: actions/setup-go@v7
  with: { go-version: stable }
- uses: kjanat/actions-shells@v0.1.0

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
  - uses: kjanat/actions-shells@v0.1.0 # a `uses:` step, so the default shell does not apply to it
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
$ actions-shell doctor          # every runtime, exit 0; prints "n/18 runtimes ready"
```

`doctor <runtime>` exits 1 when the runtime is missing and emits a `::warning::` annotation on GitHub, so a failing job says *why* instead of "Process completed with exit code 1".

### Environment variables

| Variable                          | Effect                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ACTIONS_SHELL_<RUNTIME>_COMMAND` | Use this executable instead of the default, e.g. `ACTIONS_SHELL_CARGO_SCRIPT_COMMAND=/opt/cargo`. |
| `ACTIONS_SHELL_<RUNTIME>_ARGS`    | Extra arguments inserted before the adapter's own (quotes honoured).                              |
| `ACTIONS_SHELL_DEBUG=1`           | Print the resolved command line to stderr.                                                        |
| `ACTIONS_SHELL_KEEP=1`            | Keep the prepared source, Go binary, or Cross package after the run.                              |

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

Supported. The setup action writes both `actions-shell` (sh) and `actions-shell.cmd`, using the runner's own Node, and adds their directory to `PATH`. `actions-shells` works as well, so the repository name and the executable name are interchangeable. Paths with spaces are handled; nothing is passed through `cmd.exe` quoting. Swift and Lua are untested on Windows; the Cross adapter supports Linux hosts.

## Versioning

- `vX.Y.Z` — immutable release tags. Each is an orphan commit containing exactly `README.md`, `LICENSE`, `action.yml`, `cli.mjs`, `setup.mjs` (no source, no `node_modules`, fast to fetch).
- `vX.Y`, `vX` — floating tags moved to the newest matching release.
- `master` — source only. **Not usable as `uses:`** (there is nothing built there).
- Every release ships `cli.mjs`, `setup.mjs` and `action.yml` with [build provenance attestations](https://docs.github.com/en/actions/security-for-github-actions/using-artifact-attestations) and a `SHA256SUMS` file:

  ```console
  gh attestation verify cli.mjs --repo kjanat/actions-shells
  ```

## Why not…

- **…teach this action to install Rust/Deno/Go?** Tool managers and dedicated setup actions already handle versions, caches, architectures, mirrors and auth.
- **…wrap scripts in `main()` for the user?** Then the language in `run:` is no longer the language, and diagnostics stop matching what you wrote.
- **…one executable per language?** `actions-shell <runtime> {0}` is a single install, a single code path for exit codes, signals, Windows paths and cleanup, and a single `doctor`.

Related: [scriptisto](https://github.com/igor-petruk/scriptisto) makes compiled languages usable as shebang scripts in general; `actions-shells` only makes language runtimes satisfy GitHub's `shell:` protocol.

## License

[MIT](LICENSE)

 <!-- markdownlint-disable-file line-length -->
