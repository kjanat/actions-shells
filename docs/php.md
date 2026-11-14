# PHP

```yaml
- name: Run PHP
  shell: actions-shell php {0}
  run: |
    <?php echo "php " . PHP_VERSION . "\n";
```

This step assumes actions-shell is already set up. See [runtime setup](../README.md#runtime-setup) for shared setup instructions.

## Prerequisites

Put `php` on `PATH` before the step. `shivammathur/setup-php` is the setup action used in this repository's CI. actions-shell does not install the interpreter or its packages.

## Invocation

```text
actions-shell php [runtime-options...] <script-file>
```

The adapter invokes `php [runtime-options...] <script-file>`. Put PHP options before `{0}` in the workflow. The script path must be the final argument. `php` has no aliases.

`ACTIONS_SHELL_PHP_COMMAND` selects a different executable. `ACTIONS_SHELL_PHP_ARGS` adds arguments before the options in `shell:`. Use `actions-shell doctor php` to check executable availability and `actions-shell describe php` to inspect the adapter.

## Script behavior

Include `<?php` at the start of the code. PHP reads the extensionless step file directly, and text outside PHP tags is output as text. Install any extensions or Composer dependencies your code needs before this step.

The runtime's exit status becomes the step's exit status. For example, `exit(17);` ends the step with a nonzero status.

[All runtime guides](./README.md)
