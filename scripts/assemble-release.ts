#!/usr/bin/env node
/**
 * Assemble the exact tree that a release tag contains:
 *   README.md  LICENSE  action.yml  cli.mjs  setup.mjs
 * Nothing else. Tags are orphan commits of this directory (see .github/workflows/release.yml).
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.dirname(url.fileURLToPath(import.meta.resolve('#pkg')));
const out = process.argv[2] ? path.resolve(process.argv[2]) : path.join(root, 'release');
const files = ['README.md', 'LICENSE', 'action.yml', 'cli.mjs', 'setup.mjs'];

for (const f of files) {
	if (!existsSync(path.join(root, f))) {
		console.error(`missing ${f} — run \`pnpm build\` first`);
		process.exit(1);
	}
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of files) copyFileSync(path.join(root, f), path.join(out, f));

const listed = readdirSync(out).sort();
if (listed.join(',') !== [...files].sort().join(',')) {
	console.error(`unexpected release contents: ${listed.join(', ')}`);
	process.exit(1);
}
for (const f of listed) {
	console.log(`${String(statSync(path.join(out, f)).size).padStart(8)}  ${f}`);
}
console.log(`
assembled ${out}`);
