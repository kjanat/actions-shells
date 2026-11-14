# Node.js

```yaml
- name: Run JavaScript with Node.js
  shell: actions-shell node {0}
  run: |
    console.log("node", process.version, process.env.GITHUB_REPOSITORY);
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). The runner needs `node` on `PATH`, for example from `actions/setup-node` or mise. The adapter uses that executable and adds no version requirement of its own.

## Invocation and aliases

`actions-shell node {0}` runs `node <step-file>`. The aliases `js` and `javascript` use the same adapter. It passes the original file without adding an extension or rewriting the source and preserves Node.js's exit status.

GitHub Actions supplies an extensionless step file. The adapter leaves module detection to Node.js and supplies no module-mode flag. Current Node.js versions can detect `import` and `export` syntax and run the file as an ES module; CommonJS scripts can use `require()`. Behavior depends on the installed Node.js version and its module configuration. Use [Deno](./deno.md) or [Bun](./bun.md) for TypeScript step bodies.

## Flags

Put Node.js flags before `{0}`. For example, `shell: actions-shell node --trace-warnings {0}` enables warning stack traces. Keep `{0}` last. Flags such as `--eval` select another execution mode instead of running the step file normally.

The step file lives in the runner's temporary directory. Account for that location when loading files relative to the script; use the workspace path explicitly for workspace files.

[All runtimes](./README.md)
