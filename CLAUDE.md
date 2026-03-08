# Mar-workflow — Claude Code Instructions

## Branch Safety

All changes go through feature branches and PRs. **Do NOT edit files on `main`.**
Use `EnterWorktree` first. Branch from `origin/main`, not local `main`.

## Project Overview

**Simplified multi-agent workflow for Claude Code.** Two commands (`/mar:solve`, `/mar:status`), three agents (tribe-lead, squad-worker, pr-creator), three safety hooks, minimal CLI.

## Structure

```
mar-workflow/
├── cli/                CLI tool (mar init, doctor, version)
│   ├── bin/mar         Entry point
│   ├── package.json    v0.1.0
│   └── src/            Subcommand implementations
├── commands/mar/       2 slash commands (solve, status) + shared patterns
├── agents/             3 agent definitions
├── hooks/              3 safety hooks
├── docs/               Design docs and plans
├── mar.defaults.yaml   Default config values
├── lefthook.yml        Git hooks config
└── CLAUDE.md           This file
```

## Key Conventions

- No build step — plain markdown, YAML, bash, JS
- Install via `mar init`
- Config in `mar.config.yaml`, defaults in `mar.defaults.yaml`
- Never push directly to main — PRs only
- Branch from `origin/main`

## Guard Bypass Policy

Agents MUST NOT:
- Use `--no-verify` on any git command
- Prefix commands with `LEFTHOOK=0` or `LEFTHOOK_EXCLUDE=`
- Modify hook files or settings

## Testing

```bash
tests/bats-core/bin/bats tests/
```
