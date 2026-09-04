import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRuntime } from "../../src/registry.js";
import { buildInvocation, RuntimeNotFoundError, resolveCommand, runScript } from "../../src/run.js";

const get = (n: string) => {
  const a = resolveRuntime(n);
  if (!a) throw new Error(n);
  return a;
};

describe("resolveCommand", () => {
  it("falls back to alternative executables", () => {
    const python = get("python");
    const r = resolveCommand(python);
    if (r.resolved) expect(["python3", "python"]).toContain(r.command);
  });

  it("honours a command override without trying fallbacks", () => {
    const lua = get("lua");
    const r = resolveCommand(lua, { PATH: "", ACTIONS_SHELL_LUA_COMMAND: "/nope/lua" });
    expect(r.command).toBe("/nope/lua");
    expect(r.resolved).toBeUndefined();
  });
});

describe("buildInvocation", () => {
  it("throws a helpful error for missing runtimes", () => {
    expect(() =>
      buildInvocation({ adapter: get("julia"), scriptPath: "/x", userArgs: [], env: { PATH: "" } }),
    ).toThrow(RuntimeNotFoundError);
  });

  it("produces a compile stage for go", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-inv-"));
    try {
      const f = path.join(dir, "script");
      writeFileSync(f, "");
      const inv = buildInvocation({
        adapter: get("go"),
        scriptPath: f,
        userArgs: ["-tags=x"],
        env: { ...process.env, ACTIONS_SHELL_GO_COMMAND: process.execPath },
      });
      expect(inv.compile?.args).toEqual(["build", "-tags=x", "-o", inv.compile?.output, `${f}.go`]);
      expect(inv.run.executable).toBe(inv.compile?.output);
      expect(inv.run.args).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("runScript", () => {
  it("propagates the exit code of the runtime (using node as the runtime)", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-run-"));
    try {
      const f = path.join(dir, "script");
      writeFileSync(f, "process.exit(42)");
      const code = await runScript({ adapter: get("node"), scriptPath: f, userArgs: [] });
      expect(code).toBe(42);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
