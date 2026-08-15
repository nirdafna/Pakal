// Minimal ambient declaration for the Node.js `process` global.
//
// astro.config.mjs and sanity.config.ts run in Node (not the browser) and read
// PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET via `process.env` and
// `process.cwd()`. This repo has no runtime dependency on Node's types
// otherwise, so rather than add `@types/node` as a new devDependency for a
// two-member shape, this file declares just what's used.
declare const process: {
  readonly env: Record<string, string | undefined>;
  cwd(): string;
};
