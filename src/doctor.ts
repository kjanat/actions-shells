import { spawnSync } from "node:child_process";
import { resolveCommand } from "./run.js";
import { planSpawn } from "./spawn-args.js";
import type { RuntimeAdapter } from "./types.js";

export type DoctorStatus = "ready" | "missing" | "version-check-failed";

export interface DoctorReport {
  runtime: string;
  command: string;
  resolved: string | undefined;
  input: string;
  extension: string;
  version: string | undefined;
  status: DoctorStatus;
}

export function describeInput(adapter: RuntimeAdapter): { input: string; extension: string } {
  if (adapter.input.kind === "stdin") return { input: "stdin", extension: "n/a" };
  return {
    input: adapter.input.extension ? `temporary ${adapter.input.extension} file` : "file",
    extension: adapter.input.extension ?? "none",
  };
}

export function doctor(
  adapter: RuntimeAdapter,
  env: NodeJS.ProcessEnv = process.env,
): DoctorReport {
  const { command, resolved, extraArgs } = resolveCommand(adapter, env);
  const { input, extension } = describeInput(adapter);
  const base = { runtime: adapter.name, command, resolved, input, extension };
  if (!resolved) return { ...base, version: undefined, status: "missing" };

  const plan = planSpawn(resolved, [...extraArgs, ...(adapter.versionArgs ?? ["--version"])]);
  const probe = spawnSync(plan.file, plan.args, {
    encoding: "utf8",
    env,
    timeout: 60_000,
    windowsHide: true,
    windowsVerbatimArguments: plan.windowsVerbatimArguments,
  });
  const text = `${probe.stdout ?? ""}\n${probe.stderr ?? ""}`.trim();
  const firstLine = text
    .split(/\r?\n/)
    .find((l) => l.trim() !== "")
    ?.trim();
  if (probe.status !== 0 || !firstLine) {
    return { ...base, version: firstLine, status: "version-check-failed" };
  }
  return { ...base, version: firstLine, status: "ready" };
}

export function formatReport(r: DoctorReport): string {
  const rows: Array<[string, string]> = [
    ["runtime", r.runtime],
    ["command", r.resolved ?? `${r.command} (not found on PATH)`],
    ["input", r.input],
    ["extension required", r.extension],
    ["version", r.version ?? "unknown"],
    ["status", r.status],
  ];
  const width = Math.max(...rows.map(([k]) => k.length)) + 1;
  return rows.map(([k, v]) => `${`${k}:`.padEnd(width + 1)}${v}`).join("\n");
}
