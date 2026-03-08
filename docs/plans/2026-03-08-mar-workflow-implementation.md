# Mar-workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a simplified multi-agent workflow for Claude Code — you describe a problem, it solves it end-to-end with PRs and Playwright demo videos.

**Architecture:** Two commands (`/mar:solve`, `/mar:status`), three agents (tribe-lead, squad-worker, pr-creator), three hooks (block-main-edits, verify-branch, block-no-verify), minimal CLI (`mar init`, `mar doctor`). Superpowers patterns (TDD, debugging, verification, review) embedded directly in squad-worker agent definition.

**Tech Stack:** Node.js 18+, bash hooks, markdown commands/agents, YAML config, Playwright for frontend demos.

**Source:** Adapted from ale-workflow v1.6.0 with heavy simplification.

---

### Task 1: Project Scaffold

**Files:**
- Create: `cli/bin/mar`
- Create: `cli/package.json`
- Create: `cli/src/utils.js`
- Create: `CLAUDE.md`
- Create: `.gitignore`
- Create: `mar.defaults.yaml`

**Step 1: Create `.gitignore`**

```
node_modules/
.DS_Store
tests/bats-core/
*.log
```

**Step 2: Create `cli/package.json`**

```json
{
  "name": "mar-workflow",
  "version": "0.1.0",
  "description": "Multi-agent workflow for Claude Code — simplified, autonomous problem solving",
  "bin": {
    "mar": "./bin/mar"
  },
  "engines": {
    "node": ">=18"
  },
  "license": "MIT"
}
```

**Step 3: Create `cli/bin/mar`**

Entry point routing to subcommands: `init`, `doctor`, `version`. Minimal — just a switch statement dispatching to `src/*.js` handlers.

Adapt from ale-workflow `cli/bin/ale`:
- Rename all `ale` references to `mar`
- Remove commands: `update`, `setup`, `start`, `tribe`, `daemon`, `discord`, `dispatch`, `test`, `project`
- Keep: `init`, `doctor`, `version`
- Update usage text

**Step 4: Create `cli/src/utils.js`**

Adapt from ale-workflow `cli/src/utils.js`:
- Rename all `ale` references to `mar`
- Keep: `runCommand()`, `fileExists()`, `readFile()`, `getVersion()`, hook configuration helpers
- Remove OTEL-specific helpers
- Update config paths: `.claude/mar.config.yaml`
- Update env var prefixes: `ALE_*` → `MAR_*`

**Step 5: Create `mar.defaults.yaml`**

```yaml
review:
  strategy: native

quality_gates:
  lint: null
  test: null

self_heal:
  max_retries_per_strategy: 3
  max_total_retries: 5

playwright:
  enabled: auto
  mock_backend: true
  video_dir: .mar/videos
```

**Step 6: Create `CLAUDE.md`**

Project conventions for mar-workflow itself:
- Branch safety (worktree-only)
- No push to main
- Guard bypass policy
- Testing instructions

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: project scaffold — CLI entry point, utils, config defaults"
```

---

### Task 2: Hooks (3 files)

**Files:**
- Create: `hooks/block-main-edits.sh`
- Create: `hooks/verify-branch.sh`
- Create: `hooks/block-no-verify.sh`

**Step 1: Create `hooks/block-main-edits.sh`**

Adapt from ale-workflow `hooks/block-main-edits.sh`:
- Rename `ALE_AGENT_ROLE` → `MAR_AGENT_ROLE`
- Rename `.ale-clone` → `.mar-clone`
- Rename `/ale:fix` → `/mar:solve`
- Remove OTEL emission (`otel_emit_log`) — replace with no-op or simple stderr log
- Remove `hooks/lib/otel-emit.sh` dependency
- Keep all the guard logic (PreToolUse blocking for Write, Edit, Bash on main)
- Keep role-based bypass for tribe-lead/orchestrator ops commands

**Step 2: Create `hooks/verify-branch.sh`**

Adapt from ale-workflow `hooks/verify-branch.sh`:
- Rename `ALE_EXPECTED_BRANCH` → `MAR_EXPECTED_BRANCH`
- Rename `ALE_EXPECTED_CLONE` → `MAR_EXPECTED_CLONE`
- Rename `ALE_VERIFY_BRANCH` → `MAR_VERIFY_BRANCH`
- Rename `ALE_VERIFY_BRANCH_STRICT` → `MAR_VERIFY_BRANCH_STRICT`
- Remove `ALE_EXPECTED_WORKTREE` (deprecated alias)

**Step 3: Create `hooks/block-no-verify.sh`**

Adapt from ale-workflow `hooks/block-no-verify.sh`:
- Remove OTEL emission — replace with stderr log
- Remove `hooks/lib/otel-emit.sh` dependency
- Keep all guard patterns (--no-verify, LEFTHOOK=0, etc.)
- Update comments from "ALE Workflow" to "MAR Workflow"

**Step 4: Commit**

```bash
git add hooks/
git commit -m "feat: safety hooks — block-main-edits, verify-branch, block-no-verify"
```

---

### Task 3: Agents — pr-creator

**Files:**
- Create: `agents/pr-creator.md`

**Step 1: Create `agents/pr-creator.md`**

Adapt from ale-workflow `agents/pr-creator.md`:
- Keep the full PR creation logic (diff reading, title formatting, body building, deduplication)
- Update references: `ale` → `mar`
- Keep: conventional commit title format, issue linking with `Closes #N`, heredoc body

