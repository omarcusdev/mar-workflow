---
name: mar:status
description: Show active squads, branches, task progress, and PR status
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - TaskList
  - TaskGet
---
<objective>
Read-only overview of all active work coordinated by mar-workflow.
Gather state from git, task lists, and GitHub, then present a concise status.
</objective>

<process>
## Step 1: Derive Repo Slug

```bash
REPO_SLUG=$(basename "$(git remote get-url origin 2>/dev/null || basename "$(pwd)")" .git)
```

## Step 2: Gather State

### Teams and Tasks
- Read task files from `~/.claude/tasks/` matching `*$REPO_SLUG*`
- Classify: pending, in_progress, completed, blocked
- For each in_progress task: check PID liveness

### Git State
- Active branches: `git branch -r | grep -E 'feat/mar|fix/mar'`
- Recent commits per branch: `git log --oneline -3 {branch}`
- Worktrees: `git worktree list`
- Stale branches: no commits in 30+ minutes

### GitHub
- Open PRs: `gh pr list --state open --json number,title,headRefName,url`
- Recent PRs: `gh pr list --state merged --json number,title --limit 5`
- Open issues with mar labels: `gh issue list --state open --limit 10`

## Step 3: Display

```
MAR STATUS — $REPO_SLUG
========================
SQUADS (N)
  name: ALIVE | N/M tasks done
  name: STALE (no activity 30m+) | N/M done
  name: DONE | all complete

TASKS
  N done | N in_progress | N pending | N blocked

ACTIVE BRANCHES
  [feat/mar-repo-slug] — N commits, last Xm ago
  [fix/mar-repo-fix] — N commits, last Xm ago

OPEN PRS
  #N: title — {url}

+N more
```

Omit empty sections. 3 items max per section, "+N more" if needed.

## Step 4: Suggestions

If stale work found:
- "Agent on {branch} has no commits for 30m+ — check or kill?"

If all tasks done:
- "All work complete. N PRs ready for review."

If blocked tasks:
- "N tasks blocked — review blockers?"
</process>
