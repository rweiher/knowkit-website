// Loads content.json and fills elements marked with data-content="section.key".
// Supports per-section text variants: sections with a _variants array are
// resolved to one variant per page load. A localStorage counter rotates through
// enabled variants on every reload; disabled variants are skipped.
//
// URL overrides (for previewing a specific combination):
//   ?variant=A|B|C|D|E|0..4  → force that variant index on this load
//   ?variant=reset           → reset the rotation counter to -1 (next load = A)
//   ?badge=1                 → show a small variant-badge on screen
(function () {
  const STORAGE_KEY = 'knowkit_variant_index';
  const TOTAL_SLOTS = 5;
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const lang = document.documentElement.lang || 'de';

  // --- URL params
  const params = new URLSearchParams(window.location.search);
  const forcedParam = params.get('variant');
  const badgeRequested = params.get('badge') === '1';

  if (forcedParam === 'reset') {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  // Parse forced variant (A-E or 0-4), undefined if not forced
  let forcedIdx;
  if (forcedParam && forcedParam !== 'reset') {
    const L = forcedParam.toUpperCase();
    if (LETTERS.includes(L)) forcedIdx = LETTERS.indexOf(L);
    else if (/^[0-4]$/.test(forcedParam)) forcedIdx = parseInt(forcedParam, 10);
  }

  function computeVariantIndex() {
    if (forcedIdx !== undefined) return forcedIdx;
    let last;
    try { last = parseInt(localStorage.getItem(STORAGE_KEY) || '-1', 10); }
    catch { last = -1; }
    if (!Number.isFinite(last)) last = -1;
    const next = (last + 1) % TOTAL_SLOTS;
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
    return next;
  }

  function pickVariant(variants, preferredIdx) {
    if (!Array.isArray(variants) || variants.length === 0) return null;
    const enabledIdx = variants
      .map((v, i) => ({ v, i }))
      .filter(x => x.v && x.v._enabled === true);
    if (enabledIdx.length === 0) return null;
    // If preferred index is enabled, use it; otherwise pick next enabled cyclically
    const preferred = variants[preferredIdx];
    if (preferred && preferred._enabled) return { variant: preferred, actualIdx: preferredIdx };
    // Find next enabled variant from preferredIdx onward, wrapping
    for (let step = 1; step <= variants.length; step++) {
      const idx = (preferredIdx + step) % variants.length;
      if (variants[idx] && variants[idx]._enabled) return { variant: variants[idx], actualIdx: idx };
    }
    return null;
  }

  // Resolve each section to a flat object: chosen variant's fields,
  // or — for sections without variants — the raw section object.
  function resolveSections(content, variantIdx) {
    const out = {};
    const actuals = {}; // per-section actual index used (for badge)
    for (const [section, data] of Object.entries(content)) {
      if (data && typeof data === 'object' && Array.isArray(data._variants)) {
        const picked = pickVariant(data._variants, variantIdx);
        if (picked) {
          const clean = Object.assign({}, picked.variant);
          delete clean._name; delete clean._enabled;
          out[section] = clean;
          actuals[section] = picked.actualIdx;
        } else {
          out[section] = {};
          actuals[section] = -1;
        }
      } else {
        out[section] = data;
      }
    }
    return { content: out, actuals };
  }

  function getPath(obj, path) {
    const parts = path.split('.');
    let v = obj;
    for (const p of parts) {
      if (v && typeof v === 'object' && p in v) v = v[p];
      else return undefined;
    }
    return v;
  }

  // Map from nav item key → section id on the page. Keep stable.
  const NAV_HREF = {
    problem: '#problem',
    solution: '#loesung',
    features: '#features',
    roi: '#roi',
    security: '#sicherheit',
    demo: '#demo'
  };

  function renderNav(navContent) {
    if (!navContent) return;
    const order = Array.isArray(navContent.order) && navContent.order.length
      ? navContent.order
      : Object.keys(NAV_HREF);

    const desktop = document.querySelector('[data-nav-items]');
    const mobile = document.querySelector('[data-nav-mobile]');
    const mobileMenu = document.getElementById('mm');

    if (desktop) desktop.innerHTML = '';
    if (mobile) mobile.innerHTML = '';

    order.forEach(key => {
      const href = NAV_HREF[key];
      const label = navContent[key];
      if (!href || !label) return;
      if (desktop) {
        const a = document.createElement('a');
        a.href = href;
        a.className = 'hover:text-gray-600 transition-colors';
        a.textContent = label;
        desktop.appendChild(a);
      }
      if (mobile) {
        const a = document.createElement('a');
        a.className = 'block';
        a.href = href;
        a.textContent = label;
        if (mobileMenu) a.addEventListener('click', () => mobileMenu.classList.add('hidden'));
        mobile.appendChild(a);
      }
    });
  }

  function apply(content) {
    if (content.meta) {
      if (content.meta.title) document.title = content.meta.title;
      const setMeta = (sel, val) => {
        const el = document.querySelector(sel);
        if (el && val !== undefined) el.setAttribute('content', val);
      };
      setMeta('meta[name="description"]', content.meta.description);
      setMeta('meta[property="og:title"]', content.meta.og_title);
      setMeta('meta[property="og:description"]', content.meta.og_description);
    }
    // Dynamic nav from ordered list
    renderNav(content.nav);
    document.querySelectorAll('[data-content]').forEach(el => {
      const val = getPath(content, el.getAttribute('data-content'));
      if (val !== undefined) el.innerHTML = val;
    });
    document.querySelectorAll('[data-content-placeholder]').forEach(el => {
      const val = getPath(content, el.getAttribute('data-content-placeholder'));
      if (val !== undefined) el.setAttribute('placeholder', val);
    });
    document.querySelectorAll('[data-content-value]').forEach(el => {
      const val = getPath(content, el.getAttribute('data-content-value'));
      if (val !== undefined) el.setAttribute('value', val);
    });
  }

  function showBadge(variantIdx, rawContent) {
    // Look up the picked variant name from the raw content, prefer hero section,
    // fall back to the first variant-bearing section.
    let pickedName = '';
    const findName = (data) => {
      if (!(data && data._variants)) return null;
      const p = pickVariant(data._variants, variantIdx);
      return p ? p.variant._name : null;
    };
    pickedName = findName(rawContent.hero) || '';
    if (!pickedName) {
      for (const sec of Object.values(rawContent)) {
        const n = findName(sec);
        if (n) { pickedName = n; break; }
      }
    }
    const badge = document.createElement('div');
    badge.id = 'knowkit-variant-badge';
    badge.style.cssText = [
      'position:fixed', 'bottom:16px', 'right:16px', 'z-index:9999',
      'background:rgba(15,23,42,0.92)', 'color:#fff',
      'padding:8px 14px', 'border-radius:9999px',
      'font:500 12px/1 Inter, system-ui, sans-serif',
      'box-shadow:0 6px 24px rgba(0,0,0,0.18)',
      'display:flex', 'gap:8px', 'align-items:center',
      'backdrop-filter:blur(8px)', '-webkit-backdrop-filter:blur(8px)'
    ].join(';');
    badge.innerHTML =
      '<span style="color:#6BC1EF;font-weight:700">Variante ' + LETTERS[variantIdx] + '</span>' +
      (pickedName ? '<span style="opacity:0.7">' + pickedName.replace(/^[A-E]\s*—\s*/, '') + '</span>' : '') +
      '<a href="?variant=reset" style="color:#6BC1EF;text-decoration:none;opacity:0.85;margin-left:4px" title="Rotation zurücksetzen">↺</a>';
    document.body.appendChild(badge);
  }

  fetch('content.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(all => {
      const raw = all[lang];
      if (!raw) return;
      const variantIdx = computeVariantIndex();
      const { content } = resolveSections(raw, variantIdx);
      const runApply = () => {
        apply(content);
        if (badgeRequested) showBadge(variantIdx, raw);
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runApply);
      } else {
        runApply();
      }
    })
    .catch(err => console.warn('content.json load failed:', err));
})();
