# F#

```yaml
- shell: actions-shell fsharp {0}
  run: |
    printfn "hello from F#"
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install the .NET SDK, for example with `actions/setup-dotnet` or mise. The `dotnet` executable and its F# Interactive command must be available.

## Invocation and flags

The adapter prepares a sibling `.fsx` file and runs `dotnet fsi [flags] <script.fsx>`. Write F# script expressions at the top level. The alias `fs` selects this adapter.

Put F# Interactive options before `{0}`, for example `shell: actions-shell fsharp --warnaserror+ {0}`. The adapter forwards them unchanged.

## Dependencies and constraints

Use F# script directives such as `#r` to reference assemblies or NuGet packages. F# Interactive handles package restore and script loading. NuGet downloads need access to the configured feeds unless the packages are cached.

The source lives in GitHub's temporary script directory. Source-relative `#load` paths must account for that location. The adapter removes the prepared `.fsx` file after execution unless `ACTIONS_SHELL_KEEP=1` is set.
