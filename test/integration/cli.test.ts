/**
 * End-to-end tests against the built cli.js, using whatever runtimes exist on this
 * machine. Missing runtimes are skipped, not failed — CI installs the full set.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRuntime } from "../../src/registry.js";
import { resolveCommand } from "../../src/run.js";

const CLI = path.resolve(__dirname, "../../cli.js");

interface Case {
  runtime: string;
  source: string;
  stdout: string;
  exit: number;
}

const cases: Case[] = [
  {
    runtime: "node",
    source: 'console.log("ok node"); process.exit(3)',
    stdout: "ok node",
    exit: 3,
  },
  {
    runtime: "deno",
    source: 'const x: number = 1; console.log("ok deno", x); Deno.exit(4)',
    stdout: "ok deno 1",
    exit: 4,
  },
  {
    runtime: "bun",
    source: 'const x: number = 2; console.log("ok bun", x); process.exit(5)',
    stdout: "ok bun 2",
    exit: 5,
  },
  {
    runtime: "rust-script",
    source: 'println!("ok rust-script");\nstd::process::exit(6);',
    stdout: "ok rust-script",
    exit: 6,
  },
  { runtime: "rust", source: 'println!("ok rust alias");', stdout: "ok rust alias", exit: 0 },
  {
    runtime: "rust-script",
    source:
      '//! ```cargo\n//! [dependencies]\n//! serde_json = "1"\n//! ```\nlet v: serde_json::Value = serde_json::from_str(r#"{"hello":"world"}"#).unwrap();\nprintln!("ok {}", v["hello"]);',
    stdout: 'ok "world"',
    exit: 0,
  },
  {
    runtime: "cargo-script",
    source: 'fn main() { println!("ok cargo-script"); std::process::exit(8); }',
    stdout: "ok cargo-script",
    exit: 8,
  },
  {
    runtime: "go",
    source: 'package main\nimport ("fmt";"os")\nfunc main() { fmt.Println("ok go"); os.Exit(9) }',
    stdout: "ok go",
    exit: 9,
  },
  {
    runtime: "kotlin",
    source: 'println("ok kotlin")\nkotlin.system.exitProcess(10)',
    stdout: "ok kotlin",
    exit: 10,
  },
  {
    runtime: "swift",
    source: 'import Foundation\nprint("ok swift")\nexit(11)',
    stdout: "ok swift",
    exit: 11,
  },
  {
    runtime: "csharp",
    source: 'Console.WriteLine("ok csharp");\nreturn 12;',
    stdout: "ok csharp",
    exit: 12,
  },
  { runtime: "fsharp", source: 'printfn "ok fsharp"\nexit 13', stdout: "ok fsharp", exit: 13 },
  {
    runtime: "python",
    source: 'import sys\nprint("ok python")\nsys.exit(14)',
    stdout: "ok python",
    exit: 14,
  },
  { runtime: "ruby", source: 'puts "ok ruby"\nexit 15', stdout: "ok ruby", exit: 15 },
  { runtime: "perl", source: 'print "ok perl\\n"; exit 16;', stdout: "ok perl", exit: 16 },
  { runtime: "php", source: '<?php echo "ok php\\n"; exit(17);', stdout: "ok php", exit: 17 },
  { runtime: "lua", source: 'print("ok lua") os.exit(18)', stdout: "ok lua", exit: 18 },
  { runtime: "julia", source: 'println("ok julia"); exit(19)', stdout: "ok julia", exit: 19 },
  { runtime: "r", source: 'cat("ok r\\n"); quit(status = 20)', stdout: "ok r", exit: 20 },
];

function available(runtime: string): boolean {
  const a = resolveRuntime(runtime);
  if (!a) return false;
  if (a.name === "cargo-script") {
    const probe = spawnSync("cargo", ["+nightly", "--version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (probe.status !== 0) return false;
  }
  return resolveCommand(a).resolved !== undefined;
}

let dir: string;
beforeAll(() => {
  if (!existsSync(CLI)) throw new Error(`build first: ${CLI} is missing (pnpm build)`);
  dir = mkdtempSync(path.join(os.tmpdir(), "actions-shell-e2e-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

function runCli(args: string[], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
    windowsHide: true,
    timeout: 600_000,
  });
}

describe("actions-shell <runtime> <file>", () => {
  for (const [i, c] of cases.entries()) {
    const ok = available(c.runtime);
    it.skipIf(!ok)(`${c.runtime}: prints and exits ${c.exit}`, () => {
      // GitHub hands us an extensionless temp file; mimic that.
      const f = path.join(dir, `step-${i}`);
      writeFileSync(f, c.source);
      const r = runCli([c.runtime, f]);
      expect(r.stdout.trim().split(/\r?\n/).at(-1), r.stderr).toBe(c.stdout);
      expect(r.status).toBe(c.exit);
      // no leftovers next to the temp file
      const leftovers = [
        "",
        ".ts",
        ".rs",
        ".go",
        ".go.bin",
        ".go.exe",
        ".main.kts",
        ".swift",
        ".cs",
        ".fsx",
      ]
        .map((e) => f + e)
        .filter((p) => p !== f && existsSync(p));
      expect(leftovers).toEqual([]);
    });
  }

  it("keeps the normalised file with ACTIONS_SHELL_KEEP=1", () => {
    if (!available("bun")) return;
    const f = path.join(dir, "keep");
    writeFileSync(f, "console.log(1)");
    runCli(["bun", f], { ACTIONS_SHELL_KEEP: "1" });
    expect(existsSync(`${f}.ts`)).toBe(true);
  });

  it("passes runtime args placed before the file", () => {
    const f = path.join(dir, "args");
    writeFileSync(f, "console.log(process.execArgv.join(','))");
    const r = runCli(["node", "--no-warnings", "--", f]);
    expect(r.stdout.trim()).toBe("--no-warnings");
    expect(r.status).toBe(0);
  });

  it("fails clearly for unknown and missing runtimes", () => {
    expect(runCli(["klingon", "x"]).status).toBe(2);
    const r = runCli(["julia", "x"], { PATH: "" });
    expect(r.status).toBe(127);
    expect(r.stderr).toContain("julia");
    expect(r.stderr).toContain("doctor");
  });
});

describe("introspection", () => {
  it("list / describe / doctor / version", () => {
    expect(runCli(["list"]).stdout).toContain("rust-script");
    expect(runCli(["describe", "rust"]).stdout).toContain("runtime:            rust-script");
    expect(runCli(["--version"]).stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    const d = runCli(["doctor"]);
    expect(d.status).toBe(0);
    expect(d.stdout).toMatch(/\d+\/\d+ runtimes ready/);
    expect(runCli(["doctor", "node"]).status).toBe(0);
    expect(runCli(["doctor", "julia"], { PATH: "" }).status).toBe(1);
  });
});
