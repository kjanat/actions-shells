# Python

```yaml
- name: Run Python 3.11
  shell: actions-shell py3.11 {0}
  run: |
    import sys
    assert sys.version_info[:2] == (3, 11)
    print("Python", sys.version)
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). Install Python on `PATH`, for example with `actions/setup-python`. For the example above, set its `python-version` input to `"3.11"`.

## Invocation and version selection

`actions-shell py3.11 {0}` and `actions-shell python3.11 {0}` select an installed Python 3.11 interpreter. The adapter tries `python3.11`, `python3`, then `python`, checking each candidate's version. It skips other minor versions and fails before running the script if no matching interpreter exists. It accepts selectors in the form `python3.MINOR` or `py3.MINOR`.

Use `actions-shell python {0}` or its alias `actions-shell py {0}` to run the first executable found as `python3`, then `python`. These unversioned names use the interpreter already on `PATH` without selecting a minor version.

The adapter runs the original step file as `python3 [flags] <step-file>`, or with the selected executable. It leaves the file contents unchanged and preserves Python's exit status. It installs neither Python nor dependencies. For Python downloads and inline dependencies, use [uv Python](./uv-python.md).

## Flags

Put interpreter flags before `{0}`. For example, `shell: actions-shell py3.11 -B {0}` disables bytecode file creation, and `shell: actions-shell python -u {0}` enables unbuffered output. Keep `{0}` last. Options such as `-c` and `-m` select a different execution mode and replace normal file execution.

[All runtimes](./README.md)
