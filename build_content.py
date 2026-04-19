#!/usr/bin/env python3
"""
Sanitize content.json for production deployment.

Default mode: removes disabled variants, variant metadata (_name), and empty
variants — so the runtime only sees deployable content.

Landing-page mode (--only <VariantName>): keeps only that named variant per
section, ignores the _enabled flag, forcibly marks it as the single active
variant. Used to produce dedicated landings like flaschenhals.knowkit.de that
always show Variant C, regardless of what's toggled in the editor.

Usage:
  python3 build_content.py dist/de/content.json
  python3 build_content.py dist/flaschenhals/content.json --only C
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
        if isinstance(val, str) and val.strip():
            return True
        if isinstance(val, list) and len(val) > 0:
            return True
    return False


def sanitize(data, only=None):
    out = {}
    for lang, sections in data.items():
        out[lang] = {}
        for section_name, section in sections.items():
            if isinstance(section, dict) and isinstance(section.get('_variants'), list):
                kept = []
                for v in section['_variants']:
                    if not isinstance(v, dict):
                        continue
                    if only is not None:
                        # Landing mode: pick only the variant with matching _name,
                        # ignore _enabled, force it on in the output.
                        if v.get('_name') != only:
                            continue
                    else:
                        # Default mode: respect _enabled.
                        if v.get('_enabled') is not True:
                            continue
                    if not is_meaningful_variant(v):
                        continue
                    clean = {k: val for k, val in v.items() if k != '_name'}
                    if only is not None:
                        clean['_enabled'] = True
                    kept.append(clean)
                out[lang][section_name] = {'_variants': kept}
            else:
                out[lang][section_name] = section
    return out


def main():
    args = sys.argv[1:]
    only = None
    positional = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == '--only' and i + 1 < len(args):
            only = args[i + 1]
            i += 2
        else:
            positional.append(a)
            i += 1

    if len(positional) != 1:
        print('Usage: build_content.py <output-path> [--only <VariantName>]', file=sys.stderr)
        sys.exit(1)

    src = Path('content.json')
    dst = Path(positional[0])

    with src.open('r', encoding='utf-8') as f:
        data = json.load(f)

    sanitized = sanitize(data, only=only)

    dst.parent.mkdir(parents=True, exist_ok=True)
    with dst.open('w', encoding='utf-8') as f:
        json.dump(sanitized, f, ensure_ascii=False, indent=2)
        f.write('\n')

    src_size = src.stat().st_size
    dst_size = dst.stat().st_size
    pct = (dst_size / src_size * 100) if src_size else 0
    mode = f' (only={only})' if only else ''
    print(f'  content.json sanitized{mode}: {src_size:,} → {dst_size:,} bytes ({pct:.0f}% of original)')


if __name__ == '__main__':
    main()
