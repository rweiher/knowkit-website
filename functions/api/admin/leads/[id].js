// PATCH /api/admin/leads/:id  — einzelnes Lead updaten (status, notes, etc.)
// DELETE /api/admin/leads/:id — Lead löschen (DSGVO-Löschanfragen)
// Beides geschützt durch Cloudflare Access.

const EDITABLE_FIELDS = ['status', 'assigned_to', 'follow_up_date', 'notes'];
const ALLOWED_STATUS = ['new', 'contacted', 'meeting', 'won', 'lost'];

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function checkAuth(request) {
  const email = request.headers.get('Cf-Access-Authenticated-User-Email');
  return email || null;
}

function parseId(params) {
  const n = parseInt(params.id, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function onRequestPatch({ request, env, params }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);
  const email = checkAuth(request);
  if (!email) return json({ error: 'Not authenticated' }, 401);
  const id = parseId(params);
  if (!id) return json({ error: 'Invalid id' }, 400);

  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (data.status && !ALLOWED_STATUS.includes(data.status)) {
    return json({ error: `Invalid status. Allowed: ${ALLOWED_STATUS.join(', ')}` }, 400);
  }

  const sets = [];
  const values = [];
  for (const key of EDITABLE_FIELDS) {
    if (key in data) {
      sets.push(`${key} = ?`);
      const v = data[key];
      values.push(v == null || v === '' ? null : String(v).slice(0, 5000));
    }
  }
  if (sets.length === 0) return json({ error: 'No fields to update' }, 400);

  sets.push(`updated_at = datetime('now')`);
  values.push(id);

  try {
    await env.DB.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  } catch (err) {
    return json({ error: 'Database error', detail: err.message }, 500);
  }

  return json({ ok: true });
}

export async function onRequestDelete({ request, env, params }) {
  if (!env.DB) return json({ error: 'Database not configured' }, 500);
  const email = checkAuth(request);
  if (!email) return json({ error: 'Not authenticated' }, 401);
  const id = parseId(params);
  if (!id) return json({ error: 'Invalid id' }, 400);

  try {
    await env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  } catch (err) {
    return json({ error: 'Database error', detail: err.message }, 500);
  }

  return json({ ok: true });
}
