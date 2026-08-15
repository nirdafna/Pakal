// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
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

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel(),
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
