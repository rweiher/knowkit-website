#!/usr/bin/env python3
"""
Sanitize content.json for production deployment.

Removes:
  - Disabled variants (_enabled: false) — they are drafts and would otherwise
    be publicly readable at /content.json
  - Variant metadata that has no purpose at runtime (_name)
  - Empty variants (no field has any text)

Reads content.json from current dir, writes the sanitized version to the path
given as the only argument.

Usage:
  python3 build_content.py dist/de/content.json
"""
import json
import sys
from pathlib import Path


def is_meaningful_variant(v):
    """A variant is meaningful if it has at least one non-empty content field."""
    if not isinstance(v, dict):
        return False
    for k, val in v.items():
        if k.startswith('_'):
            continue
        # strings: non-empty after strip
        if isinstance(val, str) and val.strip():
            return True
        # arrays (e.g. nav.order): non-empty
        if isinstance(val, list) and len(val) > 0:
            return True
    return False


def sanitize(data):
    out = {}
    for lang, sections in data.items():
        out[lang] = {}
        for section_name, section in sections.items():
            if isinstance(section, dict) and isinstance(section.get('_variants'), list):
                kept = []
                for v in section['_variants']:
                    if not isinstance(v, dict):
                        continue
                    if v.get('_enabled') is not True:
                        continue
                    if not is_meaningful_variant(v):
                        continue
                    clean = {k: val for k, val in v.items() if k != '_name'}
                    kept.append(clean)
                # If everything was filtered, keep an empty list — runtime falls back to {}
                out[lang][section_name] = {'_variants': kept}
            else:
                out[lang][section_name] = section
    return out


def main():
    if len(sys.argv) != 2:
        print('Usage: build_content.py <output-path>', file=sys.stderr)
        sys.exit(1)

    src = Path('content.json')
    dst = Path(sys.argv[1])

    with src.open('r', encoding='utf-8') as f:
        data = json.load(f)

    sanitized = sanitize(data)

    dst.parent.mkdir(parents=True, exist_ok=True)
    with dst.open('w', encoding='utf-8') as f:
        json.dump(sanitized, f, ensure_ascii=False, indent=2)
        f.write('\n')

    # Stats
    src_size = src.stat().st_size
    dst_size = dst.stat().st_size
    pct = (dst_size / src_size * 100) if src_size else 0
    print(f'  content.json sanitized: {src_size:,} → {dst_size:,} bytes ({pct:.0f}% of original)')


if __name__ == '__main__':
    main()
