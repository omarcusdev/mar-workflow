#!/usr/bin/env bats

load '../test_helper'

setup() {
  setup_test_project
}

teardown() {
  teardown_test_project
}

@test "mar doctor passes after mar init" {
  node "$MAR_ROOT/cli/bin/mar" init
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [ "$status" -eq 0 ]
}

@test "mar doctor detects missing commands" {
  node "$MAR_ROOT/cli/bin/mar" init
  rm .claude/commands/mar/solve.md
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [ "$status" -eq 1 ]
  [[ "$output" == *"missing solve.md"* ]]
}

@test "mar doctor detects missing agents" {
  node "$MAR_ROOT/cli/bin/mar" init
  rm .claude/agents/tribe-lead.md
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [ "$status" -eq 1 ]
  [[ "$output" == *"missing tribe-lead.md"* ]]
}

@test "mar doctor detects missing hooks" {
  node "$MAR_ROOT/cli/bin/mar" init
  rm .claude/hooks/block-main-edits.sh
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [ "$status" -eq 1 ]
  [[ "$output" == *"missing block-main-edits.sh"* ]]
}

@test "mar doctor warns when no mar.config.yaml" {
  node "$MAR_ROOT/cli/bin/mar" init
  rm mar.config.yaml
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [[ "$output" == *"not found"* ]]
}

@test "mar doctor checks Node.js version" {
  node "$MAR_ROOT/cli/bin/mar" init
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [[ "$output" == *"Node.js"* ]]
}

@test "mar doctor reports pass count" {
  node "$MAR_ROOT/cli/bin/mar" init
  run node "$MAR_ROOT/cli/bin/mar" doctor
  [[ "$output" == *"passed"* ]]
}
