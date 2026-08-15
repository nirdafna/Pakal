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

case "$cmd" in
  *"gh pr merge"*)
    deny "Blocked: merging is Nir's decision, not Claude's. Report the review outcome and hand over the PR URL so he can merge. See CLAUDE.md → Workflow gates."
    ;;
esac

case "$cmd" in
  *"git commit"*)
    branch=$(git branch --show-current 2>/dev/null || echo "")
    if [ "$branch" = "main" ]; then
      deny "Blocked: direct commit to main. Every change goes through a branch and a PR — docs and plan fixes included. Create a branch first: git checkout -b docs/<topic>. See CLAUDE.md → Workflow gates."
    fi
    ;;
esac

exit 0
