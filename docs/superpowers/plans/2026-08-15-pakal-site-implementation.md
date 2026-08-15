# Pakal Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Hebrew RTL marketing and traveler-content site for the פק"ל card game, with a CMS the product owner can run himself and a permanent QR-code URL contract for printed cards.

**Architecture:** Astro renders every page statically at build time except one server-rendered route, `/c/[id]`, which resolves a printed card's QR code to its landmark page via Sanity and redirects. Content lives in Sanity; its Studio is embedded in this same app at `/studio`. Vercel builds on push through its native Git integration; GitHub Actions runs quality gates only.

**Tech Stack:** Astro 7 · TypeScript (strict) · Tailwind CSS 4 · Sanity (Content Lake + embedded Studio) · Vitest · Playwright · Vercel

**Spec:** [`docs/superpowers/specs/2026-08-15-pakal-site-design.md`](../specs/2026-08-15-pakal-site-design.md)

## Global Constraints

These apply to **every task** below. They are not repeated per task.

- **Node 22**, npm as package manager (matches CI and the Edut-app convention).
- **Astro 7.x**, `output` left at its default (`static`); only `/c/[id]` opts out via `export const prerender = false`. Astro 6 is not an option: the whole 6.x line carries three unpatched high-severity XSS advisories (fixed first in 7.1.0), and `@astrojs/vercel` 11 peer-depends on `^7.0.0`. Astro 7's Rust compiler errors on unclosed tags rather than auto-correcting them, so keep template HTML strictly valid.
- **Hebrew is the only content language.** `<html lang="he" dir="rtl">` on every page.
- **CSS logical properties only.** `margin-inline-start`, `padding-inline`, `inset-inline-start`, `text-align: start`. Never `left`/`right`/`ml-`/`mr-`. In Tailwind use `ms-*`/`me-*`/`ps-*`/`pe-*`, never `ml-*`/`mr-*`/`pl-*`/`pr-*`.
- **URL path segments are ASCII.** Hebrew appears in content, `<title>`, and meta only — never in a path.
- **No new dependencies** beyond those named in this plan. Adding one requires stopping and asking.
- **Conventional commits**; branches named `feature/…`, `fix/…`, `docs/…`; never commit directly to `main`.
- **No leftover `console.log`, `debugger`, or stray `TODO`** in committed code.
- Every task ends green: `npm run lint && npm run typecheck && npm test` all pass before the commit.

## Human-Gated Steps

Three steps need a human at a browser and cannot be automated. They are called out inline where they occur; the plan is ordered so nothing blocks on them longer than necessary.

| Gate | Where | Who |
|---|---|---|
| Import repo into Vercel, confirm Astro preset | after Task 2 | Nir |
| `npx sanity login` + create the Sanity project | Task 4, Step 1 | Nir |
| Add env vars to Vercel (all 3 environments) | Task 4, Step 9 | Nir |

## Deferred Inputs

These are unknown at plan time (spec §14) and are handled with working defaults so implementation never blocks:

| Unknown | Handling |
|---|---|
| Domain | Site works on its `*.vercel.app` URL. Domain is a Vercel setting, no code change |
| Deck size | Task 5 delivers a **tested seeding script that takes the count as an argument**; it gets run when Aviv answers |
| WhatsApp number | Lives in `siteSettings` in the CMS. A placeholder is seeded; changing it is an edit, not a deploy |
| Artwork and copy | Placeholders at correct aspect ratios; swapping them is a content task |

## File Structure

```
astro.config.mjs            Astro + integrations + Sanity config (reads env via vite loadEnv)
sanity.config.ts            Studio config: schema registration, workspace name
vitest.config.ts            Unit tests (src/**/*.test.ts)
playwright.config.ts        Smoke tests against a production build
.env.example                Documents required env vars
src/
  styles/global.css         Tailwind import + design tokens + font faces
  layouts/BaseLayout.astro  <html dir="rtl">, head, header, footer slot
  components/
    Header.astro            Nav + "מיוצר ומפותח בישראל"
    Footer.astro            Links, WhatsApp, credits
    WhatsAppCta.astro       Renders a wa.me link from siteSettings
    FeatureCard.astro       One of the four homepage feature cards
    PlaceCard.astro         A landmark teaser in /treks
    PortableText.astro      Renders Sanity rich text to HTML
    SanityImage.astro       Responsive <img> from a Sanity image ref
  lib/
    whatsapp.ts             buildWhatsAppUrl() — pure
    cards/resolve.ts        parseCardNumber(), resolveCardPath() — pure
    sanity/types.ts         Shared content types
    sanity/queries.ts       GROQ queries + typed fetch helpers
    sanity/image.ts         urlFor() image builder
  pages/
    index.astro             Homepage
    treks/index.astro       Landmark index
    treks/[slug].astro      Landmark page
    how-to-play.astro       איך משחקים
    corporate.astro         מתנה לחברות
    faq.astro               שאלות נפוצות
    c/[id].astro            QR resolver — the ONLY prerender:false route
    404.astro               Hebrew not-found
sanity/schemaTypes/
    card.ts  place.ts  page.ts  siteSettings.ts  index.ts
scripts/seed-cards.ts       Creates N card documents
e2e/smoke.spec.ts           Playwright smoke suite
.github/workflows/test.yml  lint + typecheck + unit tests
.github/workflows/e2e.yml   Playwright on main / nightly / dispatch
```

**Boundary rationale:** `src/lib/**` holds everything pure and testable — the card resolver and the WhatsApp URL builder are the only logic in the project that can be *wrong* rather than merely ugly, so they live outside `.astro` files where Vitest can reach them. `src/lib/sanity/**` is the single place that knows GROQ, so replacing the CMS later touches one directory and no page component.

---

### Task 1: Project scaffold and tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `src/lib/whatsapp.ts`, `src/lib/whatsapp.test.ts`
- Create: `src/pages/index.astro` (temporary placeholder, replaced in Task 8)

**Interfaces:**
- Consumes: nothing — this is the first task.
- Produces: `buildWhatsAppUrl(phone: string, message: string): string | null`, imported by `WhatsAppCta.astro` in Task 3 and used across Tasks 8–9. Also produces the npm scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test` that every later task's verification depends on.

- [ ] **Step 1: Create the branch**

```bash
cd /Users/nirdafna/DevWork/Pakal
git checkout -b feature/scaffold
```

- [ ] **Step 2: Scaffold Astro into the existing directory**

The repo already contains `README.md` and `docs/`, so scaffold into the current directory and keep them.

```bash
npm create astro@latest . -- --template minimal --typescript strict --install --no-git --skip-houston
```

Answer "Yes" if it asks to continue in a non-empty directory. It must not overwrite `docs/` or `README.md` — verify with `git status` that neither is modified.

- [ ] **Step 3: Add Tailwind, the Vercel adapter, and React (React is required by the embedded Sanity Studio in Task 4)**

```bash
npx astro add tailwind vercel react --yes
```

- [ ] **Step 4: Add test and font dependencies**

```bash
npm install -D vitest @astrojs/check typescript
npm install @fontsource-variable/assistant
```

`@astrojs/check` is what backs the `astro check` command used as the lint script below. Without it installed explicitly, `astro check` prompts to install it interactively — which hangs a CI run rather than failing it.

`@fontsource-variable/assistant` self-hosts the Hebrew webfont, which the spec (§9) requires instead of a Google Fonts request. It is the standard font-packaging project, ships only static font files, and pulls no transitive dependencies.

- [ ] **Step 5: Add npm scripts**

In `package.json`, ensure the `scripts` block reads:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "lint": "astro check",
    "typecheck": "astro sync && tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`astro check` is Astro's built-in diagnostic pass over `.astro` files; `tsc --noEmit` covers the full TypeScript graph including test files, which the build does not. `astro sync` must run first: it generates the type declarations for Astro's virtual modules (`astro:content`, and later `sanity:client`), which do not exist on a fresh checkout — so a CI run without it fails on imports that are correct.

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 7: Write the failing test for the WhatsApp URL builder**

Create `src/lib/whatsapp.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me link from a plain number', () => {
    expect(buildWhatsAppUrl('972501234567', 'שלום')).toBe(
      'https://wa.me/972501234567?text=%D7%A9%D7%9C%D7%95%D7%9D',
    );
  });

  it('strips spaces, dashes and plus signs from the phone number', () => {
    expect(buildWhatsAppUrl('+972 50-123-4567', 'hi')).toBe('https://wa.me/972501234567?text=hi');
  });

  it('omits the text parameter when the message is empty', () => {
    expect(buildWhatsAppUrl('972501234567', '')).toBe('https://wa.me/972501234567');
  });

  it('returns null when the phone number has no digits', () => {
    expect(buildWhatsAppUrl('', 'hi')).toBeNull();
    expect(buildWhatsAppUrl('לא-מספר', 'hi')).toBeNull();
  });
});
```

The null case matters: `siteSettings` starts with a placeholder number, and a malformed one must produce no link rather than a broken `wa.me/` link that opens WhatsApp to nowhere.

- [ ] **Step 8: Run the test and confirm it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./whatsapp"`.

