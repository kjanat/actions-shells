# Inline Rust with Cross

`actions-shell cross --target <triple> {0}` compiles the Rust in a `run:` block and executes it through [Cross](https://github.com/cross-rs/cross). Use it for architecture checks, portability probes, and small smoke tests that would otherwise need their own Cargo project.

## Workflow

The adapter requires a Linux host, Rust installed through rustup, `cross`, `rust-script`, and a working local Docker or Podman engine. GitHub's Ubuntu runners provide Docker. Install the Rust tools before selecting the shell:

```yaml
steps:
  - uses: actions/checkout@v7
  - uses: dtolnay/rust-toolchain@stable
  - uses: taiki-e/install-action@v2
    with: { tool: "cross@0.2.5,rust-script@0.36.0" }
  - uses: kjanat/actions-shells@<release-containing-cross>
    with: { doctor: true, runtimes: cross }

  - shell: actions-shell cross --target aarch64-unknown-linux-gnu {0}
    run: |
      assert_eq!(std::env::consts::ARCH, "aarch64");
      println!("hello from ARM64");
```

Replace the action placeholder with a release containing this feature. CI tests `aarch64-unknown-linux-gnu` and `x86_64-unknown-linux-musl` with Cross 0.2.5 and rust-script 0.36.0. Other targets depend on Cross's execution support: a shell step needs a working target runner as well as a compiler.

The target must appear explicitly before `{0}`. Both `--target triple` and `--target=triple` work. A toolchain selector can appear first, for example `actions-shell cross +stable --target aarch64-unknown-linux-gnu {0}`. Remaining arguments go to `cross run`; `--manifest-path` is managed by the adapter. Each step executes one inline program.

## Dependencies and files

Cross uses rust-script's package-only mode. Bare statements, a complete `fn main()`, and embedded Cargo manifests work:

````yaml
- shell: actions-shell cross --target aarch64-unknown-linux-gnu {0}
  run: |
    //! ```cargo
    //! [dependencies]
    //! serde_json = "1"
    //! local_helpers = { path = "./crates/local_helpers" }
    //! ```
    println!("{}", serde_json::json!({"arch": std::env::consts::ARCH}));
````

Relative Cargo dependency paths resolve from the step's working directory. That directory is mounted at the same absolute path in the container, so runtime file operations such as `std::fs::read_to_string("fixture.json")` work against the checkout. `GITHUB_WORKSPACE` is also mounted and forwarded when present. Cross mounts Cargo path dependencies through its own dependency discovery.

The source is copied into an isolated temporary package. Compiler diagnostics refer to that package's source, and source-relative constructs such as `include_str!("fixture.json")` resolve there. Choose explicit paths for compile-time includes. rust-script performs its normal source preparation; actions-shells delegates Rust syntax and manifest handling to it.

## Environment and GitHub outputs

The adapter mounts and forwards the existing files named by `GITHUB_OUTPUT`, `GITHUB_ENV`, `GITHUB_PATH`, `GITHUB_STEP_SUMMARY`, and `GITHUB_STATE`. It also forwards `GITHUB_ACTIONS` and `CI` when set:

```rust
use std::io::Write;
let mut output = std::fs::OpenOptions::new()
    .append(true)
    .open(std::env::var("GITHUB_OUTPUT").unwrap())
    .unwrap();
writeln!(output, "arch={}", std::env::consts::ARCH).unwrap();
```

Other variables follow [Cross's environment passthrough rules](https://github.com/cross-rs/cross/blob/main/docs/environment_variables.md). Declare additional workflow variables in `Cross.toml` in the step's working directory:

```toml
[build.env]
passthrough = ["MY_TEST_SETTING"]
```

An explicit `CROSS_CONFIG` takes precedence. The original configuration file is left unchanged. Cross interprets custom image, runner, and environment settings. `CROSS_CONTAINER_ENGINE` selects Docker or Podman. Additional `CROSS_CONTAINER_OPTS` are retained; the adapter owns the container name for cancellation and adds its required mounts.

## Execution and cleanup

Each invocation follows these steps:

1. Validate the target and resolve Cross, rust-script, rustup, and the container engine.
2. Create a unique temporary directory and copy the input into it.
3. Run `rust-script --package --pkg-path <directory> --base-path <working-directory> <source>`.
4. Run `cross run --target <triple> --manifest-path <directory>/Cargo.toml` from the original working directory.
5. Return the program's exit code and remove the owned temporary package, including its default build directory.

A failed preparation step prevents execution. Compiler and runtime failures still trigger cleanup. On `SIGINT` or `SIGTERM`, the adapter signals the process group, forcibly removes its own named container, and returns `130` or `143`.

`ACTIONS_SHELL_KEEP=1` retains the package for inspection, including after a failure. `ACTIONS_SHELL_DEBUG=1` prints commands containing the package location. `ACTIONS_SHELL_CROSS_COMMAND` and `ACTIONS_SHELL_CROSS_ARGS` override Cross; the existing `ACTIONS_SHELL_RUST_SCRIPT_COMMAND` and `ACTIONS_SHELL_RUST_SCRIPT_ARGS` overrides also apply to the package generator.

Cross images and Cargo's download cache remain available for later steps. Provide a persistent `--target-dir` to retain compiled dependencies. Only the adapter's own temporary directory is deleted.

`doctor cross` checks Cross, rust-script, rustup, and container-engine connectivity. The selected image, target libraries, and emulator are exercised when the step runs. The initial support scope is local container engines on Linux hosts; explicit `CROSS_REMOTE` and `CROSS_CONTAINER_IN_CONTAINER` modes are rejected. Mount paths containing a colon are rejected because Docker's volume syntax uses colons as separators.

## Verification

Run the container integration suite explicitly:

```sh
pnpm build
ACTIONS_SHELL_TEST_CROSS=1 pnpm exec vitest run test/integration/cross.test.ts
ACTIONS_SHELL_TEST_CROSS=1 ACTIONS_SHELL_TEST_CROSS_TARGET=x86_64-unknown-linux-musl pnpm exec vitest run test/integration/cross.test.ts
```

The suite checks target architecture, embedded registry and local dependencies, working-directory access, paths containing spaces and quotes, explicit environment passthrough, all five GitHub command files, exact nonzero exit status, compiler failure, cancellation, and cleanup. Unit tests cover failed package generation, missing prerequisites, argument validation, and retained packages. CI additionally uses the checkout as a real action and reads the output written by a Cross shell step.
