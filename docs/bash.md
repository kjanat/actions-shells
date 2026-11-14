# Bash

```yaml
- name: Run Bash with strict defaults
  shell: actions-shell bash {0}
  run: |
    printf 'Running on %s\n' "$RUNNER_OS"
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). Bash must be on `PATH`. Git for Windows supplies Bash on Windows.

## Invocation and defaults

`actions-shell bash {0}` runs the step file with `bash --noprofile --norc -euo pipefail`. It skips profile and rc files, stops on unhandled command failures, reports unset variables as errors, and treats a failing command in a pipeline as a pipeline failure. Normal Bash conditional rules still apply, so a failure tested by `if` can be handled by the script. Explicit `exit` statuses reach the workflow.

The adapter passes the original step file to Bash without changing its contents. `bash` has no aliases.

## Flags

Put Bash options before `{0}`. For example, `shell: actions-shell bash +u {0}` allows unset variables, and `shell: actions-shell bash -x {0}` enables tracing. Use `+e` to disable errexit or `+o pipefail` to disable pipeline failure checking. Long options such as `--posix` also work; the adapter places leading long options before its short options and applies your short options after its defaults.

Keep `{0}` last. Use file execution options rather than `-c`, which changes how Bash interprets the remaining arguments.

[All runtimes](./README.md)
