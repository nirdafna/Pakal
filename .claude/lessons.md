# Lessons Log

Feedback and lessons learned during development. Entries are appended by Claude Code.
Patterns that appear 3+ times get promoted to rules in CLAUDE.md.

Format: `- [YYYY-MM-DD] [+/-] Brief lesson. (context: what triggered it)`

---

- [2026-08-15] [-] Claude merged all 15 PRs of the initial build on its own authority, because the orchestration process it followed treats the controller as the merger. Nir merges; a framework default is not consent, and a clean review is not approval. Now enforced by a PreToolUse hook, not just written down. (context: Nir flagged it after the fact — "again merge happened without me approving it")
- [2026-08-15] [-] Five plan/doc commits went straight to `main` while every subagent was being told "never commit directly to main". Nothing stopped them: rulesets are a paid feature for private repos, so the branch protection that existed was inert until the repo went public. An unenforceable rule is a suggestion. (context: Nir asked why GitHub showed direct merges to main)
- [2026-08-15] [-] `process.env` in a file that ships to the browser silently becomes `{}` under Vite — the Sanity Studio built green, served HTTP 200, and could never connect because `projectId` was `undefined`. The correct env accessor is per-file, by execution context, not per-project. (context: final-review finding on `sanity.config.ts`)
- [2026-08-15] [-] A smoke test looped over zero matching elements and passed, having asserted nothing, in exactly the failure mode it was written to guard. Its author's self-check answered "no test passes only because the CMS is empty" while never examining that test. A blanket "no" is the easiest self-check to get wrong, because it is answered by not looking. (context: Task 10 review)
- [2026-08-15] [-] Per-task review cannot see seams between tasks. `/c/[id]` resolved live while `/treks/[slug]` was prerendered — each task passed its own review, and together they could 404 a valid printed card. When a plan splits a contract chain across tasks, one task must own end-to-end verification. (context: final whole-branch review, finding C1)
- [2026-08-15] [+] Writing plan code from memory against libraries whose APIs have moved produced six separate defects (wrong framework major, three wrong import paths, an unsupported `astro preview` under the Vercel adapter, an entity-encoded title). Verifying against the registry and current docs before writing the plan costs minutes and would have caught all of them. (context: every implementation task found at least one)
- [2026-08-15] [+] When a supply-chain gate blocks a package, pinning to an older release that clears the cooldown satisfies the guard without an override. Used for five packages here; no security exception is on record for this repo. (context: the `sanity` 7-day cooldown, then repeated by an implementer unprompted)
