import { describe, expect, it } from "vitest";
import {
  aliasesFor,
  allRuntimes,
  applyEnvOverrides,
  envKey,
  resolveRuntime,
  runtimeNames,
  splitArgs,
} from "../../src/registry.js";
import { aliases } from "../../src/runtimes/index.js";

describe("registry", () => {
  it("has unique runtime names that are valid identifiers", () => {
    const names = runtimeNames();
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9-]*$/);
  });

  it("every alias points at an existing runtime and never shadows one", () => {
    const names = new Set(runtimeNames());
    for (const [alias, target] of Object.entries(aliases)) {
      expect(names.has(target), `${alias} -> ${target}`).toBe(true);
      expect(names.has(alias), `alias ${alias} shadows a runtime`).toBe(false);
    }
  });

  it("resolves canonical names, aliases, and mixed case", () => {
    expect(resolveRuntime("rust-script")?.name).toBe("rust-script");
    expect(resolveRuntime("rust")?.name).toBe("rust-script");
    expect(resolveRuntime("Go")?.name).toBe("go");
    expect(resolveRuntime("nope")).toBeUndefined();
  });

  it("lists aliases per runtime", () => {
    expect(aliasesFor("rust-script")).toEqual(["rust"]);
    expect(aliasesFor("bun")).toEqual([]);
  });

  it("places the script path last for every file-based adapter", () => {
    for (const a of allRuntimes()) {
      if (a.input.kind !== "file") continue;
      const args = a.compile
        ? a.compile("/tmp/script", ["--flag"]).args
        : a.args("/tmp/script", ["--flag"]);
      expect(args.at(-1)).toBe("/tmp/script");
      expect(args).toContain("--flag");
      expect(args.indexOf("--flag")).toBeLessThan(args.length - 1);
    }
  });

  it("derives env keys", () => {
    expect(envKey("rust-script")).toBe("RUST_SCRIPT");
    expect(envKey("go")).toBe("GO");
  });

  it("applies env overrides", () => {
    const a = resolveRuntime("cargo-script");
    if (!a) throw new Error("missing");
    const r = applyEnvOverrides(a, {
      ACTIONS_SHELL_CARGO_SCRIPT_COMMAND: "/x/cargo",
      ACTIONS_SHELL_CARGO_SCRIPT_ARGS: '--config "a b" -q',
    });
    expect(r).toEqual({ command: "/x/cargo", extraArgs: ["--config", "a b", "-q"] });
    expect(applyEnvOverrides(a, {})).toEqual({ command: "cargo", extraArgs: [] });
  });
});

describe("splitArgs", () => {
  it("splits on whitespace and honours quotes", () => {
    expect(splitArgs("a  b\tc")).toEqual(["a", "b", "c"]);
    expect(splitArgs(`--x "hello world" 'it''s' ""`)).toEqual(["--x", "hello world", "its", ""]);
    expect(splitArgs("")).toEqual([]);
  });
});
