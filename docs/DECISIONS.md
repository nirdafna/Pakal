# Architecture & Design Decisions

An **append-only** log of significant architecture/design decisions for `Pakal` — the "why"
behind choices that aren't obvious from reading the code. Not a changelog: it describes
*why* the current state is what it is, so a later contributor doesn't re-litigate a settled
question or revert a decision without knowing what it cost to make.

**Format:**

```
## YYYY-MM-DD — <decision>

One paragraph: what was decided and why.

**Alternatives rejected:** what else was considered, and why it lost.
```

**When to add an entry:** any decision with lasting architectural weight — a technology
choice, a workflow/process change, a URL or data-contract commitment. Routine feature work
does not need an entry.

Entries below are ordered chronologically (oldest first). New entries append at the end.

---

## 2026-08-15 — Astro + Sanity for a Hebrew, content-driven marketing site

The site is content pages with essentially no client interactivity, and its most demanding
reader is a traveler scanning a QR code at a trailhead on weak mobile data. Astro ships
close to zero JavaScript by default, which serves that reader directly. Sanity supplies a
browser-based CMS with an embedded Studio at `/studio`, so Aviv — the non-technical product
owner — can publish landmark content himself, and its image CDN handles the photo-heavy
content without a hand-built pipeline.

**Alternatives rejected:** *Next.js* — the familiar choice, and workable, but nothing on
this site needs client-side React, so it would ship a heavier baseline for no benefit.
*Keystatic/Decap (git-based CMS)* — keeps content in the repo and adds no external service,
which fits this project's bias toward fewer dependencies, but it authenticates editors
through GitHub; requiring Aviv to hold a GitHub account and understand commits fails the
core requirement. *A custom admin over Supabase* — auth, CRUD screens, image handling and a
rich-text editor would together exceed the size of the site itself, to rebuild a solved
problem.

## 2026-08-15 — Printed QR codes point at `/c/<card-number>`, which redirects

Each card's QR encodes a permanent, minimal URL containing only the card number. That URL is
served by the site's single server-rendered route, which looks the card up in the CMS and
redirects (302) to the landmark page, or to the homepage when no content is attached yet.
A URL printed on a card can never be corrected, so the printed form must never encode
anything that might change: not a landmark name, not a slug. The indirection lets the full
deck go to print before the content exists, lets landmarks be renamed freely afterwards, and
guarantees that a scan never reaches a 404. The route is server-rendered rather than
prerendered so that attaching content to a card takes effect immediately, with no rebuild —
a stale redirect here is a broken card in a stranger's hand. Short URLs also produce sparser
QR codes, which scan more reliably in poor light.

**Alternatives rejected:** *Printing the landmark slug directly* — shorter code path, no
redirect, but it freezes every landmark's name at print time and 404s for any card whose
page isn't written yet. *Prerendering `/c/<id>`* — cheaper to serve, but new content would
not resolve until the next deploy.

## 2026-08-15 — Deploy via Vercel's Git integration, not Vercel CLI in CI

Vercel builds every push natively: preview deployments for pull requests, production for
`main`. GitHub Actions is left to run only quality gates (lint, typecheck, tests). This
project has no database and therefore nothing that must run before a deploy, so
CI-orchestrated deploys would add `VERCEL_TOKEN`/org/project secret management purely to
reproduce platform behavior.

**Alternatives rejected:** *Porting Edut-app's `deploy.yml`* — that workflow exists there
because Supabase migrations must be pushed before the app deploys. Pakal has no such
ordering constraint, so the same machinery would be cost without benefit.
