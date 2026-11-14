# R

```yaml
- name: Run R
  shell: actions-shell r {0}
  run: |
    cat("R", R.version.string, "\n")
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put `Rscript` on `PATH` before the step. `r-lib/actions/setup-r` is the setup action used in this repository's CI. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell r [runtime-options...] <script-file>
```

The adapter invokes `Rscript [runtime-options...] <script-file>`. Put Rscript options before `{0}` in the workflow. The script path must be the final argument. The alias `rscript` selects the same adapter.

`ACTIONS_SHELL_R_COMMAND` selects a different executable. `ACTIONS_SHELL_R_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor r` to check executable availability and `actions-shell describe r` to inspect the adapter.

## Script behavior

The adapter runs `Rscript`, so write an R script rather than interactive R commands. Rscript reads the extensionless step file directly. Install any R packages your code needs before this step.

The runtime's exit status becomes the step's exit status. For example, `quit(status = 20)` ends the step with a nonzero status.

[All runtime guides](./README.md)
