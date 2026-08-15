## What & why

<!-- One or two sentences. Link the spec or plan section if there is one. -->

## Checklist

- [ ] Pre-merge gates run (`/simplify` + `/code-review` on the diff).
- [ ] RTL: logical properties only — no `left`/`right`, no `ml-`/`mr-`/`pl-`/`pr-`.
- [ ] No leftover `console.log` / `debugger` / stray `TODO`.
- [ ] New behavior has at least one test; a bug fix has a regression test.
