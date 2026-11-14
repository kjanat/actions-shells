# PowerShell

```yaml
- name: Run PowerShell
  shell: actions-shell pwsh {0}
  run: |
    Write-Output "PowerShell on $env:RUNNER_OS"
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). The runner needs `pwsh` on `PATH`, with PowerShell 7.4 or newer. The adapter checks that version when it launches the script.

## Invocation and defaults

`actions-shell pwsh {0}` starts `pwsh -NoLogo -NoProfile -NonInteractive`, then uses `-CommandWithArgs` to run the step file through a wrapper. The adapter creates a sibling `.ps1` file if needed and normally removes it afterward. Set `ACTIONS_SHELL_KEEP` to `1` or `true` to preserve it. The adapter preserves the script contents.

The wrapper sets `$ErrorActionPreference = 'Stop'` and `$PSNativeCommandUseErrorActionPreference = $true`. PowerShell errors and failed native commands stop execution. A native command's failure status and an explicit script `exit` status reach the workflow; other caught errors return status 1.

Use `try` and `catch` for an expected native failure. After handling it, use `exit 0` if the step should succeed, since the wrapper otherwise returns `$LASTEXITCODE`.

## Flags and aliases

Put additional PowerShell launch options before `{0}`. The adapter inserts them after `-NonInteractive` and before its `-CommandWithArgs` wrapper. Keep that wrapper in control of script execution rather than supplying another `-Command` or `-File` entry point.

The canonical name is `pwsh`; it has no aliases. Windows PowerShell's `powershell` executable cannot satisfy the PowerShell 7.4 requirement.

[All runtimes](./README.md)
