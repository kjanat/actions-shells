import { spawnSync } from 'node:child_process';
import { defineConfig } from 'tsdown';
import pkg from '#pkg' with { type: 'json' };

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
// Two separate configs so each entry is one self-contained file with no shared chunks.
const standalone = (name: string, entry: string) => ({
	entry: { [name]: entry },
	outDir: '.',
	clean: false,
	format: 'esm',
	fixedExtension: true,
	platform: 'node',
	target: 'node24',
	dts: false,
	minify: false,
	// Standalone executables: bundle every dependency, nothing is installed at runtime.
	deps: { alwaysBundle: [/.*/] },
	define: { 'process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER': JSON.stringify(version) },
	banner: { js: banner },
	outputOptions: { entryFileNames: '[name].mjs' },
	hash: false,
});

export default defineConfig([
	standalone('cli', 'src/cli.ts'),
	standalone('setup', 'src/setup.ts'),
]);
