-- KnowKit Leads — Cloudflare D1 Schema
--
-- Wird einmalig angewendet per:
--   wrangler d1 execute knowkit-leads --file=schema.sql --remote
-- oder via Cloudflare Dashboard → D1 → knowkit-leads → Console

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Daten aus dem Demo-Formular
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  team_size TEXT,
  industry TEXT,
  use_case TEXT,
  language TEXT DEFAULT 'de',
  source TEXT DEFAULT 'demo-form',

  -- Interne Verwaltung (Admin-UI)
  status TEXT DEFAULT 'new',           -- new | contacted | meeting | won | lost
  assigned_to TEXT,                     -- E-Mail des verantwortlichen KnowKit-Mitarbeiters
  follow_up_date TEXT,                  -- ISO-Datum, YYYY-MM-DD
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
