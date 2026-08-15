import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4321' },
  // Tests run against a production build, not the dev server: prerendering and
  // the static/server split only exist in a real build, and that split is
  // exactly what the /c/[id] tests below are checking.
  webServer: {
    // E2E=1 must be set on both halves: astro.config.mjs reads it at
    // config-load time to pick @astrojs/node (which supports `astro
    // preview`) instead of the production @astrojs/vercel adapter. A build
    // without it produces a Vercel bundle that preview then refuses to serve.
    //
    // ASTRO_PREVIEW_BACKGROUND=1 stops Astro from auto-detaching `preview`
    // into a background process when it detects an agentic CLI environment
    // (e.g. Claude Code). Playwright needs the command to stay in the
    // foreground so it can manage the process's lifecycle itself; this is a
    // no-op outside such environments (plain terminals, CI).
    //
    // This is an internal Astro marker, not a documented public flag, so a
    // future Astro version could rename or reinterpret it silently. Verified
    // against astro@7.2.2 and @astrojs/node@11.1.0 — re-check this behavior
    // when bumping either.
    command: 'E2E=1 npm run build && E2E=1 ASTRO_PREVIEW_BACKGROUND=1 npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