**Step 2: Commit**

```bash
git add agents/
git commit -m "feat: pr-creator agent definition"
```

---

### Task 4: Agents — squad-worker (with embedded superpowers)

**Files:**
- Create: `agents/squad-worker.md`

This is the most critical file. The squad-worker embeds TDD, systematic debugging, verification, and review patterns directly.

**Step 1: Create `agents/squad-worker.md`**

Structure:
```markdown
---
name: squad-worker
model: opus
description: Autonomous implementation agent. Works in isolated worktrees with TDD, systematic debugging, evidence-based verification, and self-review.
isolation: worktree
tools: Read, Write, Edit, Bash, Glob, Grep, TaskGet, TaskUpdate, SendMessage
---

<role>...</role>

<hard-rules>
(from ale squad-worker: never pivot silently, never commit to main,
 never bypass hooks, report blockers within 1 turn)
</hard-rules>

<workflow>
## Phase 1: Triage
(classify task, read context, claim task)

## Phase 2: Plan
(micro-plan with exact steps — writing-plans pattern embedded)

## Phase 3: Implement (TDD)
(RED-GREEN-REFACTOR cycle — TDD pattern embedded)
- Write one failing test
- Verify it fails for the right reason
- Write minimal code to pass
- Verify it passes
- Refactor if needed
- Commit

## Phase 4: Debug (if needed)
(systematic-debugging pattern embedded)
- Phase A: Root cause investigation
- Phase B: Pattern analysis
- Phase C: Hypothesis testing (one variable at a time)
- Phase D: Fix implementation
- Circuit breaker: 3+ fixes failed → escalate

## Phase 5: Verify
(verification-before-completion pattern embedded)
- Run test suite, read full output
- Evidence before claims — no "should pass"
- Check exit codes

## Phase 6: Review
(requesting-code-review pattern embedded)
- Self-review checklist: code quality, architecture, testing, requirements
- If issues found: fix and re-verify

## Phase 7: Complete
(finishing-a-development-branch pattern embedded)
- Push branch
- Create PR via pr-creator
- Report completion to tribe-lead via SendMessage
</workflow>

<self-healing>
(circuit breaker from ale squad-worker)
- 6 strategies: direct fix → widen context → rollback → alternative → simplify → escalate
- Per-strategy limit: 3 retries
- Total limit: 5 retries
- Escalation format when exhausted
</self-healing>

<error-parsing>
(structured error objects mapping to fix strategies)
</error-parsing>
```

**Step 2: Commit**

```bash
git add agents/squad-worker.md
git commit -m "feat: squad-worker agent with embedded TDD, debugging, verification, review"
```

---

### Task 5: Agents — tribe-lead

**Files:**
- Create: `agents/tribe-lead.md`

**Step 1: Create `agents/tribe-lead.md`**

This is the autonomous problem-solver. Adapted from ale tribe-lead but with key differences:
- Analyzes problems (brainstorming pattern embedded)
- Creates GitHub issues autonomously
- Plans execution (which issues, how many squads)
- Shows plan for approval (guided autonomy checkpoint)
- Spawns squads in terminal tabs
- Monitors progress, handles blockers
- Pings human only on ambiguity

