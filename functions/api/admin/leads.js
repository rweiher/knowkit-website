// GET /api/admin/leads
// Geschützt durch Cloudflare Access — nur authentifizierte Nutzer kommen hier an.
// Die User-E-Mail lesen wir aus dem CF-Access-JWT (Cloudflare liefert diesen
// Header zuverlässig, während "Cf-Access-Authenticated-User-Email" für
// Pages Functions nicht immer gesetzt wird).

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function emailFromAccess(request) {
  const direct = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (direct) return direct;
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    return payload.email || null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);

  const email = emailFromAccess(request);
  if (!email) return json({ error: 'Not authenticated' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT id, created_at, updated_at, name, company, email, phone,
            team_size, industry, use_case, language, source,
            status, assigned_to, follow_up_date, notes
       FROM leads
      ORDER BY created_at DESC`
  ).all();

  return json({ leads: results, authenticated_user: email });
}
