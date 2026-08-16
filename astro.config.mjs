// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import { loadEnv } from 'vite';

// astro.config runs in Node before Astro's env is available, so `import.meta.env`
// does NOT carry custom vars here. loadEnv is the supported way to read them.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

// @astrojs/vercel has no previewEntrypoint, so `astro preview` can't serve a
// server build made with it. E2E builds swap in @astrojs/node (which does
// support preview) via E2E=1; production keeps the real Vercel adapter.
const useNodeAdapter = process.env.E2E === '1';

// https://astro.build/config
export default defineConfig({
  // Placeholder production URL: the real domain is a deferred decision (see
  // §14 of the design spec) and must be updated here once it's connected —
  // needed to build absolute canonical/og:url links for WhatsApp sharing.
  site: 'https://pakal.vercel.app',

  vite: {
    plugins: [tailwindcss()]
  },

  // Astro hashes its own inline scripts and styles and emits `script-src` /
  // `style-src` from them. `script-src 'self' <hashes>` is the directive that
  // matters here: it blocks `javascript:` URL navigation outright, so a bad
  // link reaching an `href` is inert even if the validation in `src/lib/urls.ts`
  // ever lets one through. Two locks, not one.
  //
  // No `default-src`: it would also govern `img-src` and `connect-src`, and
  // images come from `cdn.sanity.io` while the Studio talks to `*.sanity.io`.
  // Adding it without enumerating those would break both. `object-src` and
  // `base-uri` are safe to pin because nothing here uses either.
  //
  // This only works because no inline `style` attributes remain — see
  // `src/styles/global.css`. Reintroducing one silently drops it in the
  // browser; `e2e/smoke.spec.ts` guards that.
  security: {
    csp: {
      directives: ["object-src 'none'", "base-uri 'self'"],
    },
  },

  // `staticHeaders` promotes the policy from a `<meta>` element to a real
  // response header on prerendered routes. A header is enforced before any
  // markup parses, and covers directives a meta tag cannot express.
  adapter: useNodeAdapter ? node({ mode: 'standalone' }) : vercel({ staticHeaders: true }),
  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      // false: the CDN serves cached responses, and /c/[id] must reflect a
      // just-published card immediately. Also required for correct static builds.
      useCdn: false,
      apiVersion: '2026-08-15',
      studioBasePath: '/studio',
    }),
    react(),
  ]
});
