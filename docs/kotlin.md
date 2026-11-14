# Kotlin

```yaml
- shell: actions-shell kotlin {0}
  run: |
    println("hello from Kotlin")
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install both a JDK and Kotlin. The `java` and `kotlinc` executables must be on `PATH`. The common setup guide includes a mise example.

## Invocation and flags

The adapter prepares a sibling `.main.kts` file and runs `kotlinc -script [flags] <script.main.kts>`. Top-level statements work without a `main` function. The aliases `kt` and `kts` select this adapter.

Put compiler options before `{0}`, for example `shell: actions-shell kotlin -jvm-target 17 {0}`. Choose a JVM target supported by the installed JDK and Kotlin compiler.

## Dependencies and constraints

The `.main.kts` extension enables Kotlin's main script support, including `@file:DependsOn` and `@file:Repository` directives. Declare script dependencies there, or pass an existing classpath with `-classpath` before `{0}`. Dependency downloads need access to the configured repositories.

The adapter removes its prepared source after execution unless `ACTIONS_SHELL_KEEP=1` is set. Kotlin's compiler and dependency caches follow the installed toolchain's normal behavior.
