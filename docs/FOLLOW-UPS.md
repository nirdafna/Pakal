# Follow-ups

Open items at the end of the initial build (2026-08-15). Everything here was found by review
and deliberately deferred — none of it is unknown, and none of it blocks the code being
correct. Delete items as they land.

## Resolved 2026-08-22

- [x] **Vercel environment variables.** Already set on Production and Preview since
      2026-08-15 — the claim that every build was failing was stale. **Development is still
      missing**; see the launch checklist.
- [x] **Publish webhook wired.** Vercel deploy hook `sanity-publish` → Sanity webhook
      `vercel-rebuild`, filtered to `_type in ["place", "page", "siteSettings"]`. Excluding
      `card` is deliberate: card→landmark links are read live by `/c/[id]`.
- [x] **The unproven third of the codebase has now executed.** A `place` was published with
      an image and Portable Text body, attached to card 1, and requested against production:
      `getPlaceBySlug`, `urlFor`, `SanityImage` (srcset 1x/2x, `auto=format`), `PortableText`
      and the whole `/treks/[slug]` page all rendered. `safeExternalUrl` passed a real
      `mapUrl` through, and `5 ק"מ` rendered with `bidi-isolate`.
- [x] **The full printed-QR chain, live.** `/c/1` → `/treks/ein-gedi`, `/c/2` (unattached) →
      `/`, `/c/99999` → `/`, `/c/abc` → `/`. Details in the launch checklist.

      This also demonstrated the prerender/server-render split doing its job: immediately
      after publishing, `/c/1` and `/treks/ein-gedi` were correct while the prerendered
      homepage and `/treks` index still listed zero landmarks until a rebuild ran. The scan
      path — the one a stranger with a card hits — never went stale.

## Still open from the initial build

- [ ] **Tighten the smoke test.** `e2e/smoke.spec.ts` accepts `'/' || startsWith('/treks/')`,
      which the empty-CMS state satisfies via the `'/'` branch. Content now exists, so this
      can require `/treks/`. Add the spec §12 test that a landmark page renders title, body
      and image — the plan dropped it and nothing caught that until the final review.
- [ ] **Confirm the wa.me test stops reporting `skipped`.** Still skipping: no `siteSettings`
      document exists yet, so no CTA renders. It cannot distinguish "not published yet" from
      "published but the CTA broke".
- [ ] **Check no published slug falls outside `^[a-z0-9-]+$`.** `resolveCardPath` rejects
      non-matching slugs and routes home rather than risk a 500. A legitimately published
      place with an uppercase or non-ASCII slug would silently redirect home on every scan.

## Before the next print run — hard gates

- [ ] Domain final and connected. The URL printed on cards can never be corrected.
- [ ] Swap `site` in `astro.config.mjs` off the `pakal.vercel.app` placeholder; canonical and
      `og:url` currently point at the wrong host.
- [ ] Deck size confirmed and `scripts/seed-cards.ts` run for the full deck, so every printed
      `/c/<n>` resolves.
- [ ] Physical scan test with two phones on mobile data.

## Technical debt, ranked

- [ ] **`og:image`.** Links shared to WhatsApp — the spec's named sharing channel — render as
      text with no thumbnail. Needs artwork first.
- [ ] **Type `import.meta.env.PUBLIC_SANITY_*`.** An `ImportMetaEnv` augmentation would turn a
      missing variable into a compile-time error instead of `undefined` at runtime.
- [ ] **`scripts/seed-cards.ts` duplicates the `1000` bound** instead of importing
      `MAX_CARD_NUMBER` from `src/lib/cards/resolve.ts`. If one changes and the other does
      not, cards get seeded that the resolver rejects.
- [ ] **`node-globals.d.ts`** hand-declares Node's `process`; it will collide with
      `@types/node` if anything ever pulls that in. Delete it at that point.
- [ ] **`@types/react` / `@types/react-dom`** sit under `dependencies` rather than
      `devDependencies`. No runtime effect in a private package; batch with the next
      dependency change.
- [ ] **`useCdn: false`** means every scan is an uncached round-trip on the latency-critical
      path. Sanity's CDN purges on mutation, so `useCdn: true` may give the same freshness at
      lower latency. Measure before changing.
- [ ] **`--color-accent`** (the mockup's red card-suit accent) is defined in `global.css` and
      referenced nowhere. Either the accent did not survive implementation, or the token is
      dead — check the mockup before deleting.
- [ ] **The three content pages** (`how-to-play`, `corporate`, `faq`) are near-identical
      shells. Worth a shared component only if a fourth is added.

## Process

- [ ] **A content guide for Aviv**, in Hebrew. The spec names "Aviv abandons the Studio" as the
      top human risk, and a Studio action can currently take production down (two places
      sharing a slug). One page: publish the place before attaching the card, never reuse a
      slug, what to do if a card leads home.
- [ ] **Deploy-failure alerting.** A failed build no longer means only "content is stale" — it
      means the live build may not contain landmarks that published cards point at.