- [ ] **Step 9: Implement `src/lib/whatsapp.ts`**

```ts
/**
 * Builds a wa.me deep link. Returns null when the phone number contains no
 * digits, so callers can omit the CTA entirely rather than render a dead link.
 */
export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 0) return null;

  const base = `https://wa.me/${digits}`;
  if (message.length === 0) return base;

  return `${base}?text=${encodeURIComponent(message)}`;
}
```

- [ ] **Step 10: Run the test and confirm it passes**

Run: `npm test`
Expected: PASS — 4 tests.

- [ ] **Step 11: Create `.env.example`**

```bash
# Sanity — created in Task 4. Both values are public identifiers, not secrets.
PUBLIC_SANITY_PROJECT_ID=
PUBLIC_SANITY_DATASET=production
```

- [ ] **Step 12: Verify the whole toolchain is green**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: all four succeed; `dist/` is produced.

- [ ] **Step 13: Commit, push, open the PR**

Every task ends with an open PR; the controller merges it after review, so the next task's `git checkout main` starts from the merged work.

```bash
git add -A
git commit -m "feat: scaffold Astro project with Tailwind, Vercel adapter and Vitest"
git push -u origin feature/scaffold && gh pr create --fill
```

---

### Task 2: CI workflows, PR template, branch protection

**Files:**
- Create: `.github/workflows/test.yml`, `.github/pull_request_template.md`

The e2e workflow deliberately lands in Task 10, alongside the suite it runs — a workflow that invokes `playwright test` before Playwright is installed fails on the first push to `main`.

**Interfaces:**
- Consumes: the npm scripts from Task 1 (`lint`, `typecheck`, `test`).
- Produces: the required status checks `lint`, `typecheck`, `unit-tests`, which the `main` ruleset references by exactly these job names.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/ci
```

- [ ] **Step 2: Create `.github/workflows/test.yml`**

```yaml
name: Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

concurrency:
  group: test-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read # the `changes` job lists PR files via the API

jobs:
  # Detects whether a PR touches anything beyond non-shipping docs. The heavy
  # jobs gate on this with a JOB-LEVEL `if:`, never workflow `paths-ignore`.
  # That distinction is load-bearing: a job skipped by `if:` reports SUCCESS and
  # satisfies a required check, whereas a workflow skipped by a path filter
  # leaves the required check stuck "Expected", blocking the merge forever.
  changes:
    runs-on: ubuntu-latest
    outputs:
      code: ${{ steps.filter.outputs.code }}
    steps:
      - name: Detect non-docs changes
        id: filter
        env:
          GH_TOKEN: ${{ github.token }}
          REPO: ${{ github.repository }}
          PR: ${{ github.event.pull_request.number }}
        run: |
          if [ "${{ github.event_name }}" != "pull_request" ]; then
            echo "code=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          # On any API error, fail safe to code=true so a hiccup never
          # silently bypasses the gate.
          files=$(gh api "repos/$REPO/pulls/$PR/files" --paginate -q '.[].filename' || echo "__api_error__")
          if printf '%s\n' "$files" | grep -qvE '^(docs/|\.claude/|[^/]+\.md$)'; then
            echo "code=true" >> "$GITHUB_OUTPUT"
          else
            echo "code=false" >> "$GITHUB_OUTPUT"
          fi

  lint:
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint

  typecheck:
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck

  unit-tests:
    needs: changes
    if: needs.changes.outputs.code == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
```

- [ ] **Step 3: Create `.github/pull_request_template.md`**

```markdown
## What & why

<!-- One or two sentences. Link the spec or plan section if there is one. -->

## Checklist

- [ ] Pre-merge gates run (`/simplify` + `/code-review` on the diff).
- [ ] RTL: logical properties only — no `left`/`right`, no `ml-`/`mr-`/`pl-`/`pr-`.
- [ ] No leftover `console.log` / `debugger` / stray `TODO`.
- [ ] New behavior has at least one test; a bug fix has a regression test.
```

- [ ] **Step 4: Verify locally, then push and open the PR**

```bash
npm run lint && npm run typecheck && npm test
git add -A
git commit -m "ci: add test and e2e workflows, PR template"
git push -u origin feature/ci
gh pr create --fill
```

- [ ] **Step 5: Confirm the checks actually ran**

Run: `gh pr checks`
Expected: `lint`, `typecheck`, `unit-tests` all pass. If a job shows as skipped on a code PR, the `changes` detector is wrong — fix it before merging, because this is the mechanism protecting every later PR.

- [ ] **Step 6: Merge, then apply branch protection**

```bash
gh pr merge --squash --delete-branch
gh api -X POST repos/nirdafna/Pakal/rulesets \
  --input - <<'JSON'
{
  "name": "pakal-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["squash", "merge", "rebase"],
        "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": 0,
        "required_review_thread_resolution": false
      }
    }
  ]
}
JSON
```

Zero required approvals is deliberate — a solo maintainer who cannot approve their own PR would be locked out of their own repository. The rule still forces every change through a PR, which is what makes CI run before merge.

- [ ] **Step 7: HUMAN GATE — import the repo into Vercel**

Nir, in the browser: Vercel → scope `Pakal` → **Add New… → Project** → **Import Git Repository** → `nirdafna/Pakal`. If it is not listed, use *Adjust GitHub App Permissions* to grant access. Confirm Framework Preset is **Astro** and Root Directory is `./`. Do not add environment variables yet. Click **Deploy**.

Expected: a live `*.vercel.app` URL serving the placeholder homepage. Report the URL back before Task 3 starts.

---

### Task 3: RTL base layout, design tokens, header, footer, 404

**Files:**
- Create: `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/WhatsAppCta.astro`, `src/pages/404.astro`
- Modify: `src/pages/index.astro` (use the layout; still placeholder content)

**Interfaces:**
- Consumes: `buildWhatsAppUrl` from Task 1.
- Produces:
  - `BaseLayout.astro` with props `{ title: string; description?: string }` and a default slot. Every page from Task 6 onward wraps its content in it.
  - `WhatsAppCta.astro` with props `{ phone: string; message: string; label: string; variant?: 'primary' | 'outline' }`.
  - CSS custom properties `--color-brand`, `--color-accent`, `--color-cta`, `--color-sand`, `--color-ink` on `:root`, referenced by every later component.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/base-layout
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@import 'tailwindcss';
@import '@fontsource-variable/assistant';

:root {
  --color-brand: #1b3a6b;
  --color-accent: #c8322e;
  --color-cta: #4a8b3b;
  --color-sand: #f4efe6;
  --color-ink: #24303f;
  --font-hebrew: 'Assistant Variable', system-ui, sans-serif;
}

html {
  font-family: var(--font-hebrew);
  color: var(--color-ink);
  background-color: var(--color-sand);
}

/* Numbers and Latin words inside Hebrew text reorder incorrectly without
   isolation — "7 ק"מ" is the common failure. Apply to any mixed-script run. */
.bidi-isolate {
  unicode-bidi: isolate;
}
```

- [ ] **Step 3: Write `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
    <meta property="og:title" content={title} />
    {description && <meta property="og:description" content={description} />}
    <meta property="og:locale" content="he_IL" />
  </head>
  <body class="min-h-screen flex flex-col">
    <Header />
    <main class="flex-1">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 4: Write `src/components/Header.astro`**

Nav order follows the mockup, reading right-to-left. Because `dir="rtl"` is set on `<html>`, source order **is** visual order — do not reverse the array.

```astro
---
const links = [
  { href: '/', label: 'דף הבית' },
  { href: '/treks', label: 'המסלולים שבחפיסה' },
  { href: '/how-to-play', label: 'איך משחקים' },
  { href: '/corporate', label: 'מתנה לחברות' },
  { href: '/faq', label: 'שאלות נפוצות' },
];

const currentPath = Astro.url.pathname;
---

<header class="border-b border-black/10">
  <nav class="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4" aria-label="ניווט ראשי">
    <a href="/" class="text-2xl font-bold" style={`color: var(--color-brand)`}>פק"ל</a>
    <ul class="flex flex-wrap gap-4 text-sm">
      {
        links.map((link) => (
          <li>
            <a
              href={link.href}
              aria-current={currentPath === link.href ? 'page' : undefined}
              class="hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))
      }
    </ul>
    <span class="ms-auto text-xs opacity-70">מיוצר ומפותח בישראל</span>
  </nav>
</header>
```

