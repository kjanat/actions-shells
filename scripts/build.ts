#!/usr/bin/env node
import pkg from '#pkg' with { type: 'json' };
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const version = process.env.ACTIONS_SHELL_VERSION ?? pkg.version;
const commitSha = process.env.GITHUB_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const buildDate = new Date().toISOString();

const common = {
	bundle: true,
	platform: 'node',
	target: 'node24',
	format: 'esm',
	legalComments: 'none',
	logLevel: 'info',
	minify: false,
	define: { 'process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER': JSON.stringify(version) },
	banner: {
		js: `\
/**
  * actions-shells ${version}
  * @author ${pkg.author}
  * @license ${pkg.license}
  *
  * @gitRef ${commitSha}
  * @buildDate ${buildDate}
  *
  * @see ${pkg.repository}
  */`,
	},
} satisfies import('esbuild').BuildOptions;

await Promise.allSettled([
	build({
		...common,
		entryPoints: ['src/cli.ts'],
		outfile: 'cli.js',
		banner: { js: `#!/usr/bin/env node\n${common.banner.js}` },
	}),
	build({
		...common,
		entryPoints: ['src/setup.ts'],
		outfile: 'setup.js',
	}),
]);
