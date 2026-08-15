// Minimal ambient declaration for the Node.js `process` global.
//
// astro.config.mjs runs in Node (not the browser) and reads
// PUBLIC_SANITY_PROJECT_ID / PUBLIC_SANITY_DATASET via `process.env` and
// `process.cwd()` (through Vite's `loadEnv`). scripts/seed-cards.ts also runs
// only in Node (under tsx) and reads `process.argv`/calls `process.exit()`.
// This repo has no runtime dependency on Node's types otherwise, so rather
// than add `@types/node` as a new devDependency for a four-member shape,
// this file declares just what's used. `argv`/`exit` are Node-only APIs
// nobody would plausibly reach for in browser-bundled Astro/React code by
// mistake (unlike `env`, which is the actual documented trap — see
// astro.config.mjs), so widening this shim carries no silent-failure risk.
declare const process: {
  readonly env: Record<string, string | undefined>;
  readonly argv: string[];
  cwd(): string;
  exit(code?: number): never;
};
