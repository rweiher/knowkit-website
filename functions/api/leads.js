// POST /api/leads
// Öffentlicher Endpoint — nimmt Demo-Formular-Einreichungen entgegen.
// Schreibt in D1 (env.DB). Kein Auth; Bot-Schutz über Honeypot.

const ALLOWED_ORIGINS = [
  'https://www.knowkit.de',
  'https://knowkit.de',
  'https://www.knowkit.ai',
  'https://knowkit.ai',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://www.knowkit.de';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export async function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get('Origin')) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');

  if (!env.DB) {
    return json({ error: 'Database not configured' }, 500, origin);
  }

  // FormData oder JSON akzeptieren
  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      data = Object.fromEntries(fd);
    }
  } catch {
    return json({ error: 'Invalid body' }, 400, origin);
  }

  // Honeypot — Bots füllen versteckte Felder aus
  if (data.website_url && String(data.website_url).trim().length > 0) {
    // Tu so, als wäre es erfolgreich, damit Bot keine Info bekommt
    return json({ ok: true }, 200, origin);
  }

  // Pflichtfelder
  const required = ['name', 'company', 'email'];
  for (const field of required) {
    if (!data[field] || String(data[field]).trim().length === 0) {
      return json({ error: `Missing field: ${field}` }, 400, origin);
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email).trim())) {
    return json({ error: 'Invalid email' }, 400, origin);
  }

  // Länge sanity-checken
  const trim = (v, max = 500) => (v == null ? null : String(v).trim().slice(0, max));

  try {
    await env.DB.prepare(
      `INSERT INTO leads (name, company, email, phone, team_size, industry, use_case, language, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        trim(data.name, 200),
        trim(data.company, 200),
        trim(data.email, 200),
        trim(data.phone, 50),
        trim(data.team_size, 50),
        trim(data.industry, 100),
        trim(data.use_case, 2000),
        trim(data.language, 5) || 'de',
        trim(data.source, 50) || 'demo-form'
      )
      .run();
  } catch (err) {
    return json({ error: 'Database error', detail: err.message }, 500, origin);
  }

  return json({ ok: true }, 200, origin);
}
