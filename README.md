# mar-workflow

Simplified multi-agent workflow for Claude Code. Describe a problem, get PRs and Playwright demo videos back.

## Quick Start

```bash
npm i -g mar-workflow
cd your-project
mar init
mar doctor
```

## Commands

### `/mar:solve <problem>`

End-to-end problem solving. The tribe-lead analyzes your problem, creates GitHub issues, dispatches squad workers in parallel, and delivers PRs with optional Playwright demo videos.

```
/mar:solve "Add dark mode toggle to the settings page"
```

**Flow:**

```
You describe a problem
  → tribe-lead analyzes codebase
  → breaks into GitHub issues
  → shows plan for approval
  → spawns squad workers (parallel terminal tabs)
  → each squad: TDD → implement → debug → verify → self-review → PR
  → frontend changes get Playwright demo videos
  → you review PRs
```

### `/mar:status`

Shows active squads, task progress, branches, and PRs.

## How It Works

**Three agents:**

| Agent | Role |
|-------|------|
| `tribe-lead` | Analyzes problems, creates issues, dispatches squads, monitors progress. Never implements. |
| `squad-worker` | Autonomous implementer with embedded TDD, systematic debugging, verification, and self-review. Works in isolated worktrees. |
| `pr-creator` | Creates PRs with conventional titles, issue linking, and deduplication. |

**Three safety hooks:**

| Hook | Purpose |
|------|---------|
| `block-main-edits` | Prevents writing to files on main/master |
| `verify-branch` | Validates expected branch after git operations |
| `block-no-verify` | Blocks `--no-verify` and hook bypass attempts |

## Configuration

`mar init` generates `mar.config.yaml` with auto-detected settings:

```yaml
review:
  strategy: native          # native or codex

quality_gates:
  - name: "lint"
    command: "npm run lint"
  - name: "test"
    command: "npm run test"

self_heal:
  max_retries_per_strategy: 3
  max_total_retries: 5

playwright:
  enabled: auto             # auto, true, or false
  mock_backend: true
  video_dir: .mar/videos
  dev_server: "npm run dev"
```

## CLI

| Command | Description |
|---------|-------------|
| `mar init` | Set up mar-workflow in the current project |
| `mar doctor` | Check environment and configuration health |
| `mar version` | Show version information |

## Requirements

- Node.js >= 18
- [Claude Code](https://claude.ai/claude-code) CLI
- [GitHub CLI](https://cli.github.com/) (`gh`) — authenticated
- Playwright (optional, for frontend demo videos)

## License

MIT
