#!/usr/bin/env bash
# Build static deployment bundles for each domain.
#
#   ./build.sh          → builds both dist/de and dist/ai
#   ./build.sh de       → builds only dist/de
#   ./build.sh ai       → builds only dist/ai
#
# The deploy bundles contain ONLY what the public site needs:
#   - index.html (DE) or en.html renamed to index.html (AI)
#   - images/, js/
#   - content.json (served at runtime for text variants)
#   - impressum.html, datenschutz.html, robots.txt, sitemap.xml
#
# Editor, editor_server.py and .content-backups/ are never deployed.

set -euo pipefail

cd "$(dirname "$0")"

# Files copied 1:1 (NOT content.json — that one goes through build_content.py to
# strip disabled variants before publication).
PUBLIC_ASSETS=(images js impressum.html datenschutz.html robots.txt sitemap.xml)

build_de() {
  echo "→ Building dist/de  (for knowkit.de)"
  rm -rf dist/de
  mkdir -p dist/de
  cp index.html dist/de/index.html
  cp admin.html dist/de/admin.html
  for asset in "${PUBLIC_ASSETS[@]}"; do
    [ -e "$asset" ] && cp -R "$asset" "dist/de/$asset"
  done
  # Pages Functions (Lead-API + Admin-API)
  [ -d functions ] && cp -R functions dist/de/functions
  python3 build_content.py dist/de/content.json
  echo "  ✓ dist/de ready ($(du -sh dist/de | cut -f1))"
}

build_ai() {
  echo "→ Building dist/ai  (for knowkit.ai)"
  rm -rf dist/ai
  mkdir -p dist/ai
  # English site serves en.html as index
  cp en.html dist/ai/index.html
  for asset in "${PUBLIC_ASSETS[@]}"; do
    [ -e "$asset" ] && cp -R "$asset" "dist/ai/$asset"
  done
  # Das AI-Formular POSTet cross-origin an https://www.knowkit.de/api/leads,
  # deshalb braucht dist/ai keine eigenen Functions und kein D1-Binding.
  python3 build_content.py dist/ai/content.json
  echo "  ✓ dist/ai ready ($(du -sh dist/ai | cut -f1))"
}

TARGET="${1:-both}"

case "$TARGET" in
  de)   build_de ;;
  ai)   build_ai ;;
  both) build_de; build_ai ;;
  *)    echo "Unknown target: $TARGET"; echo "Usage: ./build.sh [de|ai|both]"; exit 1 ;;
esac

echo
echo "Done."
