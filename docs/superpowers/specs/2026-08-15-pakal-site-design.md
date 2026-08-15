# פק"ל — Marketing & Traveler-Content Site — Design Spec

**Date:** 2026-08-15
**Status:** Approved (design), pending implementation plan
**Owner (product):** Aviv — creator of the פק"ל card game
**Owner (build):** Nir
**Repo:** https://github.com/nirdafna/Pakal
**Hosting scope:** Vercel team `Pakal` (Hobby plan at build time)

---

## 1. Context

Aviv is producing **פק"ל** ("נהנים בכל דרך"), a Hebrew family card game for travelers.
The physical deck plays like a standard deck (מלחמה, רמי, and the original פק"ל game) but
every card also carries an Israeli landmark or trek, and a **QR code on the card back**.

The site has two jobs:

1. **Promote the game** — explain what it is, show the artwork, drive contact/purchase.
2. **Serve travelers** — be the destination the printed QR codes point at: landmark and
   trek pages with practical information for the trip.

A design mockup for the homepage already exists (blue/red brand, card suits in the logo,
pin-in-the-ל wordmark, cream/sand ground, green primary CTA). Its navigation defines the
launch information architecture: דף הבית · המסלולים שבחפיסה · איך משחקים · לרכישה ·
מתנה לחברות · שאלות נפוצות.

### 1.1 What makes this project unusual

Two constraints drive nearly every decision below:

- **Printed QR codes are immutable.** A URL printed on a card cannot be corrected. Every
  routing decision must assume the URL outlives the site's current structure.
- **The reader is standing on a trail on mobile data.** Page weight and time-to-content
  matter more than on a typical marketing site.

---

## 2. Goals

- A fast, Hebrew-first (RTL) site that looks like the approved mockup.
- Aviv — non-technical — can add and edit landmark/trek content himself, in a browser,
  without involving Nir and without a GitHub account.
- Every QR scan resolves to a useful page, forever, including for cards whose content has
  not been written yet.
- Landmark pages can be renamed or restructured later without invalidating printed cards.
- A structure that can accept an English version later as a content task, not a rewrite.

## 3. Non-goals (v1) — explicitly not built

- E-commerce, checkout, payment. Purchase is a WhatsApp conversation.
- User accounts, login, or any authenticated area other than the CMS Studio.
- Contact forms of any kind (including the corporate-gift page).
- A map-based interface, or search/filter over the content catalog.
- An English version of the site.
- A blog.
- Any database of our own.

Each of these is cheap to add later on top of the chosen architecture. None is justified by
a launch requirement.

---

## 4. Users

| User | Need | How the design serves it |
|---|---|---|
| Prospective buyer (parent, on a phone) | Understand the game in ~10 seconds; contact Aviv | Hero with artwork + one green CTA to WhatsApp |
| Traveler holding a card at a trailhead | Get information about this landmark, fast, on weak mobile data | QR → short URL → prerendered, near-zero-JS landmark page |
| Corporate gift buyer | Understand bulk options and reach Aviv | `/corporate` page ending in a WhatsApp CTA |
| Aviv (content owner) | Add a landmark, attach it to a card, publish — alone | Sanity Studio at `/studio`, email login |
| Nir (maintainer) | Ship changes safely and infrequently | Small static codebase, CI gates, Vercel Git integration |

---

## 5. Stack

| Layer | Choice |
|---|---|
| Framework | **Astro** (current major; exact version pinned at implementation) |
| Rendering | Static prerender for all content pages; server-rendered for `/c/[id]` only |
| CMS | **Sanity** — Content Lake + Studio embedded in this app at `/studio` |
| Styling | **Tailwind CSS** using CSS logical properties throughout |
| Hosting | **Vercel**, native Git integration |
| Tests | **Vitest** (unit), **Playwright** (smoke) |

### 5.1 Why Astro

The site is content pages with almost no client interactivity. Astro ships close to zero
JavaScript by default, which directly serves the trailhead-on-4G reader. Vercel supports it
first-class, and its component/file-routing model is close enough to Next.js that the
learning cost for the maintainer is small.

**Rejected: Next.js.** It is the familiar option, and would work — but nothing in this site
needs client-side React, and it would ship a heavier baseline for no benefit.

### 5.2 Why Sanity

The hard requirement is that Aviv, who is not technical, edits content in a browser without
a GitHub account. Sanity's Studio can be embedded in our own app at `/studio` on the site's
own domain, with email login. Its image CDN (automatic resizing, WebP/AVIF) is meaningful
here, because the content is photo-heavy card artwork and landmark photography, and Aviv
will upload straight from a phone without optimizing anything.

**Rejected: git-based CMS (Keystatic/Decap).** Keeps content in the repo and adds no
external service — the option that best matches the project's general bias toward fewer
dependencies. It fails the actual requirement: it authenticates editors through GitHub, so
Aviv would need a GitHub account and a mental model of commits.

**Rejected: custom admin over Supabase or similar.** Auth, CRUD screens, an image pipeline
and a rich-text editor would each have to be built and maintained. That is more code than
the entire rest of the site, to reproduce a solved problem.

### 5.3 Deployment: Vercel Git integration, not CI-driven deploys

Vercel's native Git integration builds every push: previews for pull requests, production
for `main`. No deploy workflow, no `VERCEL_TOKEN` / org / project secrets to store or
rotate.

**Rejected: the Edut-app `deploy.yml` pattern** (Vercel CLI inside GitHub Actions). That
workflow exists in Edut-app because database migrations must run *before* the deploy. Pakal
has no database, so copying it would add secret management to reproduce what the platform
already does.

---

## 6. Routes

| Route | Rendering | Purpose |
|---|---|---|
| `/` | static | Hero, feature cards, CTAs (per mockup) |
| `/treks` | static | Index of published landmarks/treks |
| `/treks/[slug]` | static | A single landmark or trek |
| `/how-to-play` | static | איך משחקים — rules summary |
| `/corporate` | static | מתנה לחברות — bulk/gift info, WhatsApp CTA |
| `/faq` | static | שאלות נפוצות |
| `/c/[id]` | **server** | Card QR resolver — see §7 |
| `/studio` | client (Sanity Studio) | Aviv's editing environment |
| 404 | static | Hebrew not-found page linking home |

Path segments are ASCII (`/treks/ein-gedi`), never Hebrew. Hebrew paths become
percent-encoded and unreadable when links are pasted into WhatsApp — which is exactly how
this audience shares links. Hebrew lives in page content, titles, and meta tags.

Every transactional action (buy, corporate enquiry, general contact) is a `wa.me` deep link
carrying a prefilled Hebrew message. The phone number and message templates come from
`siteSettings` in the CMS, so Aviv can change the number without a code change.

---

## 7. The card → URL contract

**This is the most permanent decision in the project.** A QR code printed on a card cannot
be changed, so the URL it encodes must remain valid indefinitely.

### 7.1 Scheme

Every card gets a permanent short URL: `https://<domain>/c/<number>` — e.g. `/c/34`.

Nothing but the card number appears in it. Short URLs produce sparser QR codes, which scan
more reliably in poor light and at awkward angles — the real-world conditions for this
audience.

### 7.2 Resolution

`/c/[id]` is the site's only server-rendered route. On request it looks up the card in
Sanity and responds:

| Case | Response |
|---|---|
| Card exists, has a published landmark | Redirect (302) to `/treks/<slug>` |
| Card exists, no landmark attached yet | Redirect to `/` |
| Card id unknown | Redirect to `/` |
| Sanity unreachable or errors | Redirect to `/` |

It is deliberately server-rendered rather than prerendered: when Aviv attaches a landmark to
card 34, the QR must start working immediately, without waiting for a site rebuild. A stale
redirect here is a broken card in a stranger's hand.

A 302 (not 301) is used so browsers never cache the mapping permanently — the target is
expected to change as content is filled in.

### 7.3 Why the indirection

Cards and landmarks are separate documents, joined by a reference. That separation buys
three things:

- Landmarks can be renamed or re-slugged at any time; the card is unaffected.
- The full deck can be printed *before* the content exists. Cards resolve to the homepage
  until Aviv publishes their landmark — nothing ever 404s.
- Multiple cards can point at one landmark, or a card can be re-pointed, without a reprint.

### 7.4 Current print run

The deck currently in production encodes the **homepage** on every card, not `/c/<id>`.
That is compatible with this design and needs no action. The `/c/<id>` scheme applies from
the next print run onward, and its shape must be communicated to Aviv before that run is
sent to print.

---

## 8. Content model (Sanity)

### `card`
| Field | Type | Notes |
|---|---|---|
| `number` | number | 1..N, unique. The value printed in the QR URL |
| `label` | string | Human-readable card identity, e.g. "7 ♣" — for Aviv's orientation in the Studio |
| `place` | reference → `place` | Optional. Empty until content is written |

Seeded once for the whole deck, so every printed card has a document from day one.

### `place` (landmark or trek)
| Field | Type | Notes |
|---|---|---|
| `title` | string (Hebrew) | Display name |
| `slug` | slug (ASCII) | URL segment; editable without breaking cards |
| `kind` | string enum | `trek` \| `site` |
| `region` | string enum | Region grouping (גליל, נגב, …) — grouping only, no filter UI in v1 |
| `summary` | text | Short teaser for the index page and meta description |
| `body` | portable text | Main content: description, what to see, how to get there |
| `images` | image[] | With alt text; served through Sanity's image CDN |
| `lengthKm` / `durationHours` / `difficulty` / `season` | number/string | Practical trip facts; all optional |
| `mapUrl` | url | Link out to Google Maps — no embedded map in v1 |
| `tips` | text | Free-form practical notes |

Visibility is Sanity's own draft/published state — no separate `published` field. A place
appears in `/treks` and resolves from a card only once Aviv presses Publish. Adding a
second, hand-managed flag on top of that would produce two sources of truth and a
predictable class of "I published it but it isn't live" confusion.

### `page`
Editable copy for `/how-to-play`, `/corporate`, `/faq`, keyed by a fixed slug, so Aviv can
revise wording without a deploy.

### `siteSettings` (singleton)
WhatsApp number, prefilled message templates, social links, hero copy, hero images.

### i18n readiness
Only Hebrew content exists in v1, and no locale routing is built. Text lives in CMS fields
rather than hardcoded in components, so adding an English version later is a matter of
introducing localized fields and a locale segment — not rewriting the site.

---

## 9. Hebrew, RTL, typography

- `<html lang="he" dir="rtl">` globally.
- **CSS logical properties everywhere** (`margin-inline-start`, `padding-inline`,
  `inset-inline-end`) — never `left`/`right`. This is what makes a future LTR version a
  configuration change rather than a restyle.
- Hebrew webfont (Assistant or Heebo) **self-hosted and subset**, not loaded from Google
  Fonts: a third-party font request is a blocking round-trip on weak mobile data, which is
  the exact condition of the QR-scanning reader.
- Numbers, ASCII slugs, and Latin brand names inside Hebrew text need bidi-safe rendering;
  components that mix scripts get explicit isolation.

---

## 10. Visual design

Derived from the approved mockup:

- **Palette:** deep navy blue (primary/brand), red accent (card suits), green (primary CTA),
  cream/sand page ground, photographic hero.
- **Logo:** פק"ל wordmark with card suits and a location pin replacing part of the ל, with
  the tagline נהנים בכל דרך.
- **Homepage structure:** hero (wordmark, one-paragraph pitch, green לרכישת המשחק CTA +
  outlined למסלולים שבחפיסה CTA, איך משחקים link) → four feature cards (סרקו וצאו לדרך ·
  מטיילים באמת · משחק פק"ל המקורי · משחקים מוכרים) → treks teaser → footer.
- **Trust marker:** "מיוצר ומפותח בישראל" in the header, per the mockup.

Real artwork is pending from Aviv (§13). Implementation proceeds with placeholder imagery
of the correct dimensions and aspect ratios; swapping in the real assets is a content task.

---

## 11. Failure behavior

**The hard rule: a QR scan never dead-ends.** Every failure path in §7.2 lands the reader on
the homepage rather than an error, because that failure is experienced by a stranger holding
a printed card who cannot be told to try something else.

Elsewhere:

- Unknown route → Hebrew 404 with a link home.
- Sanity unreachable *at build time* → the build fails loudly. A silent build producing an
  empty site is worse than no deploy.
- Sanity unreachable *at request time* (only `/c/[id]` reads at request time) → redirect
  home.
- Missing images → alt text renders; layout does not collapse.

---

## 12. Testing

Proportionate to the risk, not ceremonial:

**Unit (Vitest)**
- The card → URL resolver, as a pure function over card data: published landmark, card
  without landmark, unknown id, malformed id. This is the highest-stakes logic in the
  project — it is what printed cards depend on.

**Smoke (Playwright)**
- Homepage renders with `dir="rtl"` on `<html>`.
- `/c/<id>` for a seeded card redirects to its landmark page.
- `/c/999999` redirects to the homepage.
- A landmark page renders title, body, and image.
- The WhatsApp CTA href is a valid `wa.me` link with the configured number.

Per repo convention: every new feature ships at least one happy-path test; every bug fix
ships a regression test that would have caught it.

---

## 13. Repo, CI, and workflow

Adopted from Edut-app, adapted to a site with no database. `CODEOWNERS` and the
code-owner gate are explicitly excluded (single maintainer).

| Artifact | Decision |
|---|---|
| `test.yml` | Adopted, including the `changes` docs-detector job. Detection uses a **job-level `if:`**, not workflow `paths-ignore` — a job skipped by `if:` reports success and satisfies a required check, whereas a workflow skipped by a path filter leaves the check pending forever and blocks the merge. Jobs: lint, typecheck, unit tests |
| `e2e.yml` | Adopted in shape: Playwright on push to `main`, nightly, and manual dispatch — **not** per-PR. `timeout-minutes` set, because GitHub's default ceiling is 6 hours and a hung job bills every minute |
| `deploy.yml` | **Not adopted** — see §5.3 |
| `pull_request_template.md` | Adopted, trimmed to: what & why; pre-merge gates run; no leftover debug code |
| Branch protection on `main` | Adopted: no deletion, no force-push, PR required, 0 required approvals (solo maintainer) |
| Supabase-specific workflows | Not applicable |
| `ruleset-drift.yml` | Not adopted in v1 |
| `.claude/` | `lessons.md`, `settings.json`, and the package supply-chain check hook |
| `docs/` | `DECISIONS.md` from day one; `DEPLOYMENT.md` once Vercel and Sanity are wired |

Workflow: feature branches (`feature/`, `fix/`, `docs/`), conventional commits, never
committing directly to `main` after the initial scaffold. Quality gates (simplify pass, code
review) run pre-PR on the branch so CI runs once on already-reviewed code.

---

## 14. Deferred decisions

Deferred deliberately. None blocks implementation; each has an owner and a real deadline.

| Item | Owner | Blocks | Needed by |
|---|---|---|---|
| Domain name and registrar access | Aviv | Production domain, and the URL encoded in QR codes | **Before the next print run** — hard deadline |
| Deck size (how many cards carry a QR) | Aviv | Seeding the `card` documents | Before content seeding |
| WhatsApp business number | Aviv | Every CTA on the site | Before launch |
| Artwork, photography, final copy | Aviv | Replacing placeholders | Before launch |
| Vercel Pro upgrade / account handoff | Nir + Aviv | Commercial use of the live site; adding Aviv as a member | At launch |
| Per-card QR URLs on the printed cards | Aviv + printer | Nothing in the build — the scheme is ready and inert until used | Next print run |

**Note on Vercel Hobby:** the Hobby plan is restricted to non-commercial use, and does not
support team members. Building and previewing on it is fine; a live commercial site should
be on the account that will own it long-term, on a paid plan.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| A print run goes out with wrong or unresolvable URLs | §7 makes every `/c/<id>` resolvable before content exists; the domain must be final before printing, and this is called out as a hard deadline in §14 |
| Aviv finds the Studio too complex and stops publishing | Keep the schema small, label fields in a way that maps to how he thinks about content, mark only genuinely required fields, and walk him through publishing once, live |
| Content volume grows past what an unfiltered index can carry | `/treks` is a plain list in v1; `region` and `kind` are already captured on every document, so adding filtering later is UI work with no data migration |
| Sanity's free tier limits, or a pricing change | Content is exportable via Sanity's CLI; the site reads through a thin data layer, so the CMS is replaceable without touching page components |
| Placeholder artwork ships to production | Launch checklist gate: no placeholder assets in a production deploy |
