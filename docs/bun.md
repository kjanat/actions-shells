# Bun

```yaml
- name: Run TypeScript with Bun
  shell: actions-shell bun {0}
  run: |
    const n: number = 42;
    console.log("bun", Bun.version, n);
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). Install `bun` on `PATH`, for example with `oven-sh/setup-bun` or mise.

## Invocation and defaults

`actions-shell bun {0}` runs `bun run <step-file.ts>`. The adapter creates a sibling `.ts` file when the step file lacks that extension, so Bun selects its TypeScript loader. It preserves the source contents and returns Bun's exit status. It normally removes the added file after execution. Set `ACTIONS_SHELL_KEEP` to `1` or `true` to preserve it.

The canonical name is `bun`; it has no aliases. The `ts` and `typescript` aliases select [Deno](./deno.md).

## Flags and file paths

Put `bun run` flags before `{0}`. The adapter inserts them after `run` and before the script path. For example, `shell: actions-shell bun --smol {0}` requests Bun's lower-memory mode. Keep `{0}` last.

The `.ts` file lives beside GitHub's temporary step file. Relative module imports resolve from that directory. Use explicit paths when importing code from the checked-out workspace.

[All runtimes](./README.md)
