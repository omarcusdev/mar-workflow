#!/usr/bin/env bash
set -euo pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

INPUT=$(cat)

COMMAND=$(echo "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/"command"[[:space:]]*:[[:space:]]*"//' | sed 's/"$//')

if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)LEFTHOOK=(0|false)'; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: LEFTHOOK=0 is prohibited — this disables all git guards." >&2
  echo "Remediation: If a git hook is blocking you, use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)LEFTHOOK_EXCLUDE='; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: LEFTHOOK_EXCLUDE is prohibited — this disables specific git guards." >&2
  echo "Remediation: If a git hook is blocking you, use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '(^|[;&|]\s*)NUKE_GUARD_SKIP=(1|true)'; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: NUKE_GUARD_SKIP is prohibited — this bypasses push safety checks." >&2
  echo "Remediation: If nuke-guard is blocking your push, use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'gh\s+api.*refs'; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: Direct GitHub API ref manipulation is prohibited." >&2
  echo "Remediation: Use git push through a worktree so hooks can validate the push." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'chflags.*(noschg|nouchg)|chattr.*-i'; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: Unlocking protected files is prohibited." >&2
  echo "Remediation: Only the human operator can unlock immutable files." >&2
  exit 2
fi

if ! echo "$COMMAND" | grep -qE '\bgit\b'; then
  exit 0
fi

if echo "$COMMAND" | grep -qE 'git\s+config\s+(core\.bare|user\.(email|name))'; then
  echo "[AX_BLOCK_GUARD_BYPASS] BLOCKED: Modifying git core.bare or user identity is prohibited." >&2
  echo "Remediation: Use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '\-\-no-verify'; then
  echo "[AX_BLOCK_NO_VERIFY] BLOCKED: --no-verify is prohibited." >&2
  echo "Git hooks exist to protect the codebase. Do not bypass them." >&2
  echo "Remediation: If a hook is blocking you, use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE '\-\-no-gpg-sign'; then
  echo "[AX_BLOCK_NO_VERIFY] BLOCKED: --no-gpg-sign is prohibited." >&2
  echo "Remediation: Use AskUserQuestion to escalate to the human operator." >&2
  exit 2
fi

if echo "$COMMAND" | grep -qE 'git\s+(commit|push)\s.*\s-[a-zA-Z]*n'; then
  if echo "$COMMAND" | grep -qE 'git\s+(commit|push)\s.*\b-n\b'; then
    echo "[AX_BLOCK_NO_VERIFY] BLOCKED: -n (--no-verify shorthand) is prohibited for git commit/push." >&2
    echo "Remediation: Use AskUserQuestion to escalate to the human operator." >&2
    exit 2
  fi
fi

exit 0