Note `ms-auto`, not `ml-auto`: the logical property pushes the badge to the *end* of the line, which is the left side in RTL and would flip correctly in a future LTR version.

- [ ] **Step 5: Write `src/components/WhatsAppCta.astro`**

```astro
---
import { buildWhatsAppUrl } from '../lib/whatsapp';

interface Props {
  phone: string;
  message: string;
  label: string;
  variant?: 'primary' | 'outline';
}

const { phone, message, label, variant = 'primary' } = Astro.props;
const href = buildWhatsAppUrl(phone, message);

const classes =
  variant === 'primary'
    ? 'inline-block rounded-lg px-6 py-3 font-semibold text-white'
    : 'inline-block rounded-lg border-2 px-6 py-3 font-semibold';
---

{
  href && (
    <a
      href={href}
      class={classes}
      style={
        variant === 'primary'
          ? 'background-color: var(--color-cta)'
          : 'border-color: var(--color-brand); color: var(--color-brand)'
      }
      rel="noopener"
    >
      {label}
    </a>
  )
}
```

Rendering nothing when `href` is null is the point: a placeholder phone number produces no button instead of a dead one.

- [ ] **Step 6: Write `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---

<footer class="border-t border-black/10 px-4 py-8 text-sm">
  <div class="mx-auto flex max-w-6xl flex-wrap gap-4">
    <p>פק"ל — נהנים בכל דרך</p>
    <p class="ms-auto bidi-isolate">© {year}</p>
  </div>
</footer>
```

- [ ] **Step 7: Write `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title='הדף לא נמצא — פק"ל'>
  <section class="mx-auto max-w-2xl px-4 py-16 text-center">
    <h1 class="text-3xl font-bold">הדף לא נמצא</h1>
    <p class="mt-4">ייתכן שהקישור השתנה. אפשר לחזור לדף הבית ולהמשיך משם.</p>
    <a class="mt-8 inline-block underline" href="/">חזרה לדף הבית</a>
  </section>
</BaseLayout>
```

- [ ] **Step 8: Update `src/pages/index.astro` to use the layout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout
  title='פק"ל — נהנים בכל דרך'
  description="משחק קלפים משפחתי כחול-לבן שמחבר בין משחקים אהובים, אתרים בישראל וחוויות טיול."
>
  <section class="mx-auto max-w-6xl px-4 py-16">
    <h1 class="text-4xl font-bold">פק"ל</h1>
    <p class="mt-4">נהנים בכל דרך</p>
  </section>
</BaseLayout>
```

- [ ] **Step 9: Verify in a browser**

Run: `npm run dev`
Check: `<html>` carries `lang="he" dir="rtl"`; the nav reads right-to-left; "מיוצר ומפותח בישראל" sits at the left edge; `/404` renders in Hebrew.

- [ ] **Step 10: Grep for direction-locked CSS**

```bash
grep -rnE 'class="[^"]*\b(ml|mr|pl|pr)-' src/ || echo "clean"
```
Expected: `clean`. Any hit is a bug against the global constraint — fix before committing.

- [ ] **Step 11: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: add RTL base layout, header, footer and 404 page"
git push -u origin feature/base-layout && gh pr create --fill
```

---

### Task 4: Sanity project, schemas, embedded Studio

**Files:**
- Create: `sanity.config.ts`, `sanity/schemaTypes/{index,card,place,page,siteSettings}.ts`
- Modify: `astro.config.mjs`, `.env.example`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the document types `card`, `place`, `page`, `siteSettings` with exactly the field names below — Task 5's GROQ queries depend on these names character-for-character. Also produces the `sanity:client` virtual module for all later data access.

- [x] **Step 1: HUMAN GATE — create the Sanity project — DONE 2026-08-15**

Done. Sanity now requires an organization above projects, so both were created:

| | |
|---|---|
| Organization | `Pakal` — `okTbUDl4F` |
| Project | `Pakal` — **`6203ycx6`** |
| Dataset | `production`, **public** |
| Manage | https://www.sanity.io/manage/project/6203ycx6 |

The dataset is public on purpose: the site reads content without an API token, so there is no secret to leak, rotate, or forget in an env var. The content is public marketing copy either way.

`.env` is already written locally and is gitignored:

```
PUBLIC_SANITY_PROJECT_ID=6203ycx6
PUBLIC_SANITY_DATASET=production
```

- [ ] **Step 2: Create the branch and install Sanity packages**

```bash
git checkout main && git pull && git checkout -b feature/sanity-studio
npm install @sanity/astro @sanity/client sanity@6.9.1 @sanity/image-url @portabletext/to-html styled-components react-is
```

`sanity` is pinned to **6.9.1**, not latest. The supply-chain hook enforces a 7-day cooldown on newly published versions — the window in which a compromised release is live on the registry and not yet caught — and 6.9.2 was published inside it. 6.9.1 is nine days old and clears the rule without an override, which is the point: satisfy the guard rather than bypass it. Drop the pin once 6.9.2 or later has aged past the threshold.

`styled-components` and `react-is` are not optional extras: `@sanity/astro` declares both as peer dependencies (the Studio UI is built on styled-components). Installing them explicitly avoids an unmet-peer warning that later reads as a missing-module error at Studio load.

The Sanity packages are all first-party, as is `@portabletext/to-html`, which is also maintained by Sanity and is the framework-agnostic way to render rich text — chosen over a community Astro wrapper to keep the dependency count and the trust surface smaller.

- [ ] **Step 3: Wire the integration in `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// astro.config runs in Node before Astro's env is available, so `import.meta.env`
// does NOT carry custom vars here. loadEnv is the supported way to read them.
const { PUBLIC_SANITY_PROJECT_ID, PUBLIC_SANITY_DATASET } = loadEnv(
  process.env.NODE_ENV ?? 'development',
  process.cwd(),
  '',
);

export default defineConfig({
  adapter: vercel(),
  vite: { plugins: [tailwindcss()] },
  integrations: [
    sanity({
      projectId: PUBLIC_SANITY_PROJECT_ID,
      dataset: PUBLIC_SANITY_DATASET,
      // false: the CDN serves cached responses, and /c/[id] must reflect a
      // just-published card immediately. Also required for correct static builds.
      useCdn: false,
      apiVersion: '2026-08-15',
      studioBasePath: '/studio',
    }),
    react(),
  ],
});
```

- [ ] **Step 4: Create `sanity/schemaTypes/place.ts`**

```ts
import { defineField, defineType } from 'sanity';

export const place = defineType({
  name: 'place',
  title: 'אתר או מסלול',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'שם',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'כתובת בקישור (באנגלית)',
      type: 'slug',
      description: 'אותיות אנגליות ומקפים בלבד, למשל ein-gedi',
      options: { source: 'title', slugify: (input) => input.toLowerCase().replace(/\s+/g, '-') },
      validation: (rule) =>
        rule.required().custom((value) =>
          !value?.current || /^[a-z0-9-]+$/.test(value.current)
            ? true
            : 'רק אותיות אנגליות קטנות, ספרות ומקפים',
        ),
    }),
    defineField({
      name: 'kind',
      title: 'סוג',
      type: 'string',
      options: {
        list: [
          { title: 'מסלול', value: 'trek' },
          { title: 'אתר', value: 'site' },
        ],
        layout: 'radio',
      },
      initialValue: 'trek',
    }),
    defineField({ name: 'region', title: 'אזור', type: 'string' }),
    defineField({
      name: 'summary',
      title: 'תקציר',
      type: 'text',
      rows: 3,
      description: 'מופיע ברשימת המסלולים ובתוצאות החיפוש בגוגל',
    }),
    defineField({ name: 'body', title: 'תוכן', type: 'array', of: [{ type: 'block' }] }),
    defineField({
      name: 'images',
      title: 'תמונות',
      type: 'array',
      of: [
        {
          type: 'image',
          options: { hotspot: true },
          fields: [{ name: 'alt', title: 'תיאור התמונה', type: 'string' }],
        },
      ],
    }),
    defineField({ name: 'lengthKm', title: 'אורך (ק"מ)', type: 'number' }),
    defineField({ name: 'durationHours', title: 'משך (שעות)', type: 'number' }),
    defineField({ name: 'difficulty', title: 'רמת קושי', type: 'string' }),
    defineField({ name: 'season', title: 'עונה מומלצת', type: 'string' }),
    defineField({ name: 'mapUrl', title: 'קישור למפה', type: 'url' }),
    defineField({ name: 'tips', title: 'טיפים', type: 'text', rows: 4 }),
  ],
  preview: { select: { title: 'title', subtitle: 'region' } },
});
```