Structure:
```markdown
---
name: tribe-lead
model: opus
description: Autonomous problem solver. Analyzes problems, creates issues, orchestrates squads, never implements.
tools: Read, Write, Edit, Bash, Glob, Grep, Task(squad-worker, Explore), TaskList, TaskGet, TaskCreate, TaskUpdate, SendMessage, TeamCreate, TeamDelete, AskUserQuestion
---

<role>
You are the tribe lead — an autonomous problem solver.
The human gives you a problem. You break it down, create issues,
dispatch squads, monitor progress, and deliver PRs.
You NEVER implement. You coordinate.
</role>

<principles>
1. Never implement — dispatch everything
2. Guided autonomy — work autonomously, ping human on ambiguity
3. Break problems into GitHub issues before dispatching
4. Show plan and wait for approval before spawning squads
5. Monitor squad progress, unblock when stuck
6. 3 items max per section, bullet points only (ADHD-friendly)
</principles>

<problem-analysis>
(brainstorming pattern embedded — but streamlined)
1. Understand the problem (read codebase, explore)
2. Break into discrete issues (each one independently solvable)
3. Determine dependencies between issues
4. Present plan: issues + squad allocation + order
5. Wait for human approval
</problem-analysis>

<dispatch>
1. Create GitHub issues via gh CLI
2. Create team via TeamCreate
3. For each squad: open Apple Terminal tab running Claude Code in worktree
4. Assign tasks, monitor via TaskList/SendMessage
5. React to teammate messages immediately
</dispatch>

<completion>
For each squad that finishes:
1. Verify completion evidence (tests + review)
2. If frontend task: trigger Playwright demo walkthrough
3. PR created by squad-worker via pr-creator
4. Report to human: "PR #N ready for review"
</completion>

<playwright-demo>
For tasks that modify frontend (detected by file extensions: .tsx, .jsx, .vue, .svelte, .html, .css):
1. Detect dev server command from package.json scripts
2. Start dev server
3. Check if backend APIs respond
4. If backend unavailable: set up temporary mocks via page.route()
   - Analyze API calls in the code
   - Create reasonable mock responses
   - Intercept requests, return mocks
5. Navigate the feature end-to-end with Playwright
6. Record continuous video
7. Attach video to PR
8. Tear down: stop dev server, mocks are never committed
</playwright-demo>
```

**Step 2: Commit**

```bash
git add agents/tribe-lead.md
git commit -m "feat: tribe-lead agent — autonomous problem solver with Playwright demo"
```

---

### Task 6: Command — `/mar:solve`

**Files:**
- Create: `commands/mar/solve.md`

**Step 1: Create `commands/mar/solve.md`**

This is the main entry point. The user runs `/mar:solve <problem description>`.

```markdown
---
name: mar:solve
description: Describe a problem — tribe analyzes, creates issues, dispatches squads, delivers PRs
argument-hint: "<describe the problem to solve>"
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - Task(squad-worker, Explore)
  - TaskList
  - TaskGet
  - TaskCreate
  - TaskUpdate
  - SendMessage
  - TeamCreate
  - TeamDelete
  - AskUserQuestion
---
```

Process:
1. Derive repo slug
2. Gather state (Explore sub-agent: git state, existing branches, open issues)
3. Analyze the problem (read relevant code, understand scope)
4. Break into GitHub issues (with labels, descriptions, acceptance criteria)
5. Present plan to human: "I'll create N issues and dispatch N squads. Here's the plan: ..."
6. On approval: create issues, spawn squads in terminal tabs
7. Monitor progress loop
8. On completion: verify evidence, trigger Playwright demo if frontend, report PRs

**Step 2: Commit**

```bash
git add commands/
git commit -m "feat: /mar:solve command — end-to-end problem solving"
```

---

### Task 7: Command — `/mar:status`

**Files:**
- Create: `commands/mar/status.md`

**Step 1: Create `commands/mar/status.md`**

Adapted from ale status.md but simplified:

```markdown
---
name: mar:status
description: Show active squads, branches, task progress
allowed-tools:
  - Read
  - Bash
  - Glob
  - Grep
  - TaskList
  - TaskGet
---
```

Display:
- Active squads (alive/dead/done)
- Task progress (pending/in_progress/completed/blocked)
- Active branches with recent commits
- PRs created

Remove from ale version:
- OTEL status
- Rogue agent alerts
- Brief discovery
- Heartbeat liveness (simplified: just check PIDs)

**Step 2: Commit**

```bash
git add commands/mar/status.md
git commit -m "feat: /mar:status command — squad and task overview"
```

---

### Task 8: CLI — `mar init`

**Files:**
- Create: `cli/src/init.js`

**Step 1: Create `cli/src/init.js`**

Adapt from ale-workflow `cli/src/init.js` with heavy simplification:

Keep:
- Stack detection (`detectStack()` — Go, Node, Python, Rust)
- Test framework detection
- File installation (commands, agents, hooks → `.claude/`)
- Config generation (`mar.config.yaml`)
- Hook configuration in `.claude/settings.json`
- Agent Teams enablement in global settings

Remove:
- Codex MCP setup
- OTEL/observability setup
- Entire.io setup
- Agent Browser setup
- Discord setup
- Lefthook installation
- Lockdown features
- Complex interactive prompts

