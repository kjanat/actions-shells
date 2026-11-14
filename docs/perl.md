# Perl

```yaml
- name: Run Perl
  shell: actions-shell perl {0}
  run: |
    print "perl $^V\n";
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put `perl` on `PATH` before the step. `shogo82148/actions-setup-perl` is the setup action used in this repository's CI. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell perl [runtime-options...] <script-file>
```

The adapter invokes `perl [runtime-options...] <script-file>`. Put Perl options before `{0}` in the workflow. The script path must be the final argument. The alias `pl` selects the same adapter.

`ACTIONS_SHELL_PERL_COMMAND` selects a different executable. `ACTIONS_SHELL_PERL_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor perl` to check executable availability and `actions-shell describe perl` to inspect the adapter.

## Script behavior

Perl reads the extensionless step file directly. Write ordinary Perl code, including statement terminators. Install any Perl modules your code needs before this step.

The runtime's exit status becomes the step's exit status. For example, `exit 16;` ends the step with a nonzero status.

[All runtime guides](./README.md)