Only `title` and `slug` are required. Every other field is optional by design — the spec's biggest human risk (§15) is Aviv abandoning the Studio, and a form that refuses to save is how that happens.

- [ ] **Step 5: Create `sanity/schemaTypes/card.ts`**

```ts
import { defineField, defineType } from 'sanity';

export const card = defineType({
  name: 'card',
  title: 'קלף',
  type: 'document',
  fields: [
    defineField({
      name: 'number',
      title: 'מספר הקלף',
      type: 'number',
      description: 'המספר שמופיע בקישור ה-QR שעל גב הקלף. אין לשנות אחרי הדפסה.',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'label',
      title: 'זיהוי הקלף',
      type: 'string',
      description: 'לדוגמה: 7 תלתן',
    }),
    defineField({
      name: 'place',
      title: 'האתר או המסלול המקושר',
      type: 'reference',
      to: [{ type: 'place' }],
      description: 'אפשר להשאיר ריק — הקלף יוביל לדף הבית עד שיקושר',
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'place.title' } },
});
```

- [ ] **Step 6: Create `sanity/schemaTypes/page.ts` and `siteSettings.ts`**

```ts
// sanity/schemaTypes/page.ts
import { defineField, defineType } from 'sanity';

export const page = defineType({
  name: 'page',
  title: 'עמוד תוכן',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'כותרת', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug',
      title: 'מזהה העמוד',
      type: 'string',
      description: 'how-to-play / corporate / faq',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'body', title: 'תוכן', type: 'array', of: [{ type: 'block' }] }),
  ],
});
```

```ts
// sanity/schemaTypes/siteSettings.ts
import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'הגדרות האתר',
  type: 'document',
  fields: [
    defineField({
      name: 'whatsappPhone',
      title: 'מספר וואטסאפ',
      type: 'string',
      description: 'כולל קידומת מדינה, למשל 972501234567',
    }),
    defineField({ name: 'purchaseMessage', title: 'הודעת רכישה', type: 'string' }),
    defineField({ name: 'corporateMessage', title: 'הודעת מתנה לחברות', type: 'string' }),
    defineField({ name: 'heroTitle', title: 'כותרת ראשית', type: 'string' }),
    defineField({ name: 'heroTagline', title: 'סלוגן', type: 'string' }),
    defineField({ name: 'heroText', title: 'טקסט פתיחה', type: 'text', rows: 3 }),
    defineField({ name: 'heroImage', title: 'תמונת פתיחה', type: 'image' }),
  ],
});
```

- [ ] **Step 7: Create `sanity/schemaTypes/index.ts` and `sanity.config.ts`**

```ts
// sanity/schemaTypes/index.ts
import { card } from './card';
import { page } from './page';
import { place } from './place';
import { siteSettings } from './siteSettings';

export const schemaTypes = [place, card, page, siteSettings];
```

```ts
// sanity.config.ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './sanity/schemaTypes';

export default defineConfig({
  name: 'pakal',
  title: 'פק"ל',
  // `import.meta.env`, NOT `process.env`. This file is bundled into the Studio's
  // client-side island, and Vite rewrites `process.env` to `{}` in browser code —
  // which yields `projectId: undefined` with a green build and a 200 response,
  // failing only once the Studio tries to connect. Astro exposes PUBLIC_-prefixed
  // vars to the client through `import.meta.env`.
  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',
  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
```

- [ ] **Step 8: Verify the Studio loads and content saves**

Run: `npm run dev`, open `http://localhost:4321/studio`
Check: log in; all four document types appear in Hebrew; create one `place` (title "עין גדי", slug `ein-gedi`) and publish it; create one `siteSettings` with a `whatsappPhone`; confirm the slug validator rejects Hebrew input.

- [ ] **Step 9: HUMAN GATE — add the env vars to Vercel**

Nir, in the browser: Vercel → project → **Settings → Environment Variables**. Add `PUBLIC_SANITY_PROJECT_ID=6203ycx6` and `PUBLIC_SANITY_DATASET=production` to **Production, Preview, and Development**. Missing them on Preview breaks every PR preview while production looks fine.

The GitHub half is **already done** — repository variables `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` were set via `gh variable set` on 2026-08-15. They are variables, not secrets: a project id and dataset name ship in the client bundle, so storing them as secrets would imply a confidentiality they do not have.

- [ ] **Step 10: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: add Sanity schemas and embed Studio at /studio"
git push -u origin feature/sanity-studio && gh pr create --fill
```

---

### Task 5: Data layer, card resolver, seeding script

**Files:**
- Create: `src/lib/sanity/types.ts`, `src/lib/sanity/queries.ts`, `src/lib/sanity/image.ts`, `src/lib/cards/resolve.ts`, `src/lib/cards/resolve.test.ts`, `scripts/seed-cards.ts`

**Interfaces:**
- Consumes: the schema field names from Task 4; `sanity:client` from `@sanity/astro`.
- Produces, all imported by Tasks 6–9:
  - `parseCardNumber(raw: string | undefined): number | null`
  - `resolveCardPath(card: CardLookup | null): string`
  - `type CardLookup = { slug: string | null }`
  - `getCardByNumber(n: number): Promise<CardLookup | null>`
  - `getPlaces(): Promise<PlaceSummary[]>`
  - `getPlaceBySlug(slug: string): Promise<Place | null>`
  - `getSiteSettings(): Promise<SiteSettings | null>`
  - `getPage(slug: string): Promise<PageDoc | null>`
  - `urlFor(source: SanityImageSource)`

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/data-layer
```

- [ ] **Step 2: Write the failing tests for the card resolver**

Create `src/lib/cards/resolve.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseCardNumber, resolveCardPath } from './resolve';

describe('parseCardNumber', () => {
  it('parses a plain positive integer', () => {
    expect(parseCardNumber('34')).toBe(34);
  });

  it('parses a zero-padded number, because a QR generator may emit one', () => {
    expect(parseCardNumber('034')).toBe(34);
  });

  it.each(['', undefined, 'abc', '1.5', '-3', '0', '1e3', ' 12 '])(
    'rejects %p',
    (input) => {
      expect(parseCardNumber(input)).toBeNull();
    },
  );

  it('rejects numbers beyond any plausible deck size', () => {
    expect(parseCardNumber('100000')).toBeNull();
  });
});

describe('resolveCardPath', () => {
  it('routes to the landmark page when the card has a published place', () => {
    expect(resolveCardPath({ slug: 'ein-gedi' })).toBe('/treks/ein-gedi');
  });

  it('routes home when the card exists but has no place attached yet', () => {
    expect(resolveCardPath({ slug: null })).toBe('/');
  });

  it('routes home when the card number is unknown', () => {
    expect(resolveCardPath(null)).toBe('/');
  });
});
```

Each case maps to a real failure mode a printed card can hit: `' 12 '` and `'034'` cover QR readers that pad or pass whitespace; the upper bound stops `/c/99999999999` from becoming a cheap way to hammer the CMS.

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./resolve"`.

- [ ] **Step 4: Implement `src/lib/cards/resolve.ts`**

```ts
export type CardLookup = { slug: string | null };

/** Upper bound on a plausible deck size, so unbounded ids can't reach the CMS. */
const MAX_CARD_NUMBER = 1000;

/**
 * Parses the `[id]` segment of a printed QR URL. Strict on purpose: anything
 * that is not a plain positive integer within deck range is treated as unknown
 * and sent home, never queried.
 */
export function parseCardNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) return null;

  const value = Number.parseInt(raw, 10);
  if (value < 1 || value > MAX_CARD_NUMBER) return null;

  return value;
}

/**
 * Maps a card lookup to a destination path. Every failure resolves to the
 * homepage: the person hitting a failure here is a stranger holding a printed
 * card, and a dead end is unrecoverable for them.
 */
export function resolveCardPath(card: CardLookup | null): string {
  if (!card?.slug) return '/';
  return `/treks/${card.slug}`;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS — 13 tests across both files.

- [ ] **Step 6: Write `src/lib/sanity/types.ts`**

```ts
import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  asset: { _ref: string };
  alt?: string;
}

