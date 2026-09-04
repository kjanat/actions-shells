import pkg from '#pkg' with { type: 'json' };

/** Replaced at build time by scripts/build.ts from package.json. */
export const VERSION: string = process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER ?? `${pkg.version ?? '0.0.0'}-dev`;
