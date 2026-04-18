// GET /api/admin/leads
// Geschützt durch Cloudflare Access — nur authentifizierte Nutzer kommen hier an.
// Zusätzlich prüfen wir serverseitig den CF-Access-Header als Defense-in-Depth.

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);

  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
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