export interface PlaceSummary {
  title: string;
  slug: string;
  kind: 'trek' | 'site';
  region?: string;
  summary?: string;
  image?: SanityImage;
}

export interface Place extends PlaceSummary {
  body?: PortableTextBlock[];
  images?: SanityImage[];
  lengthKm?: number;
  durationHours?: number;
  difficulty?: string;
  season?: string;
  mapUrl?: string;
  tips?: string;
}

export interface SiteSettings {
  whatsappPhone?: string;
  purchaseMessage?: string;
  corporateMessage?: string;
  heroTitle?: string;
  heroTagline?: string;
  heroText?: string;
  heroImage?: SanityImage;
}

export interface PageDoc {
  title: string;
  slug: string;
  body?: PortableTextBlock[];
}
```

- [ ] **Step 7: Write `src/lib/sanity/queries.ts`**

```ts
import { sanityClient } from 'sanity:client';
import type { CardLookup } from '../cards/resolve';
import type { PageDoc, Place, PlaceSummary, SiteSettings } from './types';

/**
 * Looks up a printed card. Returns null for an unknown number, and a null slug
 * for a card whose place is not attached or not yet published — the client is
 * configured without a token, so drafts are invisible by construction.
 */
export async function getCardByNumber(number: number): Promise<CardLookup | null> {
  return sanityClient.fetch<CardLookup | null>(
    `*[_type == "card" && number == $number][0]{ "slug": place->slug.current }`,
    { number },
  );
}

export async function getPlaces(): Promise<PlaceSummary[]> {
  return sanityClient.fetch<PlaceSummary[]>(
    `*[_type == "place" && defined(slug.current)] | order(title asc){
      title, "slug": slug.current, kind, region, summary, "image": images[0]
    }`,
  );
}

export async function getPlaceBySlug(slug: string): Promise<Place | null> {
  return sanityClient.fetch<Place | null>(
    `*[_type == "place" && slug.current == $slug][0]{
      title, "slug": slug.current, kind, region, summary, body, images,
      lengthKm, durationHours, difficulty, season, mapUrl, tips
    }`,
    { slug },
  );
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return sanityClient.fetch<SiteSettings | null>(`*[_type == "siteSettings"][0]`);
}

export async function getPage(slug: string): Promise<PageDoc | null> {
  return sanityClient.fetch<PageDoc | null>(
    `*[_type == "page" && slug == $slug][0]{ title, slug, body }`,
    { slug },
  );
}
```

- [ ] **Step 8: Write `src/lib/sanity/image.ts`**

```ts
import imageUrlBuilder from '@sanity/image-url';
import type { SanityImageSource } from '@sanity/image-url/lib/types/types';
import { sanityClient } from 'sanity:client';

const builder = imageUrlBuilder(sanityClient);

export function urlFor(source: SanityImageSource) {
  return builder.image(source).auto('format').fit('max');
}
```

`auto('format')` is what makes Sanity serve WebP/AVIF to browsers that accept it — the reason the CMS choice carries its weight for a photo-heavy site on mobile data.

- [ ] **Step 9: Write `scripts/seed-cards.ts`**

The deck size is unknown (spec §14), so the script takes it as an argument and is idempotent — safe to re-run when Aviv answers, and safe to re-run again if the deck grows.

```ts
/**
 * Seeds one `card` document per printed card, so every QR resolves from day one.
 * Usage: npx tsx scripts/seed-cards.ts 54
 * Requires SANITY_WRITE_TOKEN (Editor token from sanity.io/manage) in the env.
 */
import { createClient } from '@sanity/client';

const count = Number.parseInt(process.argv[2] ?? '', 10);
if (!Number.isInteger(count) || count < 1 || count > 1000) {
  console.error('Usage: npx tsx scripts/seed-cards.ts <deck size, 1-1000>');
  process.exit(1);
}

const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error('SANITY_WRITE_TOKEN is required (create an Editor token at sanity.io/manage)');
  process.exit(1);
}

const client = createClient({
  // `process.env` is correct HERE and wrong in `sanity.config.ts`: this script
  // runs only under tsx in Node, never in a browser bundle. The Studio config
  // ships to the client, where Vite rewrites `process.env` to `{}` and the id
  // silently becomes undefined — so that file uses `import.meta.env` instead.
  projectId: process.env.PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2026-08-15',
  token,
  useCdn: false,
});

const tx = client.transaction();
for (let number = 1; number <= count; number += 1) {
  // Deterministic _id keeps this idempotent: re-running updates nothing and
  // never creates a duplicate card for the same printed number.
  tx.createIfNotExists({ _id: `card-${number}`, _type: 'card', number, label: `${number}` });
}

const result = await tx.commit();
console.info(`Seeded/verified ${count} cards (${result.results.length} documents).`);
```

- [ ] **Step 10: Add `tsx` as a dev dependency so the script can run**

```bash
npm install -D tsx
```

- [ ] **Step 11: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: add Sanity data layer, card resolver and seeding script"
git push -u origin feature/data-layer && gh pr create --fill
```

Do **not** run the seeding script yet — the deck size is still unknown. It runs when Aviv answers.

---

### Task 6: The `/c/[id]` QR resolver route

**Files:**
- Create: `src/pages/c/[id].astro`

**Interfaces:**
- Consumes: `parseCardNumber`, `resolveCardPath` (Task 5), `getCardByNumber` (Task 5).
- Produces: the live URL contract `/(c)/<number>` that printed cards depend on. Nothing later consumes it in code.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/card-resolver
```

- [ ] **Step 2: Write `src/pages/c/[id].astro`**

```astro
---
export const prerender = false;

import { getCardByNumber } from '../../lib/sanity/queries';
import { parseCardNumber, resolveCardPath } from '../../lib/cards/resolve';

const number = parseCardNumber(Astro.params.id);

let target = '/';
if (number !== null) {
  try {
    target = resolveCardPath(await getCardByNumber(number));
  } catch {
    // The CMS being unreachable must not produce an error page: the reader is
    // standing somewhere with a printed card and no way to recover. Send home.
    target = '/';
  }
}

// 302, not 301: the mapping is expected to change as content is filled in, and
// a permanent redirect cached in a phone's browser would outlive the fix.
return Astro.redirect(target, 302);
---
```

This is the only route in the project with `prerender = false`. It is server-rendered so that attaching a place to a card in the Studio takes effect on the next scan, with no rebuild.

- [ ] **Step 3: Verify the redirect behavior locally**

Run `npm run dev`, then in another shell:

```bash
curl -sI http://localhost:4321/c/1      | head -2
curl -sI http://localhost:4321/c/999999 | head -2
curl -sI http://localhost:4321/c/abc    | head -2
```

Expected: every response is `302`. `/c/999999` and `/c/abc` must have `location: /`. `/c/1` goes to `/` too until a card is seeded and linked — that is correct behavior, not a failure.

- [ ] **Step 4: Verify the rest of the site is still static**

Run: `npm run build`
Expected: the build output lists `/c/[id]` as server-rendered (a function) and every other route as prerendered. If any other route became a function, an accidental `prerender = false` or a top-level await on request data has leaked in — fix before merging.

- [ ] **Step 5: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test
git add -A
git commit -m "feat: add /c/[id] QR resolver with fail-home behavior"
git push -u origin feature/card-resolver && gh pr create --fill
```

---

### Task 7: Landmark index and landmark pages

**Files:**
- Create: `src/components/PortableText.astro`, `src/components/SanityImage.astro`, `src/components/PlaceCard.astro`, `src/pages/treks/index.astro`, `src/pages/treks/[slug].astro`

**Interfaces:**
- Consumes: `BaseLayout` (Task 3); `getPlaces`, `getPlaceBySlug`, `urlFor`, and the `Place`/`PlaceSummary` types (Task 5).
- Produces: `PortableText.astro` (props `{ value: PortableTextBlock[] | undefined }`) and `SanityImage.astro` (props `{ image: SanityImage; width?: number; class?: string }`), both reused by Tasks 8–9.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/trek-pages
```

- [ ] **Step 2: Write `src/components/PortableText.astro`**

```astro
---
import { toHTML } from '@portabletext/to-html';
import type { PortableTextBlock } from '@portabletext/types';

interface Props {
  value: PortableTextBlock[] | undefined;
}

const { value } = Astro.props;
const html = value?.length ? toHTML(value) : '';
---

{html && <div class="prose-pakal" set:html={html} />}
```

- [ ] **Step 3: Write `src/components/SanityImage.astro`**

```astro
---
import { urlFor } from '../lib/sanity/image';
import type { SanityImage } from '../lib/sanity/types';

