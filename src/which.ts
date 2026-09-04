import { accessSync, constants, statSync } from "node:fs";
import path from "node:path";

const isWindows = process.platform === "win32";

function isExecutableFile(p: string): boolean {
  try {
    if (!statSync(p).isFile()) return false;
    if (isWindows) return true;
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Locate `command` on PATH (honouring PATHEXT on Windows). Absolute/relative paths are checked directly. */
export function which(command: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const exts = isWindows ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean) : [""];
  const candidates = (name: string) =>
    isWindows && path.extname(name) !== "" ? [name] : exts.map((e) => name + e);

  if (command.includes("/") || (isWindows && command.includes("\\"))) {
    return candidates(path.resolve(command)).find(isExecutableFile);
  }

  const dirs = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const hit = candidates(path.join(dir, command)).find(isExecutableFile);
    if (hit) return hit;
  }
  return undefined;
}
