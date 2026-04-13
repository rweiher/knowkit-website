#!/usr/bin/env bash
# Commit ALL changes (modified + new) and push to the current branch's upstream.
#
# Usage:
#   ./push.sh                          # uses "Update website content" as commit message
#   ./push.sh "Fix hero headline"      # uses your own message
#
# Safeguards:
# - Files listed in .gitignore are automatically skipped (editor.pid, editor.log, dist/, ...).
# - REFUSES to commit files that look like secrets (.env, *.pem, *.key, credentials.json, ...).
#   If the script blocks, either add the file to .gitignore or commit it manually.

set -euo pipefail

cd "$(dirname "$0")"

echo "Current changes:"
git status --short
echo

# Anything to do at all?
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "Working tree clean — nothing to push."
  exit 0
fi

# Stage everything that is not .gitignore'd: modifications, new files, deletions.
git add -A

# --- Secret-file guard ----------------------------------------------------
# Block obvious secrets even if the user forgot to .gitignore them.
# Patterns are matched case-insensitively against the FULL path.
SECRET_RE='(^|/)\.env([.-][a-z0-9_-]+)?$|\.pem$|\.key$|\.p12$|\.pfx$|(^|/)id_(rsa|dsa|ecdsa|ed25519)$|credentials.*\.json$|service[-_]account.*\.json$|aws[-_]credentials|(^|/)secrets?(\.|/)|api[-_]?keys?\.'
# Whitelist: example/template/sample/test variants are safe to commit.
SAFE_RE='\.env\.(example|template|sample|test|dist)$'

SUSPICIOUS="$(git diff --cached --name-only | grep -iE "$SECRET_RE" | grep -ivE "$SAFE_RE" || true)"

if [ -n "$SUSPICIOUS" ]; then
  echo "✗ Refusing to push — these staged files look like secrets:"
  echo "$SUSPICIOUS" | sed 's/^/    /'
  echo
  echo "  If they are intentional and safe:"
  echo "    1) add them to .gitignore  (preferred), OR"
  echo "    2) commit manually:  git commit -m '...' && git push"
  echo
  # Reset the staging area so the user is back in control.
  git reset --quiet HEAD -- .
  exit 1
fi
# --------------------------------------------------------------------------

if git diff --cached --quiet; then
  echo "Nothing to commit after filtering."
  exit 0
fi

MSG="${1:-Update website content}"

git commit -m "$MSG"
echo
echo "→ Pushing to origin..."
git push
echo
echo "✓ Push complete. Cloudflare Pages will redeploy in ~30–60 s."
