import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { which } from "../../src/which.js";

describe("which", () => {
  it("finds node on the current PATH", () => {
    expect(which("node")).toBeDefined();
    expect(which("definitely-not-a-real-binary-xyz")).toBeUndefined();
  });

  it("searches a custom PATH and honours PATHEXT on windows", () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-which-"));
    try {
      const name = process.platform === "win32" ? "tool.cmd" : "tool";
      const f = path.join(dir, name);
      writeFileSync(f, "");
      if (process.platform !== "win32") chmodSync(f, 0o755);
      expect(which("tool", { PATH: dir, PATHEXT: ".CMD" })).toBe(f);
      expect(which("tool", { PATH: os.tmpdir(), PATHEXT: ".CMD" })).toBeUndefined();
      expect(which(f, {})).toBe(f);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