Add:
- Playwright detection (`npx playwright --version` or package.json dependency)
- Simple config for `playwright.enabled: auto|true|false`

Flow:
1. Detect stack and test framework
2. Check for Playwright
3. Generate `mar.config.yaml`
4. Copy commands/, agents/, hooks/ to `.claude/`
5. Configure hooks in `.claude/settings.json`
6. Enable Agent Teams globally
7. Print summary

**Step 2: Commit**

```bash
git add cli/src/init.js
git commit -m "feat: mar init — stack detection, file installation, config generation"
```

---

### Task 9: CLI — `mar doctor`

**Files:**
- Create: `cli/src/doctor.js`

**Step 1: Create `cli/src/doctor.js`**

Adapt from ale-workflow `cli/src/doctor.js`:

Keep:
- Environment checks (Claude Code, git, gh, node)
- Installation checks (commands, agents, hooks present)
- Config validation
- Hook configuration checks
- Pass/fail reporting

Remove:
- Codex MCP check
- OTEL check
- Entire.io check
- Discord check
- Agent Browser check
- Lefthook check

Add:
- Playwright check (if enabled in config)
- Dev server detection check

Target: ~12 checks vs ale's ~27

**Step 2: Commit**

```bash
git add cli/src/doctor.js
git commit -m "feat: mar doctor — environment and installation health checks"
```

---

### Task 10: CLI — `mar version`

**Files:**
- Create: `cli/src/version.js`

**Step 1: Create `cli/src/version.js`**

Simple — print mar-workflow version, Claude version, gh version.
Direct adapt from ale version.js with rename.

**Step 2: Commit**

```bash
git add cli/src/version.js
git commit -m "feat: mar version command"
```

---

### Task 11: Tab Spawning for Apple Terminal

**Files:**
- Create: `cli/src/spawn.js`

**Step 1: Create `cli/src/spawn.js`**

Extract and improve tab spawning logic from ale-workflow's `start.js`:

