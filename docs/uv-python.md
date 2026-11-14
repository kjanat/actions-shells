# Python with uv

```yaml
- name: Run Python 3.11 with an inline dependency
  shell: actions-shell uv-python3.11 {0}
  run: |
    # /// script
    # dependencies = ["idna==3.11"]
    # ///
    import sys
    import idna
    assert sys.version_info[:2] == (3, 11)
    print(idna.encode("münich.example").decode())
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). Install `uv` on `PATH`, for example with `astral-sh/setup-uv` or mise. uv resolves Python when the script runs and can download the requested interpreter if necessary. Downloads and dependency installation need access to their configured sources unless already cached.

## Invocation and version selection

`actions-shell uv-python3.11 {0}` runs `uv run --python 3.11 <step-file.py>`. Version selectors have the form `uv-python3.MINOR`.

`actions-shell uv-python {0}` runs `uv run <step-file.py>`. Its alias is `uv`, so `actions-shell uv --python 3.11 {0}` also selects Python 3.11. The adapter creates a sibling `.py` file when needed so uv recognizes the Python script and its inline dependency metadata. It normally removes the added file after execution. Set `ACTIONS_SHELL_KEEP` to `1` or `true` to preserve it. The adapter preserves the original contents and the script's exit status.

## Flags and project discovery

Put `uv run` flags before `{0}`. Useful forms include:

- `actions-shell uv-python --python 3.11 {0}` selects Python explicitly.
- `actions-shell uv-python --no-project {0}` skips project discovery.
- `actions-shell uv-python --with idna==3.11 {0}` adds a dependency for this invocation.

The adapter keeps uv's project discovery enabled by default. Inline dependency metadata works in the `run:` body, as shown above. User flags follow the version selector's generated `--python` option, so use one version selection form per invocation.

`actions-shell doctor uv-python3.11` checks that uv is available. uv resolves the requested Python version and script dependencies during execution, so this readiness check can succeed before Python is installed.

[All runtimes](./README.md)
