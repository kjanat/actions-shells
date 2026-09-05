const version: string = `${require('#pkg').version ?? '0.0.0'}-dev`;

/** Replaced at build time by scripts/build.ts from package.json. */
export const VERSION: string = process.env.ACTIONS_SHELL_VERSION_PLACEHOLDER ?? version;