Focus on Apple Terminal (user's terminal):
- Use AppleScript `tell application "Terminal"` to create new tabs
- Improve the current approach (which uses fragile `keystroke "t"`)
- Better approach: use `do script` in a new tab directly

```javascript
const openTabInAppleTerminal = (cmd) => {
  const script = `
    tell application "Terminal"
      activate
      do script "${escapeApplescript(cmd)}"
    end tell
  `;
  runOsascript(script);
};
```

Also keep fallback support for:
- tmux (if installed)
- iTerm2 (if detected)
- Ghostty (if detected)

Export: `openTab(cmd)` — auto-detects terminal and opens.

This module is used by the tribe-lead when spawning squads.

**Step 2: Commit**

```bash
git add cli/src/spawn.js
git commit -m "feat: terminal tab spawning with Apple Terminal focus"
```

---

### Task 12: Playwright Demo Module

**Files:**
- Create: `cli/src/playwright-demo.js`

**Step 1: Create `cli/src/playwright-demo.js`**

Utility that the squad-worker/tribe-lead calls to record a demo video:

```javascript
const recordDemo = async ({ url, scenario, outputPath, mockRoutes }) => {
  // 1. Launch browser with video recording
  // 2. Set up route mocks if provided
  // 3. Execute scenario steps (navigate, click, fill, etc.)
  // 4. Save video to outputPath
  // 5. Clean up
};
```

Features:
- Uses `@playwright/test` or Playwright MCP for browser control
- `video: { mode: 'on', dir: videoDir }` for recording
- `page.route()` for API mocking (never committed)
- Smart scenario detection from issue/PR description
- Returns video file path for PR attachment

Note: The actual demo navigation will be driven by the squad-worker agent using Playwright MCP tools interactively. This module provides the setup/teardown and video config.

**Step 2: Commit**

```bash
git add cli/src/playwright-demo.js
git commit -m "feat: Playwright demo recording module with API mocking"
```

---

### Task 13: Shared Patterns File

**Files:**
- Create: `commands/mar/_patterns.md`

**Step 1: Create `commands/mar/_patterns.md`**

Adapted from ale-workflow `commands/ale/_patterns.md` — heavily simplified:

Keep:
- Repo slug derivation
- Teammate prompt template (with `MAR_*` env vars)
- PR creation via pr-creator delegation
- Review verification gate
- Anti-hallucination pattern
- Silent pivot prevention

Remove:
- OTEL stack check
- Project board update
- Lifecycle span emission
- All `ALE_*` references → `MAR_*`

Add:
- Playwright demo trigger pattern (detect frontend files, decide if demo needed)

**Step 2: Commit**

```bash
git add commands/mar/_patterns.md
git commit -m "feat: shared command patterns — repo slug, templates, review gate"
```

---

### Task 14: Config Schema

**Files:**
- Create: `cli/src/config-schema.js`

**Step 1: Create config validation schema**

Define the `mar.config.yaml` schema:

```yaml
review:
  strategy: native | codex

quality_gates:
  lint: <command or null>
  test: <command or null>

self_heal:
  max_retries_per_strategy: 3
  max_total_retries: 5

playwright:
  enabled: auto | true | false
  mock_backend: true | false
  video_dir: .mar/videos
  dev_server: <command or null — auto-detected from package.json>

dev_environment:
  ports: []
  env_file: null
```

Used by `mar init` (generation) and `mar doctor` (validation).

**Step 2: Commit**

```bash
git add cli/src/config-schema.js
git commit -m "feat: config schema for mar.config.yaml"
```

---

### Task 15: Lefthook Configuration

**Files:**
- Create: `lefthook.yml`

**Step 1: Create `lefthook.yml`**

Simplified from ale-workflow:

Keep:
- `pre-commit`: block commits on main (allow worktrees/clones)
- `pre-push`: block pushes to main/master

Remove:
- post-commit event emission
- post-merge event emission
- post-checkout branch switch prevention
- nuke-guard integration
- ale-emit references

**Step 2: Commit**

```bash
git add lefthook.yml
git commit -m "feat: lefthook config — pre-commit and pre-push guards"
```

---

### Task 16: README and Initial Docs

**Files:**
- Create: `README.md`

**Step 1: Create `README.md`**

Cover:
- What mar-workflow is (one paragraph)
- Quick start (`npm i -g mar-workflow && mar init && mar doctor`)
- Two commands: `/mar:solve`, `/mar:status`
- How it works (the flow diagram from design doc)
- Configuration reference
- Differences from ale-workflow

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with quick start, commands, and flow"
```

---

### Task 17: Integration Test — Full Flow

**Files:**
- Create: `tests/integration/solve-flow.bats`
- Create: `tests/test_helper.bash`

**Step 1: Write integration test for the solve flow**

Test that:
- `mar init` installs files correctly
- `mar doctor` passes in a clean project
- Hooks are configured in settings.json
- Commands are installed to `.claude/commands/mar/`
- Agents are installed to `.claude/agents/`

**Step 2: Run tests to verify they fail (TDD RED)**

```bash
tests/bats-core/bin/bats tests/integration/solve-flow.bats
```

Expected: FAIL (files don't exist yet in test project)

**Step 3: Verify the implementation makes tests pass (TDD GREEN)**

Run against a temp directory with `mar init` applied.

**Step 4: Commit**

```bash
git add tests/
git commit -m "test: integration tests for mar init and doctor"
```

---

### Task 18: Final Wiring and First Release

**Step 1: Make CLI executable**

```bash
chmod +x cli/bin/mar
```

**Step 2: Link locally for testing**

```bash
cd cli && npm link
```

**Step 3: Run `mar init` in a test project**

Verify everything installs correctly.

**Step 4: Run `mar doctor` in same project**

Verify all checks pass.

**Step 5: Tag v0.1.0**

```bash
git tag v0.1.0
git push origin main --tags
```

**Step 6: Commit any final fixes**

```bash
git commit -m "chore: v0.1.0 release — mar-workflow initial version"
```

---

## Execution Order Summary

```
Task 1:  Scaffold (package.json, bin, utils, defaults, CLAUDE.md)
Task 2:  Hooks (3 files — safety guards)
Task 3:  Agent: pr-creator
Task 4:  Agent: squad-worker (with embedded superpowers)
Task 5:  Agent: tribe-lead (with Playwright demo orchestration)
Task 6:  Command: /mar:solve
Task 7:  Command: /mar:status
Task 8:  CLI: mar init
Task 9:  CLI: mar doctor
Task 10: CLI: mar version
Task 11: Tab spawning module
Task 12: Playwright demo module
Task 13: Shared patterns
Task 14: Config schema
Task 15: Lefthook config
Task 16: README
Task 17: Integration tests
Task 18: Final wiring and release
```

Dependencies:
- Tasks 1-2 are foundational (do first)
- Tasks 3-5 (agents) can run in parallel
- Tasks 6-7 (commands) depend on agents + patterns (Task 13)
- Tasks 8-10 (CLI) depend on scaffold (Task 1) + config schema (Task 14)
- Task 11 (spawn) is independent
- Task 12 (Playwright) is independent
- Task 17 (tests) depends on everything else
- Task 18 depends on everything
