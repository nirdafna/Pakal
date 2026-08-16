# Launch checklist

Gates before the site goes live on its real domain.

## Security headers

- [ ] **Confirm the `vercel.json` headers are actually served.** They cannot be verified by a
      local build: `@astrojs/vercel` writes its own build output with `headers: []`, and
      Vercel applies `vercel.json` at the platform routing layer instead. On the first real
      preview deploy run
      `curl -sI https://<preview-url>/ | grep -iE 'x-content-type|referrer-policy|x-frame|permissions-policy|strict-transport'`
      and confirm all five are present. If they are missing, the file is inert and the fix is
      the adapter's own header mechanism, not a bigger `vercel.json`.
- [ ] **Confirm CSP reaches a real landmark page.** `/treks/[slug]` is server-rendered, so it
      gets the policy from Astro's runtime rather than from the adapter's static headers. That
      path was verified only by reading the compiled server bundle (`renderCspContent` is wired
      to `content-security-policy`), never by an actual request — no `place` document was
      published to hit. It is also the one page that renders `mapUrl`, which is the link CSP is
      there to neutralise. Once a landmark is published:
      `curl -s https://<url>/treks/<slug> | grep -i content-security-policy`.
- [ ] **Open `/studio` on a preview deploy and edit a document.** CSP is enforced there as a
      real response header. Verified locally: the Studio's React app boots and renders under
      the policy with no violations — but only its unconnected "add a CORS origin" screen,
      because localhost is not a registered origin. Authenticated use (document editing, image
      upload, which may want `blob:` workers) has NOT been exercised under CSP. If it breaks,
      the fix is scoping the policy to exclude `/studio`; the public marketing pages are the
      attack surface that matters.
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
- [ ] Deck size confirmed and `scripts/seed-cards.ts` run for the full deck (never run as of
      this writing — deck size still unknown).
- [ ] Domain final and added in Vercel, DNS verified.
- [ ] A physical scan test: scan a printed card with two phones on mobile data.
- [ ] `/c/<n>` for an unlinked card lands on the homepage, not an error.

## Platform
- [x] Repository imported into Vercel — project `pakal` under team `pakal` (confirmed live
      while writing this checklist: the Vercel GitHub integration is active and attempts a
      preview build on every PR).
- [ ] `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` set on all three Vercel
      environments. **Not yet done** — confirmed live while writing this checklist, every
      Vercel preview build currently fails for exactly this reason.
- [ ] Vercel plan appropriate for commercial use, on the account that will own the site.
- [ ] Vercel deploy hook `sanity-publish` and Sanity webhook `vercel-rebuild` created (not
      yet done as of this writing — see `docs/DEPLOYMENT.md`).
- [ ] Sanity webhook `vercel-rebuild` verified: publish a content edit, confirm a rebuild.
- [ ] `Tests` workflow (`.github/workflows/test.yml`) green on `main`.
- [ ] `E2E Tests` workflow (`.github/workflows/e2e.yml`) green on `main`.

## Handoff to Aviv
- [ ] Walked him through publishing a landmark and attaching it to a card, live.
- [ ] He has his own Sanity login with Editor access.
