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
gives them GitHub's `skipped` conclusion, which satisfies a required check, rather than
leaving it stuck "Expected" the way a workflow-level path filter would. Confirmed on this
PR (#13): all three jobs completed with conclusion `skipped`.

The end-to-end suite (`.github/workflows/e2e.yml`) is not a pre-merge gate: it runs after a
push to `main`, nightly at 02:30 UTC, and on manual dispatch — never on a PR. It's the
slowest job in the repo, so it isn't paid for on every push.

## Environments

| Environment | Trigger | URL |
|---|---|---|
| Production | push to `main` | the production domain |
| Preview | any PR | per-PR `*.vercel.app` URL |

The repository is imported into Vercel — project `pakal` under team `pakal` — and
production is live at `https://pakal-kappa.vercel.app`, serving current `main`. **Still
outstanding:** no production domain is connected, so that Vercel-generated hostname is the
only address the site answers on. See the launch checklist.

## Environment variables

Both are public identifiers, not secrets, and must be set on **all three** Vercel
environments (Production, Preview, Development):

| Name | Value |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID` | the Sanity project id (`6203ycx6`) |
| `PUBLIC_SANITY_DATASET` | `production` |

The same two are already set as GitHub Actions **repository variables**, consumed by
`e2e.yml`. **Not yet done:** the Vercel env vars themselves are not yet set — confirmed live
while writing this doc, every Vercel preview build on this repo currently fails (`astro
build` throws when it can't reach a project id). Setting them is outstanding on the owner's
queue.

Both were set on **Production and Preview** on 2026-08-15 and are marked *Sensitive* in
Vercel, which only hides the value in the dashboard — build and runtime still read it
normally. **Development is still missing**, which affects `vercel dev` and `vercel env pull`
only, not deployed builds.

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

**Partially done (2026-08-22):** ten cards were seeded as a proving batch, to exercise the
`/c/<n>` path against real documents. The real deck size — and therefore the printed card
count — is still unknown, so the script must be re-run with it before any print run. It is
idempotent and additive, so re-running costs nothing.

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

**Done 2026-08-22.** Both sides exist. The gap they close was observed live before they
were wired: publishing a `place` made `/c/1` and `/treks/<slug>` correct immediately, while
the prerendered homepage and `/treks` index still listed zero landmarks until a rebuild ran.
That is the design working as intended — the scan path stayed live while the prerendered
pages went stale — but it is also why the hook is not optional.

## The Studio and CORS origins

`/studio` ships with the site, but Sanity refuses to connect it from any origin that is not
registered on the project. An unregistered origin gets a "Connect this Studio to your
project" screen instead of the content — not an error, and not a code problem.

- The production hostname is registered via the Studio's own **Register Studio** button,
  which adds the CORS origin *and* uploads the schema manifest. "Add CORS origin" alone
  skips the manifest and is for throwaway URLs.
- **Every per-PR preview deploy is a new origin** and will show that screen. Do not register
  them; the URLs are disposable and each one is a permanent entry on the project.
- **When the production domain is connected, register it too.** Otherwise the first person to
  open the Studio on the real domain hits the same wall.
