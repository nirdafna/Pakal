# Launch checklist

Gates before the site goes live on its real domain.

## Security headers

- [x] **`vercel.json` headers are served.** Confirmed 2026-08-22 against production
      (`https://pakal-kappa.vercel.app/`): all five present — `x-content-type-options`,
      `referrer-policy`, `x-frame-options`, `permissions-policy`,
      `strict-transport-security`. The file is not inert. This could never be checked from a
      local build: `@astrojs/vercel` writes its own output with `headers: []` and Vercel
      applies `vercel.json` at the routing layer, so re-check with `curl -sI` after any
      change to that file rather than trusting a build.
- [x] **CSP reaches a real landmark page.** Confirmed 2026-08-22 on `/treks/ein-gedi`, a
      server-rendered route getting its policy from Astro's runtime rather than the adapter's
      static headers. It is also the one page rendering `mapUrl`, which is what CSP is there
      to neutralise. Previously verified only by reading the compiled server bundle, because
      no `place` existed to request.
- [ ] **Edit a document in `/studio` under CSP.** Still open. The Studio boots and renders
      under the policy, and its production origin is now registered with Sanity — but
      **authenticated** use (document editing, image upload, which may want `blob:` workers)
      has still not been exercised against the live policy. If it breaks, the fix is scoping
      the policy to exclude `/studio`; the public marketing pages are the attack surface that
      matters.
- [ ] **Revisit `Strict-Transport-Security: preload`** once the production domain is settled
      (spec §14). It is deliberately omitted today because preload submission is slow to undo.

## Content
- [ ] No placeholder artwork anywhere in production (spec §15).
- [ ] Real WhatsApp number set in `siteSettings.whatsappPhone`; every CTA opens the right
      chat.
- [ ] **Confirm the e2e run stops reporting `1 skipped`.** As of this writing the suite
      reports 5 passed, 1 skipped — the skip is `e2e/smoke.spec.ts`'s "every WhatsApp link is
      a valid wa.me URL" test, which skips itself while no CTA is rendered. It cannot tell
      "not published yet" from "published but the CTA template broke" — both produce zero
      links in the DOM. Once `whatsappPhone` is published, that test must show as *passed*;
      if it still skips, the CTA is not rendering and that is a bug.
- [ ] `how-to-play`, `corporate`, `faq` pages hold real copy, not fallback text.
- [ ] At least the launch set of landmark pages is published (Sanity `place` documents,
      served at `/treks/[slug]`).

## Cards and QR
- [ ] **Deck size confirmed and `scripts/seed-cards.ts` run for the full deck.** Ten cards
      were seeded 2026-08-22 as a proving batch; the real deck size is still unknown. The
      script is idempotent and additive, so re-running it with the true count is safe.
- [ ] Domain final and added in Vercel, DNS verified.
- [ ] A physical scan test: scan a printed card with two phones on mobile data.
- [x] **`/c/<n>` never dead-ends.** Verified live 2026-08-22 against production: `/c/1`
      (attached) → 302 `/treks/ein-gedi`; `/c/2` (seeded, unattached) → 302 `/`; `/c/99999`
      (out of deck range) → 302 `/`; `/c/abc` (malformed) → 302 `/`. No 404, no 500 on any
      path. Re-run these four after any change to `/c/[id]` or `resolveCardPath`.

## Platform
- [x] Repository imported into Vercel — project `pakal` under team `pakal`, production live
      at `https://pakal-kappa.vercel.app` serving current `main`.
- [ ] **`PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` on all three environments.**
      Set on **Production and Preview** (2026-08-15); **Development is still missing**. That
      last one affects `vercel dev` and `vercel env pull` only, not deployed builds — which
      is why builds have been green while this stayed unticked.
- [ ] Vercel plan appropriate for commercial use, on the account that will own the site.
- [x] Vercel deploy hook `sanity-publish` created and proven — triggering it manually
      produced a production deployment (2026-08-22, 12:47 UTC).
- [x] **Sanity webhook `vercel-rebuild` verified end to end** (2026-08-22). A Studio publish
      produces a production deployment, and the rebuilt site carries the new content to the
      prerendered pages.

      It did not work when first created: the rule was `{"on":["create"]}`, and publishing an
      edit to an existing document is an **update**, so no event ever matched and the attempt
      log stayed empty — Sanity never called out at all. Note the signature, because it reads
      like a delivery failure and sends you to check the URL: **empty attempts means no event
      matched; a bad URL produces attempts with a non-2xx `resultCode`.**

      Editing the existing webhook to add the missing triggers did not persist, twice.
      Recreating it did. Verify by reading `rule.on` at
      `https://api.sanity.io/v2021-10-04/hooks/projects/6203ycx6` rather than trusting the
      form, and confirm delivery at that hook id's `/attempts` — a healthy call returns
      `resultCode: 201` with a queued Vercel job.
- [ ] `Tests` workflow (`.github/workflows/test.yml`) green on `main`.
- [ ] `E2E Tests` workflow (`.github/workflows/e2e.yml`) green on `main`.

## Handoff to Aviv
- [ ] Walked him through publishing a landmark and attaching it to a card, live.
- [ ] He has his own Sanity login with Editor access.
