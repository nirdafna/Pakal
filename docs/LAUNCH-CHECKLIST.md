# Launch checklist

Gates before the site goes live on its real domain.

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
