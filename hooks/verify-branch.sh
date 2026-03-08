#!/usr/bin/env bash
set -euo pipefail

if [ "${MAR_VERIFY_BRANCH:-}" = "0" ]; then
  exit 0
fi

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)

if ! echo "$COMMAND" | grep -qE '\bgit\b.*\bcommit\b'; then
  exit 0
fi

MISMATCH=false
MESSAGES=""

if [ -n "${MAR_EXPECTED_BRANCH:-}" ]; then
  ACTUAL_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
  if [ "$ACTUAL_BRANCH" != "$MAR_EXPECTED_BRANCH" ]; then
    MISMATCH=true
    MESSAGES="${MESSAGES}Branch mismatch: expected '${MAR_EXPECTED_BRANCH}', got '${ACTUAL_BRANCH}'.\n"
  fi
fi

EXPECTED_ROOT="${MAR_EXPECTED_CLONE:-}"
if [ -n "$EXPECTED_ROOT" ]; then
  ACTUAL_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
  if [ "$ACTUAL_ROOT" != "$EXPECTED_ROOT" ]; then
    MISMATCH=true
    MESSAGES="${MESSAGES}Clone root mismatch: expected '${EXPECTED_ROOT}', got '${ACTUAL_ROOT}'.\n"
  fi
fi

if [ "$MISMATCH" = false ]; then
  exit 0
fi

if [ "${MAR_VERIFY_BRANCH_STRICT:-}" = "1" ]; then
  echo "ERROR: Post-commit branch/clone verification failed."
  printf "%b" "$MESSAGES"
  echo "Strict mode is enabled (MAR_VERIFY_BRANCH_STRICT=1)."
  echo "The commit landed on the wrong branch or clone."
  echo "Use 'git log --oneline -1' to inspect, then 'git reset HEAD~1' to undo if needed."
  exit 2
fi

echo "WARNING: Post-commit branch/clone verification mismatch."
printf "%b" "$MESSAGES"
echo "The commit may have landed on the wrong branch."
echo "Verify with 'git log --oneline -1' and 'git branch --show-current'."
exit 0
