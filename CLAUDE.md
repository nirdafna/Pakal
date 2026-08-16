# Pakal — working rules

Hebrew RTL marketing and traveler-content site for **פק"ל**, a physical card game.
Astro 7 + Sanity + Tailwind 4, deployed on Vercel.

Read this before doing anything in this repo. It exists because the rules below were
broken during the initial build while living only in a global config and in one agent's
memory — a repo-local file is re-read by every session, which memory is not.

## The constraint everything else serves

**Physical playing cards are printed with QR codes pointing at `/c/<card-number>`.**
A printed URL can never be corrected. The person hitting a failure is standing outdoors on
mobile data holding a piece of cardboard — they cannot retry, clear a cache, or report a bug.

**A scan never dead-ends.** Unknown card number, card with no landmark attached, malformed
id, CMS unreachable — every path redirects to the homepage. Never a 404, never a 500.

Two consequences that look like over-engineering until you know why:

- `/c/[id]` **and** `/treks/[slug]` are both server-rendered while everything else is
  prerendered. A prerendered landmark page can be older than a live card redirect, which
  turns a valid scan into a 404. This was shipped as a bug once and caught in final review.
- `resolveCardPath` validates the slug before interpolating it. Sanity's slug rule is a
  Studio-side validator that raw API writes bypass, and a CR/LF slug makes `Astro.redirect`
  throw — a 500, which is the dead end the whole design forbids.

Full reasoning: `docs/superpowers/specs/2026-08-15-pakal-site-design.md` §7 and §11.

## Workflow gates

1. **Never commit directly to `main`.** Branches: `feature/`, `fix/`, `docs/`, `chore/`.
   Conventional commit messages. This includes docs and plan fixes — they were the
   exception that quietly became the rule last time.
2. **Quality gates run pre-PR, on the branch**, so CI runs once on reviewed code:
   simplify pass → code review → **security review whenever the diff touches a public
   endpoint** (`/c/[id]` is one) → then open the PR.
3. **Merge once CI is green.** Branch protection on `main` is the gate: `enforce_admins: true`
   with `changes`, `lint`, `typecheck` and `unit-tests` required. Nobody bypasses it, Nir
   included. `e2e` is deliberately not required — it runs post-merge and nightly, so requiring
   it would deadlock every PR. Report the review outcome with the PR URL either way.
   Until 2026-08-16 this rule read "Claude does not merge, Nir merges" and was enforced by a
   local hook. That was a drift guard, not a boundary: Claude runs with Nir's GitHub
   credentials, so no identity-based rule could tell them apart, and anything the hook checked
   for, Claude could type unprompted. Gating on green CI instead of on who is merging is the
   thing that actually holds. See `docs/DECISIONS.md`, 2026-08-16.
4. **Escalate, never self-authorize.** If a supply-chain or permission gate blocks
   something, report it. Never use `PKG_SECURITY_OVERRIDE`. When a package is blocked by
   the registry cooldown, pin to an older release that clears it — that pattern is already
   used for five packages here.
5. **No new dependencies without asking first**, including anything that only adds a line
   to `package.json`.

Rule 1 is enforced mechanically by `.claude/hooks/enforce-workflow.sh`, rule 3 by GitHub
branch protection. The rest depend on you actually following them.

## Code constraints

- **Hebrew is the only content language.** `<html lang="he" dir="rtl">` on every page.
- **CSS logical properties only** — `ms-*`/`me-*`/`ps-*`/`pe-*`, never `ml-*`/`mr-*`/`pl-*`/`pr-*`.
  Grep before committing.
- **URL path segments are ASCII.** Hebrew percent-encodes into unreadable noise when pasted
  into WhatsApp, which is how this audience shares links.
- **Page titles use a single-quoted attribute holding a literal `"`** — `title='פק"ל …'`.
  Never the `&quot;` entity: Astro passes attributes through as JS strings, so it renders
  literally in the browser tab. This shipped as a visible bug once.
- **Mixed-script text needs `bidi-isolate`.** `5 ק"מ` renders backwards without it.
- **`process.env` vs `import.meta.env` is per-file, by execution context.** `astro.config.mjs`
  runs only in Node and uses `loadEnv`. Anything bundled into browser code must use
  `import.meta.env` — Vite rewrites `process.env` to `{}` in client bundles, which once
  produced `projectId: undefined` with a green build and a 200 response.
- Astro 7's Rust compiler **errors** on invalid HTML instead of auto-correcting it.

## Do not "fix" these

- `void target;` in `src/pages/c/[id].astro` — a lint-tool workaround. Every alternative was
  measured and produces *more* diagnostics.
- `ASTRO_PREVIEW_BACKGROUND=1` in `playwright.config.ts` — without it Astro detaches
  `preview` when it detects an agent, and the test server dies. Verified against
  `astro@7.2.2` / `@astrojs/node@11.1.0`; re-check on an Astro bump.
- The `path-to-regexp` override in `package.json` — see `docs/DECISIONS.md` for the removal
  condition.

## Testing

`npm run lint && npm run typecheck && npm test && npm run test:e2e` must be green.
New feature → at least one happy-path test. Bug fix → a regression test that would have
caught it.

**A test that cannot fail is worse than no test.** One smoke test here passed for weeks by
looping over zero elements. Before writing one, state what would make it fail; if the answer
is "nothing, while the CMS is empty", make the gap visible with `test.skip` and a reason.

## Where things are

| | |
|---|---|
| Design spec | `docs/superpowers/specs/2026-08-15-pakal-site-design.md` |
| Decision log | `docs/DECISIONS.md` — append significant decisions, format in its header |
| Open follow-ups | `docs/FOLLOW-UPS.md` |
| Deployment | `docs/DEPLOYMENT.md` |
| Launch gates | `docs/LAUNCH-CHECKLIST.md` |
| Lessons | `.claude/lessons.md` |
