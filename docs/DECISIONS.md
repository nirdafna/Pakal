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

## 2026-08-15 — Pin `path-to-regexp` to `^6.3.0` via an npm `overrides` entry

`@astrojs/vercel@11.0.5` depends on `@vercel/routing-utils@5.3.3`, which declares
`path-to-regexp` as an exact `6.1.0` — not a range — so `npm install` can never resolve it to
a newer, patched version on its own. `path-to-regexp@6.1.0` is inside the affected range
(`>=4.0.0 <6.3.0`) of a high-severity ReDoS advisory, because `path-to-regexp` outputs
backtracking regular expressions (GHSA-9wv6-86v2-598j, CVSS 7.5). `npm audit`'s own suggested
fix was to downgrade `@astrojs/vercel` to `8.0.4` — a major-version regression whose Astro 7
compatibility was never verified — so instead `package.json` carries
`"overrides": { "path-to-regexp": "^6.3.0" }`, which forces the same dependency-tree position
to resolve to the first patched `6.x` release instead. `6.1.0 → 6.3.0` is a minor bump within
the version `@vercel/routing-utils` already targets, so no API break is expected.

**Removal condition:** this override becomes unnecessary — and should be deleted — the day
`@astrojs/vercel` ships a version whose own dependency tree resolves `path-to-regexp` to
`>=6.3.0` (or migrates `@vercel/routing-utils` off it entirely) without help. Check
`npm ls path-to-regexp` after any `@astrojs/vercel` upgrade; if it now resolves to a patched
version on its own, remove the `overrides` block. Until then, if `@astrojs/vercel` ever moves
its own dependency to `path-to-regexp@8.x`, this override will silently force it back down to
`6.x` and can break routing in a way that is hard to trace back to this entry — so re-check
this line specifically whenever `@astrojs/vercel` is upgraded.

**Alternatives rejected:** *`npm audit fix --force`'s suggested downgrade to
`@astrojs/vercel@8.0.4`* — resolves the advisory too, but drops three major versions of the
adapter for unverified Astro 7 compatibility, trading a documented, narrow pin for an
undocumented, broad regression. *Leaving it unpatched* — the CVSS 7.5 ReDoS is real and the
package is a direct runtime dependency of the deploy adapter.

## 2026-08-16 — Security headers ship via `vercel.json`; CSP is deferred, not skipped

Baseline security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, `Strict-Transport-Security`) are declared in `vercel.json` rather than
in the Astro config or middleware. Most of this site is prerendered, and Astro middleware
does not run for static responses on Vercel, so a middleware approach would have covered only
`/c/[id]` and `/treks/[slug]` — the two routes, and left every marketing page bare.

`@astrojs/vercel@11.0.5` reads `vercel.json` only to compare `trailingSlash`, and writes its
own `.vercel/output/config.json` with `headers: []`. A probe header placed in `vercel.json`
therefore does **not** appear in the build output — verified locally. That is expected rather
than broken: Vercel applies `vercel.json` headers at the platform routing layer, which is the
same mechanism the adapter's own `staticHeaders` option targets. The consequence for us is
that **this file's effect cannot be verified by a local build** — it needs a deployed preview,
which is why a check for it was added to the launch checklist rather than a test.

`X-Frame-Options` is `SAMEORIGIN`, not `DENY`, because Sanity's Presentation tool frames the
site from inside `/studio` on the same origin. `Strict-Transport-Security` deliberately omits
`preload`: the production domain is still an open decision (spec §14), and preload submission
is slow to unwind if the domain changes.

Content-Security-Policy is **not** included, and the reason is measured rather than assumed.
Astro 7's `security.csp` generates per-page script/style hashes and the adapter promotes them
to real headers — it works, and the build emits a correct policy per route. But the homepage
sets brand colours through inline `style` attributes, and CSP blocks those: with CSP enabled
the `h1` computed to `rgb(36, 48, 63)` instead of the brand `rgb(27, 58, 107)`, silently, with
a green build and no console error. `'unsafe-inline'` does not rescue it, because CSP3 ignores
`'unsafe-inline'` whenever hashes are present, and Astro rejects a hand-written
`style-src-attr` in `security.csp.directives`, requiring per-attribute hashes instead. Making
CSP work therefore requires removing the eight inline `style` attributes first — real work,
tracked in `docs/FOLLOW-UPS.md`, and out of scope for a headers change.

**Alternatives rejected:** *Astro middleware with `middlewareMode: 'edge'`* — does cover
static responses, but puts an edge function invocation in front of every request on a
brochure site to set five constant headers. *Shipping CSP with `'unsafe-inline'` on
`style-src`* — would have appeared to work while being silently inert, the exact failure mode
this repo has already been bitten by twice.

## 2026-08-16 — The merge gate moved from a local hook to GitHub branch protection

`.claude/hooks/enforce-workflow.sh` used to deny `gh pr merge` outright, so every merge was
Nir's to run by hand. That is replaced by branch protection on `main`: `enforce_admins: true`,
no required reviews, and four required checks — `changes`, `lint`, `typecheck`, `unit-tests`.
Claude may now merge a green PR. This matches how `edut-app` already worked.

The reason is not convenience. The local hook could never have been more than a drift guard.
Claude runs `gh` with Nir's own credentials — same account, full `repo` scope — so no rule
that asks *who* is merging can tell the two apart, and any token or approval file the hook
checked for is something Claude could type unprompted. An earlier proposal here was a
`PKG`-style approval token in the command; it was rejected for exactly the laundering shape
this repo has already found elsewhere, where an approval generalises past what was approved.

`enforce_admins: true` sidesteps the identity problem entirely by gating on **green CI**
instead of on identity. Neither Nir nor Claude can merge red, and the shared account stops
mattering. Required reviews are deliberately left `null`: GitHub does not let an author
approve their own PR, so on a single-maintainer repo that setting deadlocks the maintainer
rather than constraining the agent.

`e2e` is not a required check. It runs post-merge and nightly by design (see
`.github/workflows/e2e.yml`), so requiring it would leave every PR waiting for a check that
never reports. Docs-only PRs are safe because the heavy jobs gate on a job-level `if:` over
the `changes` output rather than workflow-level `paths-ignore` — a skipped job still reports a
check, where an unrun workflow would hang the PR forever.

**Alternatives rejected:** *Keeping the hook and adding a `PAKAL_MERGE_APPROVED=1` token* —
Claude types the token, so the hook cannot distinguish "Nir asked" from "Claude decided",
which is the one distinction it exists to make. *Required approving reviews* — deadlocks a
solo maintainer, per above. *A separate GitHub credential for Claude without merge rights* —
the only true identity boundary available, and still the right answer if the CI gate ever
proves insufficient; rejected for now as setup cost out of proportion to the risk on a
brochure site.
