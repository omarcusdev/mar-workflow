#!/usr/bin/env bash
set -euo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT=$(cat)

path_is_isolated() {
  local target="$1"

  if [[ "$target" != /* ]]; then
    target="$(pwd)/$target"
  fi

  local dir
  if [ -d "$target" ]; then
    dir="$target"
  else
    dir="$(dirname "$target")"
  fi

  while [ "$dir" != "/" ]; do
    if [ -f "$dir/.mar-clone" ]; then
      return 0
    fi
    if [ -f "$dir/.git" ] && [ ! -d "$dir/.git" ]; then
      return 0
    fi
    if [ -d "$dir/.git" ]; then
      return 1
    fi
    dir="$(dirname "$dir")"
  done

  return 0
}

path_is_outside_repo() {
  local target="$1"
  local repo_root
  repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo "")

  if [ -z "$repo_root" ]; then
    return 1
  fi

  if [ -d "$repo_root" ]; then
    repo_root=$(cd "$repo_root" && pwd -P)
  fi

  if [[ "$target" == "~/"* ]]; then
    target="$HOME/${target#\~/}"
  elif [[ "$target" == "~" ]]; then
    target="$HOME"
  fi

  if [[ "$target" != /* ]]; then
    target="$(pwd -P)/$target"
  fi

  local target_dir
  if [ -d "$target" ]; then
    target_dir=$(cd "$target" && pwd -P)
    target="$target_dir"
  elif [ -d "$(dirname "$target")" ]; then
    target_dir=$(cd "$(dirname "$target")" && pwd -P)
    target="$target_dir/$(basename "$target")"
  fi

  if [[ "$target" == "$repo_root"* ]]; then
    return 1
  fi

  return 0
}

all_targets_outside_repo() {
  local cmd="$1"
  local found_path=false
  local all_outside=true

  local -a words
  read -ra words <<< "$cmd"

  for word in "${words[@]:1}"; do
    if [[ "$word" == -* ]]; then
      continue
    fi

    if [[ "$word" == +* ]] || [[ "$word" =~ ^[0-9]+$ ]] || [[ "$word" == "&&" ]] || [[ "$word" == "||" ]] || [[ "$word" == ";" ]]; then
      continue
    fi

    found_path=true
    if ! path_is_outside_repo "$word"; then
      all_outside=false
      break
    fi
  done

  if [ "$found_path" = false ]; then
    return 1
  fi

  if [ "$all_outside" = true ]; then
    return 0
  fi
  return 1
}

if [ -f ".mar-clone" ]; then
  exit 0
fi
if [ -f ".git" ] && [ ! -d ".git" ]; then
  exit 0
fi
if [ ! -d ".git" ]; then
  exit 0
fi

BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
  exit 0
fi

TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"tool_name"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)

FILE_PATH=$(echo "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"file_path"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)

if [ -n "$FILE_PATH" ]; then
  if path_is_isolated "$FILE_PATH"; then
    exit 0
  fi
fi

IS_BASH=false
if [ "$TOOL_NAME" = "Bash" ]; then
  IS_BASH=true
elif echo "$INPUT" | grep -q '"command"'; then
  IS_BASH=true
fi

if [ "$IS_BASH" = true ]; then
  COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//' || true)

  if [ -z "$COMMAND" ]; then
    exit 0
  fi

  AGENT_ROLE="${MAR_AGENT_ROLE:-}"
  IS_OPS_ROLE=false
  if [ "$AGENT_ROLE" = "tribe-lead" ] || [ "$AGENT_ROLE" = "orchestrator" ]; then
    IS_OPS_ROLE=true
  fi

  CD_TARGET=""
  if [[ "$COMMAND" =~ ^cd[[:space:]]+([^[:space:]\&\;]+) ]]; then
    CD_TARGET="${BASH_REMATCH[1]}"
    if [[ "$CD_TARGET" != /* ]]; then
      CD_TARGET="$(pwd)/$CD_TARGET"
    fi
  fi

  if [ -n "$CD_TARGET" ] && path_is_isolated "$CD_TARGET"; then
    exit 0
  fi

  if echo "$COMMAND" | grep -qE '\bgit\b\s+push\b.*--delete\b'; then
    exit 0
  fi
  if echo "$COMMAND" | grep -qE '\bgit\b\s+worktree\s+remove\b'; then
    exit 0
  fi

  SANITIZED=$(echo "$COMMAND" | sed -E 's/[0-9]*>>[&]?\/dev\/null//g; s/[0-9]*>[&]?\/dev\/null//g; s/[0-9]+>&[0-9]+//g')

  BLOCKED=false

  if echo "$SANITIZED" | grep -qE '\bcat\b.*>{1,2}'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\b(echo|printf)\b.*>{1,2}'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\btee\b'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\bsed\b\s+-i'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\bawk\b.*>{1,2}'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\bdd\b\s.*of='; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\b(cp|mv)\b\s'; then
    if ! all_targets_outside_repo "$COMMAND"; then
      BLOCKED=true
    fi
  fi

  if echo "$COMMAND" | grep -qE '\b(rm|mkdir|touch|chmod|chown)\b\s'; then
    if ! all_targets_outside_repo "$COMMAND"; then
      BLOCKED=true
    fi
  fi

  if echo "$COMMAND" | grep -qE '\bgit\b\s+(add|commit|push|merge|rebase|reset|stash|cherry-pick|revert|tag|checkout\s+-b)\b'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '\binstall\b' && ! echo "$SANITIZED" | grep -qE '(bun|npm|yarn|pnpm|pip|cargo|gem|go)\s+install'; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE "<<['\"]?[A-Za-z].*>{1,2}"; then
    BLOCKED=true
  fi

  if echo "$SANITIZED" | grep -qE '(^|[|;&])\s*>{1,2}\s*\S'; then
    BLOCKED=true
  fi

  if [ "$BLOCKED" = true ] && [ "$IS_OPS_ROLE" = true ]; then
    OPS_SAFE=false

    if echo "$COMMAND" | grep -qE '\b(docker[[:space:]]+compose|docker-compose)\b'; then
      OPS_SAFE=true
    fi

    if echo "$COMMAND" | grep -qE '\b(rm|mkdir|touch|chmod|chown)\b\s'; then
      if all_targets_outside_repo "$COMMAND"; then
        OPS_SAFE=true
      fi
    fi

    if echo "$COMMAND" | grep -qE '\bgit\b\s+worktree\s+(add|remove|prune)\b'; then
      OPS_SAFE=true
    fi

    if echo "$COMMAND" | grep -qE '\bgit\b\s+push\b.*--delete\b'; then
      OPS_SAFE=true
    fi

    if echo "$COMMAND" | grep -qE '\bgit\b\s+branch\b\s+-(d|D)\b'; then
      OPS_SAFE=true
    fi

    if [ "$OPS_SAFE" = true ]; then
      exit 0
    fi
  fi

  if [ "$BLOCKED" = true ]; then
    echo "[AX_BLOCK_MAIN_BASH] BLOCKED: Cannot write files via Bash while on main branch." >&2
    echo "This guard protects repository state — it blocks file writes, not just git commits." >&2

    if echo "$COMMAND" | grep -qE '\bsed\b\s+-i'; then
      echo "Tip: Use the Edit tool instead of sed -i — it does not require a branch." >&2
    elif echo "$COMMAND" | grep -qE '\b(cp|mv)\b\s'; then
      echo "Tip: cp/mv modify repo files. Create a clone with /mar:solve first to work in an isolated branch." >&2
    elif echo "$COMMAND" | grep -qE '\btee\b|>{1,2}'; then
      echo "Tip: If passing content to a CLI tool, use stdin instead (e.g., --body-file - or echo '...' | cmd)." >&2
    elif echo "$COMMAND" | grep -qE '\bgit\b\s+(add|commit|push)\b'; then
      echo "Tip: git write commands require a feature branch. Create a clone with /mar:solve first." >&2
    elif echo "$COMMAND" | grep -qE '\b(rm|mkdir|touch)\b\s'; then
      echo "Tip: Filesystem mutations are blocked on main. Create a clone with /mar:solve first." >&2
    else
      echo "Tip: If you only need to pass content to a CLI tool, use stdin instead (e.g., --body-file - or echo '...' | cmd)." >&2
    fi

    echo "Remediation: Create a clone with /mar:solve <description> to work in an isolated branch." >&2
    echo "Docs: https://github.com/omarcusdev/mar-workflow#clone-isolation" >&2
    exit 2
  fi

  exit 0
fi

echo "[AX_BLOCK_MAIN_WRITE] BLOCKED: Cannot edit files while on main branch." >&2
echo "This guard protects repository state — it blocks file writes, not just git commits." >&2
echo "Note: Files outside the repo (e.g., /tmp) are not blocked — only repo-tracked paths." >&2
echo "Remediation: Create a clone with /mar:solve <description> to work in an isolated branch." >&2
echo "Docs: https://github.com/omarcusdev/mar-workflow#clone-isolation" >&2
exit 2
