#!/usr/bin/env bash
# PreToolUse guard for Bash commands in this repository.
#
# Two rules that were broken during the initial build and are now mechanical
# rather than advisory, because instructions alone did not hold:
#
#   1. Claude does not merge PRs. Nir merges. A clean review is not consent.
#   2. Nothing commits directly to `main`. Branch protection enforces this on
#      the remote, but only since the repo became public — this catches the
#      local commit before it is ever made, with a clearer message.
#
# Both deny at the harness level, so there is no judgement call left to make.
# A human can still run either command themselves in their own shell.
set -euo pipefail

payload=$(cat)
cmd=$(printf '%s' "$payload" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

deny() {
  jq -n --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# The `gh pr merge` deny that used to sit here was removed on 2026-08-16, at
# Nir's instruction, to match how edut-app works. It is not a loosening — the
# gate moved somewhere this hook cannot reach and Claude cannot forge.
#
# It was replaced by branch protection on `main` with `enforce_admins: true`
# and four required checks (changes, lint, typecheck, unit-tests). That gates
# on GREEN CI rather than on WHO is merging, which matters because Claude runs
# with Nir's GitHub credentials — same account, full `repo` scope. No
# identity-based rule could ever have told the two apart, and a local hook can
# only ever be a drift guard, since anything Claude can type it can type
# unprompted.
#
# Consequence, deliberate: nobody bypasses, Nir included. A broken required
# check blocks everyone until it is fixed or the ruleset is disabled.
#
# `e2e` is deliberately NOT a required check: it runs post-merge and nightly by
# design, so requiring it would deadlock every PR.

case "$cmd" in
  *"git commit"*)
    branch=$(git branch --show-current 2>/dev/null || echo "")
    if [ "$branch" = "main" ]; then
      deny "Blocked: direct commit to main. Every change goes through a branch and a PR — docs and plan fixes included. Create a branch first: git checkout -b docs/<topic>. See CLAUDE.md → Workflow gates."
    fi
    ;;
esac

exit 0