interface Props {
  image: SanityImage;
  width?: number;
  class?: string;
}

const { image, width = 1200, class: className } = Astro.props;
const src = urlFor(image).width(width).url();
const src2x = urlFor(image).width(width * 2).url();
---

<img
  src={src}
  srcset={`${src} 1x, ${src2x} 2x`}
  alt={image.alt ?? ''}
  width={width}
  loading="lazy"
  decoding="async"
  class={className}
/>
```

An empty `alt` is deliberate for decorative images and is valid; the Studio prompts for real alt text on every upload.

- [ ] **Step 4: Write `src/components/PlaceCard.astro`**

```astro
---
import SanityImage from './SanityImage.astro';
import type { PlaceSummary } from '../lib/sanity/types';

interface Props {
  place: PlaceSummary;
}

const { place } = Astro.props;
---

<a href={`/treks/${place.slug}`} class="block rounded-xl bg-white p-4 shadow-sm hover:shadow-md">
  {place.image && <SanityImage image={place.image} width={600} class="mb-3 rounded-lg" />}
  <h3 class="text-lg font-semibold">{place.title}</h3>
  {place.region && <p class="text-sm opacity-70">{place.region}</p>}
  {place.summary && <p class="mt-2 text-sm">{place.summary}</p>}
</a>
```

- [ ] **Step 5: Write `src/pages/treks/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PlaceCard from '../../components/PlaceCard.astro';
import { getPlaces } from '../../lib/sanity/queries';

const places = await getPlaces();
---

<BaseLayout
  title='המסלולים שבחפיסה — פק"ל'
  description="כל האתרים והמסלולים שמופיעים על הקלפים, עם מידע לטיול הבא."
>
  <section class="mx-auto max-w-6xl px-4 py-12">
    <h1 class="text-3xl font-bold">המסלולים שבחפיסה</h1>
    {
      places.length === 0 ? (
        <p class="mt-6">התוכן בהכנה. בקרוב יעלו כאן המסלולים והאתרים שעל הקלפים.</p>
      ) : (
        <ul class="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {places.map((place) => (
            <li>
              <PlaceCard place={place} />
            </li>
          ))}
        </ul>
      )
    }
  </section>
</BaseLayout>
```

The empty state is not decoration: at launch this list genuinely has 2–3 entries and may briefly have none, and `/c/<id>` sends people here indirectly.

- [ ] **Step 6: Write `src/pages/treks/[slug].astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import PortableText from '../../components/PortableText.astro';
import SanityImage from '../../components/SanityImage.astro';
import { getPlaceBySlug, getPlaces } from '../../lib/sanity/queries';

export async function getStaticPaths() {
  const places = await getPlaces();
  return places.map((place) => ({ params: { slug: place.slug } }));
}

const { slug } = Astro.params;
const place = await getPlaceBySlug(slug!);
if (!place) return Astro.redirect('/treks', 302);

const facts = [
  place.lengthKm !== undefined && { label: 'אורך', value: `${place.lengthKm} ק"מ` },
  place.durationHours !== undefined && { label: 'משך', value: `${place.durationHours} שעות` },
  place.difficulty && { label: 'רמת קושי', value: place.difficulty },
  place.season && { label: 'עונה מומלצת', value: place.season },
].filter(Boolean) as { label: string; value: string }[];
---

