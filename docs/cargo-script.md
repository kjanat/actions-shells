# Rust with Cargo script mode

```yaml
- shell: actions-shell cargo-script {0}
  run: |
    ---cargo
    [package]
    edition = "2024"
    ---
    fn main() {
        println!("hello from Cargo script mode");
    }
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install Rust through rustup with the nightly toolchain. The executable is `cargo`, not the separate `cargo-script` package.

## Invocation and flags

The adapter prepares a sibling `.rs` file and runs `cargo +nightly -Zscript [flags] <script.rs>`. Write a complete `fn main()`.

Put Cargo script options before `{0}`, for example `shell: actions-shell cargo-script --release {0}`. The adapter always supplies `+nightly -Zscript`. This runtime has no aliases.

## Dependencies and constraints

Declare the edition and dependencies in Cargo's script manifest at the start of the file:

```yaml
- shell: actions-shell cargo-script {0}
  run: |
    ---cargo
    [package]
    edition = "2024"
    [dependencies]
    serde_json = "1"
    ---
    fn main() {
        println!("{}", serde_json::json!({"hello": "world"}));
    }
```

Cargo resolves and downloads the declared crates. The explicit edition avoids Cargo's default-edition warning. Use [rust-script](./rust-script.md) for the embedded `//!` manifest format.

This backend depends on nightly Cargo's unstable script support. Pin a nightly toolchain in your workflow when repeatable behavior matters. The prepared `.rs` file is removed after execution unless `ACTIONS_SHELL_KEEP=1` is set.
