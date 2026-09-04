import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupSource, prepareSource } from "../../src/prepare.js";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-test-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("prepareSource", () => {
  it("passes plain files through untouched", () => {
    const f = path.join(dir, "abc");
    writeFileSync(f, "x");
    const p = prepareSource(f, { kind: "file" });
    expect(p).toEqual({ path: f, original: f, created: false, useStdin: false });
  });

  it("creates a sibling with the required extension and cleans it up", () => {
    const f = path.join(dir, "abc");
    writeFileSync(f, "package main");
    const p = prepareSource(f, { kind: "file", extension: ".go" });
    expect(p.path).toBe(`${f}.go`);
    expect(p.created).toBe(true);
    expect(readFileSync(p.path, "utf8")).toBe("package main");
    cleanupSource(p, {});
    expect(existsSync(p.path)).toBe(false);
    expect(existsSync(f)).toBe(true);
  });

  it("keeps the sibling when ACTIONS_SHELL_KEEP=1", () => {
    const f = path.join(dir, "abc");
    writeFileSync(f, "");
    const p = prepareSource(f, { kind: "file", extension: ".rs" });
    cleanupSource(p, { ACTIONS_SHELL_KEEP: "1" });
    expect(existsSync(p.path)).toBe(true);
  });

  it("does not duplicate when the extension is already present", () => {
    const f = path.join(dir, "abc.rs");
    writeFileSync(f, "");
    const p = prepareSource(f, { kind: "file", extension: ".rs" });
    expect(p.path).toBe(f);
    expect(p.created).toBe(false);
  });

  it("marks stdin runtimes", () => {
    const p = prepareSource("/nowhere", { kind: "stdin" });
    expect(p.useStdin).toBe(true);
    expect(p.path).toBe("-");
  });
});
