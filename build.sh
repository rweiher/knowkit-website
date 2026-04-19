#!/usr/bin/env bash
# Build static deployment bundles per domain.
#
#   ./build.sh                    → builds all four (de, ai, flaschenhals, bottleneck)
#   ./build.sh de                 → main DE site (www.knowkit.de)
#   ./build.sh ai                 → main EN site (www.knowkit.ai)
#   ./build.sh flaschenhals       → DE landing (flaschenhals.knowkit.de) — always Variant C
#   ./build.sh bottleneck         → EN landing (bottleneck.knowkit.ai)   — always Variant C
#   ./build.sh both               → legacy: just de + ai (main sites)
#
# The deploy bundles contain ONLY what the public site needs:
#   - index.html (or en.html renamed for EN bundles)
#   - images/, js/
#   - content.json (sanitized via build_content.py)
#   - impressum.html, datenschutz.html, robots.txt, sitemap.xml
#   - dist/de also includes admin.html + functions/ (lead API + admin panel)
#
# Editor files (editor.html, editor_server.py) are never deployed.

set -euo pipefail

cd "$(dirname "$0")"

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

build_flaschenhals() {
  echo "→ Building dist/flaschenhals  (for flaschenhals.knowkit.de — always Variant C)"
  rm -rf dist/flaschenhals
  mkdir -p dist/flaschenhals
  cp index.html dist/flaschenhals/index.html
  for asset in "${PUBLIC_ASSETS[@]}"; do
    [ -e "$asset" ] && cp -R "$asset" "dist/flaschenhals/$asset"
  done
  # Die Landing braucht keine Pages Functions — Form postet cross-origin an www.knowkit.de/api/leads.
  python3 build_content.py dist/flaschenhals/content.json --only C
  echo "  ✓ dist/flaschenhals ready ($(du -sh dist/flaschenhals | cut -f1))"
}

build_bottleneck() {
  echo "→ Building dist/bottleneck    (for bottleneck.knowkit.ai — always Variant C)"
  rm -rf dist/bottleneck
  mkdir -p dist/bottleneck
  cp en.html dist/bottleneck/index.html
  for asset in "${PUBLIC_ASSETS[@]}"; do
    [ -e "$asset" ] && cp -R "$asset" "dist/bottleneck/$asset"
  done
  python3 build_content.py dist/bottleneck/content.json --only C
  echo "  ✓ dist/bottleneck ready ($(du -sh dist/bottleneck | cut -f1))"
}

TARGET="${1:-all}"

case "$TARGET" in
  de)             build_de ;;
  ai)             build_ai ;;
  flaschenhals)   build_flaschenhals ;;
  bottleneck)     build_bottleneck ;;
  both)           build_de; build_ai ;;
  all)            build_de; build_ai; build_flaschenhals; build_bottleneck ;;
  *)              echo "Unknown target: $TARGET"
                  echo "Usage: ./build.sh [de|ai|flaschenhals|bottleneck|both|all]"
                  exit 1 ;;
esac

echo
echo "Done."
