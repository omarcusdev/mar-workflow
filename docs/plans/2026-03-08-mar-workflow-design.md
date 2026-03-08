# Mar-workflow Design

## What It Is

Simplified multi-agent workflow for Claude Code. You describe a problem, it solves it end-to-end with PRs ready and demo video for frontend tasks.

## Commands

| Command | Purpose |
|---------|---------|
| `/mar:solve` | Problem in → analysis → issues → squads → TDD → review → PRs + demo video |
| `/mar:status` | What's running, done, blocked |

## `/mar:solve` Flow

```
User describes problem
    ↓
Tribe-lead analyzes (brainstorming pattern embedded)
    ↓
Creates GitHub issues + execution plan
    ↓
Shows plan → user approves (checkpoint)
    ↓
Opens Apple Terminal tabs (1 per squad)
    ↓
Each squad in isolated worktree:
  → Micro-plan (writing-plans pattern embedded)
  → Implements with TDD (red-green-refactor embedded)
  → If bug: systematic debugging (embedded)
  → Verifies before declaring "done" (embedded)
  → Self-reviews code (requesting-code-review embedded)
  → Creates PR
    ↓
If frontend: Playwright demo walkthrough
  → Detects dev server (package.json)
  → Checks backend — if unavailable, mocks via page.route()
  → Records continuous video navigating the feature
  → Attaches video to PR
  → Removes mocks (never committed)
    ↓
Pings user only on ambiguity (guided autonomy)
    ↓
PRs ready for manual merge
```

## Agents (3)

| Agent | Role |
|-------|------|
| **tribe-lead** | Analyzes problem, creates issues, orchestrates squads, never implements |
| **squad-worker** | Implements in worktree with TDD, debugging, verification, review — all embedded |
| **pr-creator** | Creates formatted PR with description, test plan, video link |

## Hooks (3)

| Hook | Purpose |
|------|---------|
| **block-main-edits** | Prevents writes on main |
| **verify-branch** | Ensures worktree isolation |
| **block-no-verify** | Prevents guard bypass |

## CLI (2 commands)

| Command | Purpose |
|---------|---------|
| `mar init` | Detects stack, installs commands/hooks/agents |
| `mar doctor` | Verifies setup |

## Embedded Superpowers (in squad-worker)

Patterns absorbed directly into agent definitions:
- **TDD** — red-green-refactor mandatory
- **Systematic debugging** — 4 phases before any fix
- **Verification before completion** — evidence before claims
- **Code review** — self-review before PR
- **Finishing branch** — clean PR creation flow

## Playwright Demo Walkthrough

For frontend tasks, after implementation is complete:
1. Detect dev server start command from package.json scripts
2. Start dev server locally
3. Check if backend APIs respond — if not, set up temporary mocks via `page.route()`
4. Navigate the feature end-to-end recording a continuous video
5. Attach video to PR
6. Tear down mocks and dev server — mocks are never committed

## What Mar Does NOT Have

- Observability stack (OTEL, ClickHouse)
- Discord bridge
- Daemon
- 15 extra hooks (heartbeat, rogue-detector, context-watchdog, etc.)
- 9 extra commands (heal, map-codebase, new-brief, release, etc.)
- Superpowers plugin dependency
- Complex config system

## Source

Based on ale-workflow v1.6.0 (Sharpi-AI/ale-workflow), stripped and redesigned for simplicity and autonomy.
