# Follow-ups

Open items at the end of the initial build (2026-08-15). Everything here was found by review
and deliberately deferred — none of it is unknown, and none of it blocks the code being
correct. Delete items as they land.

## Blocking a working deployment

- [ ] **Set the Vercel environment variables.** `PUBLIC_SANITY_PROJECT_ID=6203ycx6` and
      `PUBLIC_SANITY_DATASET=production`, on **Production, Preview and Development**. Every
      Vercel build currently fails without them: the Sanity integration initializes with
      `projectId: undefined` and throws. Missing them on Preview alone breaks every PR
      preview while production looks fine.
- [ ] **Wire the publish webhook.** Vercel → Settings → Git → Deploy Hooks → create
      `sanity-publish` on `main`; then sanity.io/manage → API → Webhooks → point at it,
      filtered to `_type in ["place", "page", "siteSettings"]`. Excluding `card` is
      deliberate: card→landmark links are read live by `/c/[id]` and need no rebuild.

## Unproven, not merely untested

The site has never rendered real content anywhere. Until a `place` is published, roughly a
third of the codebase has never executed: `getPlaceBySlug` against real data, `urlFor`,
`PortableText`, and the whole `/treks/[slug]` page.

- [ ] **Publish one `place` and one `siteSettings` in `/studio`**, then walk the full chain:
      seed a small deck with `scripts/seed-cards.ts`, attach card 1, scan `/c/1`.
- [ ] **Tighten the smoke test.** `e2e/smoke.spec.ts` currently accepts
      `'/' || startsWith('/treks/')`, which the empty-CMS state satisfies via the `'/'`
      branch. Once content exists, require `/treks/`. Add the spec §12 test that a landmark
      page renders title, body and image — the plan dropped it and nothing caught that until
      the final review.
- [ ] **Confirm the wa.me test stops reporting `skipped`.** It skips while no CTA renders,
      and cannot distinguish "not published yet" from "published but the CTA broke".
- [ ] **Check no published slug falls outside `^[a-z0-9-]+$`.** `resolveCardPath` now
      rejects non-matching slugs and routes home rather than risk a 500. A legitimately
      published place with an uppercase or non-ASCII slug would silently redirect home on
      every scan.

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

- [ ] **Content-Security-Policy, blocked on eight inline `style` attributes.** Astro 7's
      `security.csp` works and the Vercel adapter promotes it to a real header, but the
      homepage and `WhatsAppCta` set brand colours via inline `style` attributes, which CSP
      blocks — measured: the `h1` computes to `rgb(36, 48, 63)` instead of the brand
      `rgb(27, 58, 107)`, with a green build and no console error. `'unsafe-inline'` cannot
      fix it (CSP3 ignores it when hashes are present) and Astro rejects a hand-written
      `style-src-attr`. Move those eight attributes to classes/tokens in `global.css`, then
      enable `security: { csp: { directives: ["object-src 'none'", "base-uri 'self'"] } }`
      and `vercel({ staticHeaders: true })`. Verify `/studio` still loads — Sanity Studio is
      a React app and was never tested under a policy. See `docs/DECISIONS.md`, 2026-08-16.

## Process

- [ ] **A content guide for Aviv**, in Hebrew. The spec names "Aviv abandons the Studio" as the
      top human risk, and a Studio action can currently take production down (two places
      sharing a slug). One page: publish the place before attaching the card, never reuse a
      slug, what to do if a card leads home.
- [ ] **Deploy-failure alerting.** A failed build no longer means only "content is stale" — it
      means the live build may not contain landmarks that published cards point at.
