# Swift

```yaml
- shell: actions-shell swift {0}
  run: |
    import Foundation
    print("hello from Swift")
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Use the Swift toolchain installed on a macOS runner, or install Swift through mise on a supported platform. The `swift` executable must be on `PATH`.

## Invocation and flags

The adapter prepares a sibling `.swift` file and runs `swift [flags] <script.swift>`. Top-level code works without a `main` function. This runtime has no aliases.

Put interpreter options before `{0}`, for example `shell: actions-shell swift -warnings-as-errors {0}`. The adapter forwards these options unchanged.

## Dependencies and constraints

Imports use the installed Swift toolchain and its module search paths. Supply extra module and library paths through Swift's options when needed. The adapter does not create a Swift package or resolve package dependencies for the inline file.

Repository CI exercises Swift on macOS. Windows support is untested. The adapter removes the prepared `.swift` file after execution unless `ACTIONS_SHELL_KEEP=1` is set.
