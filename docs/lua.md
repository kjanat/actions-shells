# Lua

```yaml
- name: Run Lua
  shell: actions-shell lua {0}
  run: |
    print("lua " .. _VERSION)
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put a Lua interpreter on `PATH` before the step. The adapter tries `lua`, `lua5.4`, `lua5.3`, then `luajit`, in that order. This repository's CI uses `jdx/mise-action` to install Lua 5.4 on Linux and macOS. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell lua [runtime-options...] <script-file>
```

The adapter invokes `lua [runtime-options...] <script-file>`. Put Lua options before `{0}` in the workflow. The script path must be the final argument. `lua` has no aliases.

`ACTIONS_SHELL_LUA_COMMAND` selects a different executable. `ACTIONS_SHELL_LUA_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor lua` to check executable availability and `actions-shell describe lua` to inspect the adapter.

## Script behavior

Lua reads the extensionless step file directly. The selected interpreter determines the Lua version and available modules. Install any modules your code needs before this step.

The runtime's exit status becomes the step's exit status. For example, `os.exit(18)` ends the step with a nonzero status.

[All runtime guides](./README.md)
