# Shared Prompt Patterns

Canonical patterns referenced by mar commands.

---

## Repo Slug

Derive once at session start, reuse everywhere:

```bash
REPO_SLUG=$(basename "$(git remote get-url origin 2>/dev/null || basename "$(pwd)")" .git)
```

Use for team names, branch prefixes, task/team directory scoping.

---

## Teammate Prompt Template

The canonical template for spawning worker agents. Replace `{placeholders}` at spawn time.

```
You are a teammate in the {team-name} squad. Your name is {name}.

## Branch Verification (MANDATORY — RUN BEFORE ANYTHING ELSE)
Run these commands NOW:
  git fetch origin
  git checkout -b {worker-branch} origin/{base-branch}
  CURRENT=$(git branch --show-current)
  echo "Current branch: $CURRENT"
  echo "Expected: {worker-branch}"
If mismatch: STOP. Send message to team lead.

## Your Mission
{task-description}

{if-issue}
## Issue Reference
This task is from GitHub issue #{N}: {title}
Include "Ref #{N}" in your commit messages.
{/if-issue}

## Context
Read CLAUDE.md first, then: {context-files}

## Session Correlation
  export MAR_PARENT_SESSION_ID="{parent-session-id}"
  export MAR_TEAM_NAME="{team-name}"

## When Done
1. TaskUpdate(taskId, status: completed) FIRST
2. SendMessage to team lead with: what changed, test evidence, review status
```

Parameters:
| Placeholder | Source |
|---|---|
| {team-name} | "mar-$REPO_SLUG" |
| {name} | Worker name (e.g., "auth-worker") |
| {worker-branch} | `feat/<team>-<slug>` or `fix/<team>-<slug>` |
| {base-branch} | `origin/main` |
| {task-description} | Full task body with acceptance criteria |
| {context-files} | Relevant file paths |
| {parent-session-id} | `$CLAUDE_SESSION_ID` from spawning session |

---

## PR Creation via pr-creator

All commands delegate PR creation to the pr-creator sub-agent:

```
Agent(subagent_type: "pr-creator", prompt: "
  branch: {branch}
  issue_refs: {issue-numbers}
  summary: {what-changed}
  review_notes: {review-status}
")
```

NEVER merge or cherry-pick to main. All changes go through PRs.

---

## Review Verification Gate

Check worker completion evidence:

1. Test Evidence (mandatory):
   - Actual output = accept
   - BLOCKED with reason = evaluate
   - Missing = reject: "Show me test output"

2. Review Evidence:
   - Self-review checklist completed = accept
   - Missing = reject: "Complete self-review before push"

---

## Frontend Detection

Detect if changes are frontend-related by checking file extensions in the diff:

```bash
git diff origin/main...HEAD --name-only | grep -qE '\.(tsx|jsx|vue|svelte|html|css|scss)$'
```

If frontend detected and `playwright.enabled` is not `false`:
1. Detect dev server from package.json
2. Check backend availability
3. Mock if needed via page.route()
4. Record demo video
5. Attach to PR

---

## Anti-Hallucination

Ground every claim in tool output. Never state facts you did not read in this session.
Read-before-claim. Cite sources or mark (unverified).

---

## Silent Pivot Prevention

Silent pivot = doing Y when asked to do X, reporting as if you did X.
Transparent alternatives with disclosure and approval are fine.
Lack of disclosure is the violation.
