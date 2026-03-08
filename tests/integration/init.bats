#!/usr/bin/env bats

load '../test_helper'

setup() {
  setup_test_project
}

teardown() {
  teardown_test_project
}

@test "mar init creates mar.config.yaml" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -f mar.config.yaml ]
}

@test "mar init detects Node.js stack" {
  run node "$MAR_ROOT/cli/bin/mar" init
  [[ "$output" == *"Stack: Node.js"* ]]
}

@test "mar init detects dev server" {
  run node "$MAR_ROOT/cli/bin/mar" init
  [[ "$output" == *"Dev server: npm run dev"* ]]
}

@test "mar init installs commands to .claude/commands/mar/" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -f .claude/commands/mar/solve.md ]
  [ -f .claude/commands/mar/status.md ]
  [ -f .claude/commands/mar/_patterns.md ]
}

@test "mar init installs agents to .claude/agents/" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -f .claude/agents/tribe-lead.md ]
  [ -f .claude/agents/squad-worker.md ]
  [ -f .claude/agents/pr-creator.md ]
}

@test "mar init installs hooks to .claude/hooks/" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -f .claude/hooks/block-main-edits.sh ]
  [ -f .claude/hooks/block-no-verify.sh ]
  [ -f .claude/hooks/verify-branch.sh ]
}

@test "mar init makes hooks executable" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -x .claude/hooks/block-main-edits.sh ]
  [ -x .claude/hooks/block-no-verify.sh ]
  [ -x .claude/hooks/verify-branch.sh ]
}

@test "mar init configures hooks in .claude/settings.json" {
  node "$MAR_ROOT/cli/bin/mar" init
  [ -f .claude/settings.json ]
  grep -q "block-main-edits" .claude/settings.json
  grep -q "block-no-verify" .claude/settings.json
  grep -q "verify-branch" .claude/settings.json
}

@test "mar init skips existing mar.config.yaml" {
  echo "existing: true" > mar.config.yaml
  run node "$MAR_ROOT/cli/bin/mar" init
  [[ "$output" == *"already exists"* ]]
  grep -q "existing: true" mar.config.yaml
}

@test "mar init is idempotent" {
  node "$MAR_ROOT/cli/bin/mar" init
  run node "$MAR_ROOT/cli/bin/mar" init
  [[ "$output" == *"already configured"* ]]
}
