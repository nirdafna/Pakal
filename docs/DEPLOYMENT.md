# Deployment

## How a change reaches production

- **Code:** push to a branch → PR → CI (`Tests` workflow: lint, typecheck, unit tests) →
  merge to `main` → Vercel builds and deploys automatically via its Git integration. Every
  PR also gets a preview deployment.
- **Content:** Aviv publishes in `/studio` → a Sanity webhook calls the Vercel deploy hook
  `sanity-publish` → the site rebuilds. Card-to-landmark links are the exception: `/c/[id]`
  reads them live, so they take effect immediately without a rebuild.

A docs-only PR (touching only `docs/`, `.claude/`, or root `*.md` files) skips the heavy
`lint`/`typecheck`/`unit-tests` jobs — a job-level `if:` in `.github/workflows/test.yml`
reports them as passed rather than leaving the required check stuck pending, so a docs PR
can still merge.

The end-to-end suite (`.github/workflows/e2e.yml`) is not a pre-merge gate: it runs after a
push to `main`, nightly at 02:30 UTC, and on manual dispatch — never on a PR. It's the
slowest job in the repo, so it isn't paid for on every push.

## Environments

| Environment | Trigger | URL |
|---|---|---|
| Production | push to `main` | the production domain |
| Preview | any PR | per-PR `*.vercel.app` URL |

**Not yet done:** the repository has not been imported into Vercel, and no domain is
connected. Both are outstanding on the owner's queue — see the launch checklist.

## Environment variables

Both are public identifiers, not secrets, and must be set on **all three** Vercel
environments (Production, Preview, Development):

| Name | Value |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID` | the Sanity project id (`6203ycx6`) |
| `PUBLIC_SANITY_DATASET` | `production` |

The same two are already set as GitHub Actions **repository variables**, consumed by
`e2e.yml`. **Not yet done:** the Vercel env vars themselves are not yet set — outstanding on
the owner's queue.

`SANITY_WRITE_TOKEN` is required **only** for running `scripts/seed-cards.ts` locally. It is
never set in Vercel or CI — the site never writes to the CMS.

## Seeding the deck

Once the deck size is known:

```bash
SANITY_WRITE_TOKEN=<editor token> npx tsx scripts/seed-cards.ts <deck size>
```

Idempotent — safe to re-run, including after the deck grows. Create the token at
sanity.io/manage → the `Pakal` organization → this project → **API → Tokens** → Editor
permission.

**Not yet done:** the script has never been run. The deck size — and therefore the printed
card count — is still unknown. See the launch checklist.

## The printed-QR contract

Cards encode `https://<domain>/c/<card number>`. That URL is permanent and cannot be
corrected after printing. Before any print run: confirm the domain is final, and that
`/c/<n>` resolves for every `n` in the run (seed the cards first). See the design spec §7
(`docs/superpowers/specs/2026-08-15-pakal-site-design.md`).

## The Sanity → Vercel rebuild hook

Content changes need a rebuild because most pages are prerendered at build time (`/c/[id]`
is the deliberate exception — it's server-rendered so card assignments go live without a
rebuild). The wiring:

1. Vercel → project → **Settings → Git → Deploy Hooks** → a hook named `sanity-publish` on
   branch `main`.
2. sanity.io/manage → project → **API → Webhooks** → a webhook named `vercel-rebuild`,
   pointed at that deploy hook URL, dataset `production`, triggered on **Create, Update,
   Delete**, filtered to `_type in ["place", "page", "siteSettings"]`, HTTP method POST.

The filter deliberately excludes `card`: card changes are read live by `/c/[id]` and never
need a rebuild, so including them would burn build minutes for no visible change.

**Not yet done:** this hook does not exist yet. Both dashboard steps are outstanding on the
owner's queue. Until it's wired up, a content publish in `/studio` has no effect on the live
site until someone triggers a manual redeploy in Vercel.
