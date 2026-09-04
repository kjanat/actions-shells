# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `actions-shell` executable with the GitHub `shell:` contract: `actions-shell <runtime> [args...] {0}`.
- Runtimes: node, deno, bun, rust-script, cargo-script, go, kotlin, swift, csharp, fsharp,
  python, ruby, perl, php, lua, julia, r.
- Aliases: `rust` (→ rust-script), `js`, `ts`, `cs`, `fs`, `kt`, `rb`, `pl`, `jl`, `py`.
- `list`, `describe <runtime>`, `doctor [runtime]`, `--version`.
- Environment overrides `ACTIONS_SHELL_<RUNTIME>_COMMAND` / `_ARGS`, plus `ACTIONS_SHELL_DEBUG`
  and `ACTIONS_SHELL_KEEP`.
- Setup action (`runs.using: node24`) that puts `actions-shell` on `PATH` for Linux, macOS and
  Windows runners, with optional `doctor` / `runtimes` inputs.
- Release pipeline: orphan tags containing only the built files, attested with build provenance.
