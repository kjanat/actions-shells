# C#

```yaml
- shell: actions-shell csharp --file {0}
  run: |
    Console.WriteLine("hello from C#");
```

This step assumes actions-shells is already set up. See [runtime setup](../README.md#runtime-setup) and the [runtime index](./README.md).

## Prerequisites

Install the .NET SDK version 10 or newer, for example with `actions/setup-dotnet` or mise. The `dotnet` executable must be on `PATH`.

## Invocation and flags

The adapter prepares a sibling `.cs` file and runs `dotnet run --disable-build-servers [flags] <script.cs>`. Pass `--file` to explicitly select the inline file through .NET's file-based app support. Top-level statements work. The alias `cs` selects this adapter.

Put `dotnet run` options before `{0}`, for example `shell: actions-shell csharp --configuration Release --file {0}`. The adapter always supplies `--disable-build-servers`.

Keep `--file` immediately before `{0}`. Without `--file`, `dotnet run` selects a project in the working directory when one exists. The positional script path then becomes a project argument, so the step may run the project instead of the inline script.

## Dependencies and constraints

Use `#:package` directives in the source for NuGet dependencies. .NET handles restore and compilation, so package downloads require access to the configured feeds unless the packages are cached.

This adapter needs the SDK's file-based app support. An older SDK with `dotnet` on `PATH` is insufficient. The adapter removes the prepared `.cs` file after execution unless `ACTIONS_SHELL_KEEP=1` is set. .NET manages its own restore and build caches.