<BaseLayout title={`${place.title} — פק"ל`} description={place.summary}>
  <article class="mx-auto max-w-3xl px-4 py-12">
    <h1 class="text-3xl font-bold">{place.title}</h1>
    {place.region && <p class="mt-1 opacity-70">{place.region}</p>}

    {place.images?.[0] && <SanityImage image={place.images[0]} class="mt-6 rounded-xl" />}

    {
      facts.length > 0 && (
        <dl class="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-white p-4 sm:grid-cols-4">
          {facts.map((fact) => (
            <div>
              <dt class="text-xs opacity-70">{fact.label}</dt>
              <dd class="font-semibold bidi-isolate">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )
    }

    <div class="mt-8"><PortableText value={place.body} /></div>

    {
      place.tips && (
        <section class="mt-8 rounded-xl bg-white p-4">
          <h2 class="text-lg font-semibold">טיפים</h2>
          <p class="mt-2 whitespace-pre-line">{place.tips}</p>
        </section>
      )
    }

    {
      place.mapUrl && (
        <p class="mt-8">
          <a class="underline" href={place.mapUrl} rel="noopener noreferrer" target="_blank">
            פתיחת המיקום במפה
          </a>
        </p>
      )
    }
  </article>
</BaseLayout>
```

Note `bidi-isolate` on the fact values: `5 ק"מ` renders backwards without it.

- [ ] **Step 7: Verify against real content**

Run: `npm run dev`, visit `/treks`, then the page for the `place` created in Task 4. Check the image loads from Sanity's CDN, numeric facts read correctly right-to-left, and the page still has no client-side JavaScript (DevTools → Network → JS: only Astro's tiny runtime, no React).

- [ ] **Step 8: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: add landmark index and landmark detail pages"
git push -u origin feature/trek-pages && gh pr create --fill
```

---

### Task 8: Homepage

**Files:**
- Create: `src/components/FeatureCard.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `BaseLayout`, `WhatsAppCta` (Task 3); `getSiteSettings`, `getPlaces` (Task 5); `SanityImage` (Task 7).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/homepage
```

- [ ] **Step 2: Write `src/components/FeatureCard.astro`**

```astro
---
interface Props {
  title: string;
  body: string;
}

const { title, body } = Astro.props;
---

<div class="rounded-xl bg-white p-5 shadow-sm">
  <h3 class="font-semibold" style="color: var(--color-brand)">{title}</h3>
  <p class="mt-2 text-sm">{body}</p>
</div>
```

- [ ] **Step 3: Rewrite `src/pages/index.astro` to match the mockup**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import FeatureCard from '../components/FeatureCard.astro';
import PlaceCard from '../components/PlaceCard.astro';
import SanityImage from '../components/SanityImage.astro';
import WhatsAppCta from '../components/WhatsAppCta.astro';
import { getPlaces, getSiteSettings } from '../lib/sanity/queries';

const settings = await getSiteSettings();
const places = (await getPlaces()).slice(0, 3);

const heroTitle = settings?.heroTitle ?? 'פק"ל';
const heroTagline = settings?.heroTagline ?? 'נהנים בכל דרך';
const heroText =
  settings?.heroText ??
  'משחק קלפים משפחתי כחול-לבן שמחבר בין משחקים אהובים, אתרים בישראל וחוויות טיול לכל המשפחה.';

const features = [
  {
    title: 'סרקו וצאו לדרך',
    body: 'סרקו את הקוד שבגב הקלף וקבלו גישה מהירה למסלולים, מידע והשראה לטיול הבא.',
  },
  { title: 'מטיילים באמת', body: 'כל קלף מחבר אתכם לאתר או מסלול בארץ, עם הסברים, טיפים והמלצות.' },
  {
    title: 'משחק פק"ל המקורי',
    body: 'קלפי פעולה, דמויות משפחת מטיילים וחוקים ייחודיים לחוויה משפחתית מלאת הפתעות.',
  },
  { title: 'משחקים מוכרים', body: 'שחקו מלחמה, רמי ומשחקי קלפים אהובים עם חפיסה איכותית ומיוחדת.' },
];
---

<BaseLayout title='פק"ל — נהנים בכל דרך' description={heroText}>
  <section class="mx-auto max-w-6xl px-4 py-12">
    <div class="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <h1 class="text-5xl font-bold" style="color: var(--color-brand)">{heroTitle}</h1>
        <p class="mt-2 text-2xl" style="color: var(--color-brand)">{heroTagline}</p>
        <p class="mt-6 max-w-prose">{heroText}</p>
        <div class="mt-8 flex flex-wrap gap-4">
          {
            settings?.whatsappPhone && (
              <WhatsAppCta
                phone={settings.whatsappPhone}
                message={settings.purchaseMessage ?? 'היי, אשמח לפרטים על רכישת המשחק'}
                label="לרכישת המשחק"
              />
            )
          }
          <a
            href="/treks"
            class="inline-block rounded-lg border-2 px-6 py-3 font-semibold"
            style="border-color: var(--color-brand); color: var(--color-brand)"
          >
            למסלולים שבחפיסה
          </a>
        </div>
        <p class="mt-4"><a class="underline" href="/how-to-play">איך משחקים?</a></p>
      </div>
      {settings?.heroImage && <SanityImage image={settings.heroImage} class="rounded-2xl" />}
    </div>

    <div class="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature) => <FeatureCard title={feature.title} body={feature.body} />)}
    </div>

    {
      places.length > 0 && (
        <div class="mt-16">
          <h2 class="text-2xl font-bold">מהמסלולים שבחפיסה</h2>
          <ul class="mt-6 grid gap-6 sm:grid-cols-3">
            {places.map((place) => (
              <li>
                <PlaceCard place={place} />
              </li>
            ))}
          </ul>
        </div>
      )
    }
  </section>
</BaseLayout>
```

Hero copy falls back to the mockup text when `siteSettings` is empty, so the homepage is never blank while Aviv is still filling the CMS.

- [ ] **Step 4: Verify against the mockup**

Run: `npm run dev`. Compare with the approved mockup: wordmark and tagline in navy, green purchase CTA beside an outlined routes CTA, "איך משחקים?" link beneath, four feature cards in mockup order. Check at 375px width — the CTA pair must wrap, not overflow.

- [ ] **Step 5: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: build homepage per approved mockup"
git push -u origin feature/homepage && gh pr create --fill
```

---

### Task 9: How-to-play, corporate, and FAQ pages

**Files:**
- Create: `src/pages/how-to-play.astro`, `src/pages/corporate.astro`, `src/pages/faq.astro`

**Interfaces:**
- Consumes: `BaseLayout`, `WhatsAppCta` (Task 3); `PortableText` (Task 7); `getPage`, `getSiteSettings` (Task 5).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b feature/content-pages
```

- [ ] **Step 2: Write `src/pages/how-to-play.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PortableText from '../components/PortableText.astro';
import { getPage } from '../lib/sanity/queries';

const page = await getPage('how-to-play');
---

<BaseLayout
  title='איך משחקים — פק"ל'
  description='חוקי המשחק והדרכים לשחק בחפיסת פק"ל.'
>
  <section class="mx-auto max-w-3xl px-4 py-12">
    <h1 class="text-3xl font-bold">{page?.title ?? 'איך משחקים'}</h1>
    {
      page?.body ? (
        <div class="mt-6"><PortableText value={page.body} /></div>
      ) : (
        <p class="mt-6">התוכן בהכנה ויעלה בקרוב.</p>
      )
    }
  </section>
</BaseLayout>
```

- [ ] **Step 3: Write `src/pages/corporate.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PortableText from '../components/PortableText.astro';
import WhatsAppCta from '../components/WhatsAppCta.astro';
import { getPage, getSiteSettings } from '../lib/sanity/queries';

const [page, settings] = await Promise.all([getPage('corporate'), getSiteSettings()]);
---

<BaseLayout
  title='מתנה לחברות — פק"ל'
  description='פק"ל כמתנה לעובדים וללקוחות — הזמנות בכמויות.'
>
  <section class="mx-auto max-w-3xl px-4 py-12">
    <h1 class="text-3xl font-bold">{page?.title ?? 'מתנה לחברות'}</h1>
    {
      page?.body ? (
        <div class="mt-6"><PortableText value={page.body} /></div>
      ) : (
        <p class="mt-6">מחפשים מתנה מקורית לעובדים או ללקוחות? נשמח לדבר על הזמנות בכמויות.</p>
      )
    }
    {
      settings?.whatsappPhone && (
        <div class="mt-8">
          <WhatsAppCta
            phone={settings.whatsappPhone}
            message={settings.corporateMessage ?? 'היי, אשמח לפרטים על הזמנה לחברה'}
            label="לפרטים בוואטסאפ"
          />
        </div>
      )
    }
  </section>
</BaseLayout>
```

- [ ] **Step 4: Write `src/pages/faq.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import PortableText from '../components/PortableText.astro';
import { getPage } from '../lib/sanity/queries';

const page = await getPage('faq');
---

<BaseLayout title='שאלות נפוצות — פק"ל' description="תשובות לשאלות נפוצות על המשחק ועל ההזמנה.">
  <section class="mx-auto max-w-3xl px-4 py-12">
    <h1 class="text-3xl font-bold">{page?.title ?? 'שאלות נפוצות'}</h1>
    {
      page?.body ? (
        <div class="mt-6"><PortableText value={page.body} /></div>
      ) : (
        <p class="mt-6">התוכן בהכנה ויעלה בקרוב.</p>
      )
    }
  </section>
</BaseLayout>
```

- [ ] **Step 5: Create the three `page` documents in the Studio**

Run `npm run dev`, open `/studio`, create one `page` per slug: `how-to-play`, `corporate`, `faq`, each with a title and a paragraph of placeholder Hebrew body text. Publish all three, then confirm each route renders CMS content instead of its fallback.

- [ ] **Step 6: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test && npm run build
git add -A
git commit -m "feat: add how-to-play, corporate and FAQ pages"
git push -u origin feature/content-pages && gh pr create --fill
```

---

### Task 10: Playwright smoke suite

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`, `.github/workflows/e2e.yml`
- Modify: `package.json` (add the `test:e2e` script)

**Interfaces:**
- Consumes: every route built in Tasks 3, 6, 7, 8, 9.
- Produces: `npm run test:e2e` and the workflow that runs it.

- [ ] **Step 1: Create the branch and install Playwright**

```bash
git checkout main && git pull && git checkout -b feature/smoke-tests
npm install -D @playwright/test @astrojs/node@11.1.0
npx playwright install chromium
```

**Why a second adapter.** `@astrojs/vercel` does not implement `previewEntrypoint`, so `astro preview` refuses to run as soon as any route is server-rendered — and `/c/[id]` is. Without a preview server there is nothing for Playwright to drive. `@astrojs/node` supports preview, so the e2e run builds with it while production keeps using the Vercel adapter.

The alternative, testing against `astro dev`, was rejected on evidence from this project: the Studio's `projectId` resolving to `undefined` existed **only** in built output and `astro dev` rendered it fine. Testing the dev server would leave that entire failure class invisible.

`11.1.0` is pinned rather than latest: it is nine days old and clears the supply-chain cooldown, where 11.1.1 and 11.1.2 do not. It declares `astro: ^7.0.0`.

The honest caveat: a Node-adapter build is not byte-identical to the Vercel one, so these tests verify the built application, not the exact deployed artifact. Testing against a real Vercel preview deployment would close that last gap and is worth adding later.

- [ ] **Step 1b: Make the adapter selectable in `astro.config.mjs`**

Add the import and swap the adapter line. Everything else in the file stays as it is.

```js
import node from '@astrojs/node';

// E2E=1 builds with the Node adapter so `astro preview` can serve the
// server-rendered /c/[id] route. Production always builds with Vercel.
const useNodeAdapter = process.env.E2E === '1';

export default defineConfig({
  adapter: useNodeAdapter ? node({ mode: 'standalone' }) : vercel(),
  // ...unchanged
});
```

The variable is read at config load, so **both** the build and the preview must run with `E2E=1` — otherwise the build produces a Vercel bundle that preview then refuses to serve.

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:4321' },
  // Tests run against a production build, not the dev server: prerendering and
  // the static/server split only exist in a real build, and that split is
  // exactly what the /c/[id] tests below are checking.
  //
  // E2E=1 on BOTH commands: it selects the Node adapter at config-load time,
  // and `astro preview` cannot serve a Vercel-adapter build.
  webServer: {
    command: 'E2E=1 npm run build && E2E=1 npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write `e2e/smoke.spec.ts`**

```ts
import { expect, test } from '@playwright/test';

test('homepage renders right-to-left in Hebrew', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'he');
  await expect(page.locator('h1')).toContainText('פק');
});

test('an unknown card number redirects home instead of erroring', async ({ page }) => {
  const response = await page.goto('/c/999999');
  expect(response?.status()).toBe(200);
  expect(new URL(page.url()).pathname).toBe('/');
});

test('a malformed card id redirects home', async ({ page }) => {
  await page.goto('/c/not-a-number');
  expect(new URL(page.url()).pathname).toBe('/');
});

// Asserts the contract rather than a specific destination: card 1 may or may
// not have content attached at any given moment, and both outcomes are correct.
// What must never happen is a 404 or an error page.
test('a real card number resolves to a landmark page or home, never an error', async ({ page }) => {
  const response = await page.goto('/c/1');
  expect(response?.status()).toBe(200);
  const path = new URL(page.url()).pathname;
  expect(path === '/' || path.startsWith('/treks/')).toBe(true);
});

test('the landmark index renders', async ({ page }) => {
  await page.goto('/treks');
  await expect(page.locator('h1')).toContainText('המסלולים');
});

test('every WhatsApp link is a valid wa.me URL', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('a[href*="wa.me"]');
  for (let i = 0; i < (await links.count()); i += 1) {
    const href = await links.nth(i).getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/\d{6,}/);
  }
});
```

- [ ] **Step 4: Add the `test:e2e` script**

In `package.json` scripts, add:

```json
"test:e2e": "playwright test"
```

- [ ] **Step 5: Run the suite locally**

Run: `npm run test:e2e`
Expected: 6 passed.

- [ ] **Step 6: Create `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

# Smoke coverage of what ships, NOT a pre-merge gate: it runs post-merge,
# nightly, and on demand. Keeping it off per-PR runs avoids paying for the
# slowest job in the repo on every push.
on:
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '.claude/**'
      - '*.md'
  schedule:
    - cron: '30 2 * * *' # 02:30 UTC
  workflow_dispatch:

concurrency:
  group: e2e-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    # GitHub's default job ceiling is 6 HOURS and it bills every minute of a
    # hung step. Normal runtime here is ~2 min.
    timeout-minutes: 15
    env:
      PUBLIC_SANITY_PROJECT_ID: ${{ vars.PUBLIC_SANITY_PROJECT_ID }}
      PUBLIC_SANITY_DATASET: ${{ vars.PUBLIC_SANITY_DATASET }}
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

Both Sanity values are **repository variables, not secrets** — a project id and dataset name are public identifiers that ship in the client bundle. Storing them as secrets would imply a confidentiality they do not have. The workflow does not run `npm run build` separately: `playwright.config.ts` builds and previews via its `webServer` block.

- [ ] **Step 7: Verify, commit, PR**

```bash
npm run lint && npm run typecheck && npm test
git add -A
git commit -m "test: add Playwright smoke suite covering the QR contract"
git push -u origin feature/smoke-tests && gh pr create --fill
```

- [ ] **Step 8: Confirm the e2e workflow passes post-merge**

After merging, run: `gh run list --workflow=e2e.yml --limit 1`
Expected: the run triggered by the merge to `main` is green.

---

### Task 11: Deployment docs, CMS rebuild hook, launch checklist

**Files:**
- Create: `docs/DEPLOYMENT.md`, `docs/LAUNCH-CHECKLIST.md`
- Modify: `docs/DECISIONS.md` (append if anything was decided differently during implementation)

**Interfaces:**
- Consumes: everything built above.
- Produces: the operating documentation Aviv and a future maintainer depend on.

- [ ] **Step 1: Create the branch**

```bash
git checkout main && git pull && git checkout -b docs/deployment
```

- [ ] **Step 2: HUMAN GATE — create the Vercel deploy hook and connect Sanity**

Nir, in the browser:
1. Vercel → project → **Settings → Git → Deploy Hooks** → create one named `sanity-publish` on branch `main` → copy the URL.
2. sanity.io/manage → project → **API → Webhooks** → **Create webhook**: name `vercel-rebuild`, URL = the deploy hook, dataset `production`, trigger on **Create, Update, Delete**, filter `_type in ["place", "page", "siteSettings"]`, HTTP method POST.

The filter deliberately excludes `card`: card changes are read live by `/c/[id]` and never need a rebuild, so including them would burn build minutes for no visible change.

- [ ] **Step 3: Write `docs/DEPLOYMENT.md`**

```markdown
# Deployment

## How a change reaches production

- **Code:** push to a branch → PR → CI (lint, typecheck, unit tests) → merge to `main` →
  Vercel builds and deploys automatically via its Git integration. Every PR also gets a
  preview deployment.
- **Content:** Aviv publishes in `/studio` → a Sanity webhook calls the Vercel deploy hook
  `sanity-publish` → the site rebuilds. Card-to-landmark links are the exception: `/c/[id]`
  reads them live, so they take effect immediately without a rebuild.

## Environments

| Environment | Trigger | URL |
|---|---|---|
| Production | push to `main` | the production domain |
| Preview | any PR | per-PR `*.vercel.app` URL |

## Environment variables

Both are public identifiers, not secrets, and must be set on **all three** Vercel
environments (Production, Preview, Development):

| Name | Value |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID` | the Sanity project id |
| `PUBLIC_SANITY_DATASET` | `production` |

The same two are GitHub Actions **repository variables**, used by `e2e.yml`.

`SANITY_WRITE_TOKEN` is required **only** for running `scripts/seed-cards.ts` locally. It is
never set in Vercel or CI — the site never writes to the CMS.

## Seeding the deck

Once the deck size is known:

```bash
SANITY_WRITE_TOKEN=<editor token> npx tsx scripts/seed-cards.ts <deck size>
```

Idempotent — safe to re-run, including after the deck grows.

## The printed-QR contract

Cards encode `https://<domain>/c/<card number>`. That URL is permanent and cannot be
corrected after printing. Before any print run: confirm the domain is final, and that
`/c/<n>` resolves for every `n` in the run (seed the cards first). See the design spec §7.
```

- [ ] **Step 4: Write `docs/LAUNCH-CHECKLIST.md`**

```markdown
# Launch checklist

Gates before the site goes live on its real domain.

## Content
- [ ] No placeholder artwork anywhere in production (spec §15).
- [ ] Real WhatsApp number set in `siteSettings`; every CTA opens the right chat.
- [ ] `how-to-play`, `corporate`, `faq` pages hold real copy, not fallback text.
- [ ] At least the launch set of landmark pages is published.

## Cards and QR
- [ ] Deck size confirmed and `scripts/seed-cards.ts` run for the full deck.
- [ ] Domain final and added in Vercel, DNS verified.
- [ ] A physical scan test: scan a printed card with two phones on mobile data.
- [ ] `/c/<n>` for an unlinked card lands on the homepage, not an error.

## Platform
- [ ] Vercel plan appropriate for commercial use, on the account that will own the site.
- [ ] Sanity webhook `vercel-rebuild` verified: publish a content edit, confirm a rebuild.
- [ ] `e2e.yml` green on `main`.

## Handoff to Aviv
- [ ] Walked him through publishing a landmark and attaching it to a card, live.
- [ ] He has his own Sanity login with Editor access.
```

- [ ] **Step 5: Verify, commit, PR**

```bash
git add -A
git commit -m "docs: add deployment guide and launch checklist"
git push -u origin docs/deployment && gh pr create --fill
```

Note: this PR touches only `docs/`, so the `changes` detector skips the heavy jobs and the required checks still report success — the behavior Task 2's job-level `if:` exists to produce. Confirm that is what happens; if a check hangs as "Expected", the detector is misconfigured.

---

## Self-Review

**Spec coverage**

| Spec section | Covered by |
|---|---|
| §5 Stack | Tasks 1, 4 |
| §6 Routes | Tasks 3 (404), 6 (`/c/[id]`), 7 (treks), 8 (home), 9 (content pages), 4 (`/studio`) |
| §7 Card→URL contract | Tasks 5 (pure logic + tests), 6 (route), 10 (smoke), 11 (pre-print gate) |
| §8 Content model | Task 4 |
| §9 Hebrew/RTL | Tasks 1 (font dep), 3 (dir, tokens, logical-property grep), 7 (`bidi-isolate` on numerics) |
| §10 Visual design | Tasks 3, 8 |
| §11 Failure behavior | Tasks 6 (fail home), 7 (empty states), 9 (fallback copy), 3 (404) |
| §12 Testing | Tasks 1, 5 (Vitest), 10 (Playwright) |
| §13 Repo/CI | Task 2 |
| §14 Deferred inputs | "Deferred Inputs" table; seeding script in Task 5; launch checklist in Task 11 |
| §15 Risks | Task 4 (minimal required fields), 7 (region/kind captured), 11 (launch gates) |

**Known gap, accepted:** the spec's build-time "fail loudly if Sanity is unreachable" is Astro's default behavior — an unhandled fetch rejection during `astro build` exits non-zero — so no task adds code for it. Task 6 explicitly handles only the *runtime* case, which is the one that needs a soft failure.

**Type consistency:** `CardLookup` is defined in `src/lib/cards/resolve.ts` (Task 5) and imported by `queries.ts` in the same task; `resolveCardPath` and `parseCardNumber` keep those names in Task 6. `SanityImage` is a type in `src/lib/sanity/types.ts` and also a component name at `src/components/SanityImage.astro` — distinct namespaces, and the only file importing both is `SanityImage.astro` itself, which imports the type only.
