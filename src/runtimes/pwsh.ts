import type { RuntimeAdapter } from '#types';
import { resolve } from 'node:path';

const versionCheck = "if ($PSVersionTable.PSVersion -lt [version]'7.4') { throw 'actions-shell pwsh requires PowerShell 7.4 or newer' }";
const launch = `${versionCheck};
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$global:LASTEXITCODE = 0
try {
  & $args[0]
  if (-not $? -and $LASTEXITCODE -eq 0) { exit 1 }
  exit $LASTEXITCODE
} catch {
  [Console]::Error.WriteLine($_.ToString())
  if ($_.Exception -is [System.Management.Automation.NativeCommandExitException]) {
    exit $_.Exception.ExitCode
  }
  exit 1
}`;

export const pwsh: RuntimeAdapter = {
	name: 'pwsh',
	title: 'PowerShell',
	command: 'pwsh',
	input: { kind: 'file', extension: '.ps1' },
	args: (path, userArgs) => [
		'-NoLogo', '-NoProfile', '-NonInteractive', ...userArgs, '-CommandWithArgs', launch, resolve(path),
	],
	versionArgs: ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `${versionCheck}; $PSVersionTable.PSVersion.ToString()`],
	install: 'PowerShell 7.4 or newer on the runner',
	notes: 'Stops on PowerShell errors and failing native commands. Preferences are set at invocation time; script contents are unchanged.',
};
