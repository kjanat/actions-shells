# Contributing

## Layout

- `src/` — TypeScript sources. `cli.ts` is the `actions-shell` executable, `setup.ts` the GitHub Action entry point. Runtime adapters live in `src/runtimes/index.ts`.
- `test/unit` — no runtimes needed. `test/integration` — spawns the built `cli.js` against every runtime it can find on `PATH` and skips the rest.
- `scripts/build.ts` — bundles `cli.js` and `setup.js` into the repo root (git-ignored).
- `scripts/assemble-release.ts` — copies the five release files into `release/`.

```sh
pnpm install
pnpm check          # lint + typecheck + build + tests
pnpm build && node cli.js doctor
```

## Adding a runtime

Add one entry to `adapters` in `src/runtimes/index.ts`:

- `input`: `{ kind: "file" }` when the runtime accepts an extensionless path, or `{ kind: "file", extension: ".ext" }` when it needs one (a sibling file is created next to GitHub's temp file and removed afterwards).
- `args(path, userArgs)`: put `userArgs` before the path so `shell: actions-shell x --flag {0}` works.
- `compile` only when the runtime's "run" front-end hides exit codes (see `go`).
- Add a case to `test/integration/cli.test.ts`, a setup action to `ci.yml`, and a row to the README table.

The adapter must not rewrite the user's source. If a runtime needs `fn main()`, users write it.

## Branching and releases

- Source lives on `master`. Built files are never committed there.
- Release tags `vX.Y.Z` are orphan commits containing only `README.md`, `LICENSE`, `action.yml`, `cli.js` and `setup.js`. They are immutable: the release workflow refuses to overwrite one. Enable **Settings → Tags → Tag protection** (or immutable releases) on the repository so they cannot be moved by hand either.
- `vX.Y` and `vX` are floating and force-moved to the newest matching release.
- To release: `Actions → Release → Run workflow` with the version. The workflow builds from `master`, runs the tests, attests `cli.js`/`setup.js`/`action.yml`, creates the tags and a GitHub Release with the tarball, the loose files and `SHA256SUMS`.
- `@master` is not usable as an action ref (no built files). Consumers use `@v1`, `@v1.2`, `@v1.2.3` or a commit SHA of a release tag.

 <!-- markdownlint-disable-file line-length -->
