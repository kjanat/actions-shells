# Deno

```yaml
- name: Run TypeScript with Deno
  shell: actions-shell deno {0}
  run: |
    const sha: string = Deno.env.get("GITHUB_SHA") ?? "";
    console.log("deno", Deno.version.deno, sha.slice(0, 7));
```

## Prerequisites

Install `actions-shell` as described in [runtime setup](../README.md#runtime-setup). Install `deno` on `PATH`, for example with `denoland/setup-deno` or mise.

## Invocation and aliases

`actions-shell deno {0}` runs `deno run --allow-all --ext=ts <step-file>`. The aliases `ts` and `typescript` use this adapter. `--ext=ts` tells Deno to interpret the extensionless step file as TypeScript. The adapter passes the original file unchanged and preserves Deno's exit status.

The default invocation grants all Deno permissions through `--allow-all`. Treat the step body as code with access to the runner and its environment.

## Flags and limitations

Put `deno run` flags before `{0}`. For example, `shell: actions-shell deno --no-check {0}` explicitly skips type checking. The adapter places your flags after `--allow-all --ext=ts` and before the step file.

The adapter always supplies `--allow-all`. Adding a narrower `--allow-net` or another `--allow-*` flag does not remove that argument; use Deno's applicable deny flags when you need to restrict a permission.

The source file lives in the runner's temporary directory. Relative module imports resolve from that file, so use explicit module URLs or paths suited to its location.

[All runtimes](./README.md)
