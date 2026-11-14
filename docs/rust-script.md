# Rust with rust-script

```yaml
- shell: actions-shell rust-script {0}
  run: |
    println!("hello from Rust");
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install a Rust toolchain and the `rust-script` executable, for example with `cargo install rust-script`.

## Invocation and flags

The adapter runs `rust-script [flags] <script>`. It accepts bare statements or a complete `fn main()`. rust-script caches compiled artifacts. The alias `rust` selects this adapter.

Put rust-script options before `{0}`, for example `shell: actions-shell rust-script --debug {0}`. The adapter passes these options to rust-script without changing them.

## Dependencies and constraints

Use an embedded Cargo manifest to declare crates. This form is covered by the integration suite:

````yaml
- shell: actions-shell rust-script {0}
  run: |
    //! ```cargo
    //! [dependencies]
    //! serde_json = "1"
    //! ```
    fn main() {
        let value: serde_json::Value = serde_json::from_str(r#"{"hello":"world"}"#).unwrap();
        println!("{}", value["hello"]);
    }
````

rust-script handles dependency resolution and compilation. Fetching a crate requires access to its registry unless Cargo already has it cached. Use [Cross](./cross.md) to execute inline Rust on an explicit target through a container, or [cargo-script](./cargo-script.md) for Cargo's nightly script mode.
