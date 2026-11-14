# Changelog

Changes are grouped by release, newest first. Release dates use UTC.

## [Unreleased]

### Changed

- Build the package tarball with `pnpm pack` and publish the same archive to npmjs.org and GitHub Packages.
- Publish to npm through the trusted publisher configured for `kjanat/actions-shells` and `release.yml`, without retrieving a long-lived npm token from Beepboop. GitHub Packages continues to use the workflow's GitHub token.

### Fixed

- Prepare `package.json` and all four README installation examples for 0.2.1. Previously, the release workflow changed the package version only in its temporary checkout, leaving the repository and examples at 0.1.0.

## [0.2.0] - 2026-11-14

### Added

- Run inline Rust for another target with `actions-shell cross --target <triple> {0}` on Linux. Cross uses Docker or Podman and accepts rust-script dependency manifests. The adapter checks prerequisites, mounts the workspace and GitHub command files, and removes its container when interrupted. ([#5])
- Run Bash through `actions-shell bash {0}` with `errexit`, `nounset`, and `pipefail` enabled. Caller flags such as `+u` can relax individual defaults; normal conditional error handling still works. ([#12])
- Run PowerShell 7.4 or newer through `actions-shell pwsh {0}` with profiles disabled and terminating error defaults. PowerShell errors and failed native commands stop the step; explicit exit codes and native failure statuses reach the workflow. ([#13])
- Select an installed Python minor version with `actions-shell py3.11 {0}` or `actions-shell python3.11 {0}`. Candidates are checked before execution, and a missing version produces an error instead of running a different interpreter. ([#14])
- Run Python through uv with `actions-shell uv {0}`, `uv-python`, or a versioned selector such as `uv-python3.11`. Support inline PEP 723 dependencies, uv-managed Python downloads, and options such as `--python`, `--with`, and `--no-project`. ([#15])
- Provide a guide for each of the 21 runtimes, with workflow examples, prerequisites, aliases, flag handling, and runtime-specific constraints. ([#17])
- Publish `@kjanat/actions-shells` to both npmjs.org and GitHub Packages through Beepboop-managed releases. ([#11])

### Changed

- Upgrade the CLI to DreamCLI 5 while keeping the distributed CLI and setup scripts self-contained.
- Link Action distribution commits to their source commit and previous distribution commit. Release tags retain their source history; `v0` and `v0.2` track the stable release, with checks against moving aliases backwards.
- Use `pnpm/setup` for pnpm and Node installation, test the distributed Action on Node 24, and run Linux CI and releases on Ubuntu 26.04.

### Fixed

- Preserve Cross arguments on both sides of `--`, placing the generated `--manifest-path` before the separator. Arguments intended for the program no longer interfere with target selection.
- Disable .NET build servers for inline C# execution, avoiding the compiler-server connection warning seen on Windows.
- Keep Rust dependency manifests outside statement wrappers in examples, and specify an edition in Cargo script examples to avoid compiler warnings.
- Explain C# project discovery and use `--file` in its guide so an existing project in the working directory does not replace the inline script.
- Correct the runtime guides' Cargo flag and nightly-toolchain guidance, Deno permission restrictions, Node module detection, and temporary-file retention behavior.
- Allow shell profile integration tests up to 120 seconds for subprocess execution, matching the suite timeout and accommodating slow initial PowerShell startup.
- Isolate the Cross argument test from installed Rust tools, and report failed releases without trying to parse skipped credential outputs or submit an empty package digest.

## [0.1.0] - 2026-09-05

Initial release.

### Added

- Run inline workflow scripts with `actions-shell <runtime> [args...] {0}`, including job-wide default shells.
- Support 17 runtimes: Node.js, Deno, Bun, rust-script, Cargo script, Go, Kotlin, Swift, C#, F#, Python, Ruby, Perl, PHP, Lua, Julia, and R.
- Provide short runtime names including `rust`, `js`, `ts`, `cs`, `fs`, `kt`, `rb`, `pl`, `jl`, and `py`.
- Install executable shims on Linux, macOS, and Windows through the setup Action, with optional `doctor` checks for selected runtimes.
- List available adapters, describe their invocation and prerequisites, and check installed tools with `list`, `describe`, and `doctor`. Support JSON and quiet output for these commands, plus version information and shell completions.
- Override runtime commands and arguments with `ACTIONS_SHELL_<RUNTIME>_COMMAND` and `ACTIONS_SHELL_<RUNTIME>_ARGS`. Inspect execution with `ACTIONS_SHELL_DEBUG`, or retain generated files with `ACTIONS_SHELL_KEEP`.
- Prepare language-specific file extensions for extensionless GitHub step files, preserve the source contents, clean up generated files, and propagate runtime exit statuses.
- Distribute standalone `cli.mjs` and `setup.mjs` bundles, the setup Action, SHA-256 checksums, and build-provenance attestations.

### Fixed

- Launch Windows `.cmd` and `.bat` runtime commands through `cmd.exe`.
- Accept Windows CRLF line endings when writing GitHub runner environment and output files.

[Unreleased]: https://github.com/kjanat/actions-shells/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/kjanat/actions-shells/releases/tag/v0.2.0
[0.1.0]: https://github.com/kjanat/actions-shells/releases/tag/v0.1.0
[#5]: https://github.com/kjanat/actions-shells/pull/5
[#11]: https://github.com/kjanat/actions-shells/pull/11
[#12]: https://github.com/kjanat/actions-shells/pull/12
[#13]: https://github.com/kjanat/actions-shells/pull/13
[#14]: https://github.com/kjanat/actions-shells/pull/14
[#15]: https://github.com/kjanat/actions-shells/pull/15
[#17]: https://github.com/kjanat/actions-shells/pull/17
