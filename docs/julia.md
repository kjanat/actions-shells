# Julia

```yaml
- name: Run Julia
  shell: actions-shell julia {0}
  run: |
    println("julia ", VERSION)
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put `julia` on `PATH` before the step. `julia-actions/setup-julia` is the setup action used in this repository's CI. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell julia [runtime-options...] <script-file>
```

The adapter invokes `julia [runtime-options...] <script-file>`. Put Julia options before `{0}` in the workflow. The script path must be the final argument. The alias `jl` selects the same adapter.

`ACTIONS_SHELL_JULIA_COMMAND` selects a different executable. `ACTIONS_SHELL_JULIA_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor julia` to check executable availability and `actions-shell describe julia` to inspect the adapter.

## Script behavior

Julia reads the extensionless step file directly. Set up any Julia environment and packages your code needs before this step. The adapter adds no project or startup-file options.

The runtime's exit status becomes the step's exit status. For example, `exit(19)` ends the step with a nonzero status.

[All runtime guides](./README.md)
