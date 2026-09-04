import { readFileSync } from "node:fs";
import { build } from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = process.env.ACTIONS_SHELL_VERSION ?? pkg.version;

const common = {
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  legalComments: "none",
  logLevel: "info",
  minify: true,
  define: { "process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER": JSON.stringify(version) },
  banner: { js: `// actions-shells ${version} — https://github.com/kjanat/actions-shells` },
};

await build({
  ...common,
  entryPoints: ["src/cli.ts"],
  outfile: "cli.js",
  banner: { js: `#!/usr/bin/env node\n${common.banner.js}` },
});
await build({ ...common, entryPoints: ["src/setup.ts"], outfile: "setup.js" });
