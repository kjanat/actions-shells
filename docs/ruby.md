# Ruby

```yaml
- name: Run Ruby
  shell: actions-shell ruby {0}
  run: |
    puts "ruby #{RUBY_VERSION}"
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put `ruby` on `PATH` before the step. `ruby/setup-ruby` is the setup action used in this repository's CI. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell ruby [runtime-options...] <script-file>
```

The adapter invokes `ruby [runtime-options...] <script-file>`. Put Ruby options before `{0}` in the workflow. The script path must be the final argument. The alias `rb` selects the same adapter.

`ACTIONS_SHELL_RUBY_COMMAND` selects a different executable. `ACTIONS_SHELL_RUBY_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor ruby` to check executable availability and `actions-shell describe ruby` to inspect the adapter.

## Script behavior

Ruby reads the extensionless step file directly. Write ordinary Ruby code, without a shell wrapper. Install any gems your code needs before this step.

The runtime's exit status becomes the step's exit status. For example, `exit 15` ends the step with a nonzero status.

[All runtime guides](./README.md)
