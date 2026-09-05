import pkg from '#pkg' with { type: 'json' };
import { packageRepositoryUrl } from 'dreamcli';
import { spawnSync } from 'node:child_process';
import { env } from 'node:process';
import { defineConfig } from 'tsdown';

const version = env.ACTIONS_SHELL_VERSION ?? pkg.version;
const commitSha = env.GITHUB_SHA ?? spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
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
  * @see ${packageRepositoryUrl(pkg)}
  */`;

const common = {
	outDir: import.meta.dirname,
	clean: false,
	define: { 'process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER': JSON.stringify(version) },
	banner: { js: banner },
	minify: true,
} satisfies import('tsdown').UserConfig;

export default defineConfig([
	{ ...common, entry: { cli: 'src/cli.ts' } },
	{ ...common, entry: { setup: 'src/setup.ts' } },
]);
