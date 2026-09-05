import pkg from '#pkg' with { type: 'json' };
import { spawnSync } from 'node:child_process';
import { defineConfig, type UserConfig } from 'tsdown';

const version = process.env.ACTIONS_SHELL_VERSION ?? pkg.version;
const commitSha = process.env.GITHUB_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const buildDate = new Date().toISOString();

const banner = `\
/**
  * actions-shells ${version}
  * @author ${pkg.author}
  * @license ${pkg.license}
  *
  * @gitRef ${commitSha}
  * @buildDate ${buildDate}
  *
  * @see ${pkg.repository}
  */`;

// cli.mjs and setup.mjs land in the repo root: they are git-ignored on master and are
// the only built files a release tag contains (see scripts/assemble-release.ts).
// Two builds, not one with two entries: rolldown would otherwise hoist shared code into a
// third chunk, and each output must be a single self-contained file.
const common = {
	outDir: '.',
	clean: false,
	format: 'esm',
	fixedExtension: true,
	platform: 'node',
	target: 'node24',
	dts: false,
	minify: false,
	// Standalone executables: bundle every dependency, and fail the build if an output
	// would still import any package at runtime.
	deps: { alwaysBundle: [/.*/], onlyBundle: false, onlyImport: [] },
	define: { 'process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER': JSON.stringify(version) },
	banner: { js: banner },
	hash: false,
} satisfies UserConfig;

export default defineConfig([
	{ ...common, entry: { cli: 'src/cli.ts' } },
	{ ...common, entry: { setup: 'src/setup.ts' } },
]);
