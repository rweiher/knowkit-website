# Admin-Panel Setup (Leads)

Einmalige Einrichtung für das Lead-Management-Panel unter `https://www.knowkit.de/admin`.

**Was zu tun ist:**
1. D1-Datenbank in Cloudflare anlegen + Schema anwenden
2. Datenbank an das Pages-Projekt `knowkit-de` binden
3. Entra ID in Cloudflare Zero Trust als Login-Methode hinzufügen
4. Cloudflare Access-Regel für `/admin` und `/api/admin/*` einrichten
5. Danach Code deployen (`git push`) — erst dann werden Leads in die DB geschrieben und das Admin-Panel ist erreichbar.

Plan-Zeit: ca. 30–45 Minuten. Alles kostenlos in den Cloudflare-Free-Plänen.

---

## 1. D1-Datenbank anlegen

**Im Cloudflare-Dashboard** (einfachster Weg):

1. Dashboard → **Storage & Databases** → **D1** → **Create database**
2. Name: `knowkit-leads`
3. Region: **Western Europe (WEUR)**
4. Create

**Schema anwenden:**

1. Auf die neu angelegte DB klicken → Reiter **Console**
2. Inhalt von `schema.sql` aus diesem Repo kopieren und ausführen
3. Prüfen: `SELECT name FROM sqlite_master WHERE type='table';` → muss `leads` zurückgeben

---

## 2. D1 an Pages-Projekt binden

1. Dashboard → **Workers & Pages** → Projekt **`knowkit-de`** → **Settings** → **Bindings** (oder **Functions**)
2. **Add binding** → **D1 database**
   - **Variable name:** `DB` (genau so, Großbuchstaben — der Code erwartet `env.DB`)
   - **D1 database:** `knowkit-leads`
3. Speichern und **Production-Deployment neu triggern** (damit das Binding aktiv wird). Im Deployments-Tab das letzte Deployment → ⋯ → **Retry deployment**.

> **Wichtig:** Ohne dieses Binding schlagen alle Form-Einreichungen fehl mit `500 Database not configured`. Das Admin-Panel lädt zwar, zeigt aber `401 Not authenticated` bis Access steht.

---

## 3. Entra ID in Cloudflare Zero Trust einrichten

### 3a. App in Entra registrieren

1. **Entra Admin Center** (entra.microsoft.com) → **Applications** → **App registrations** → **New registration**
2. Name: `KnowKit Admin (Cloudflare Access)`
3. **Supported account types:** Single tenant (Ihre Organisation) — **nicht** Multitenant
4. **Redirect URI** (Web): wird in Schritt 3b von Cloudflare bereitgestellt — lassen Sie das Feld erstmal leer, wir kommen später zurück
5. Register
6. Notieren: **Application (client) ID** und **Directory (tenant) ID** (Übersicht)
7. **Certificates & secrets** → **New client secret** → Beschreibung, Laufzeit 24 Monate → Create
8. Den Secret-**Value** sofort kopieren (nicht Secret ID) — wird nur einmal angezeigt

### 3b. Entra als Login-Methode in Cloudflare anlegen

1. Dashboard → **Zero Trust** (öffnet `one.dash.cloudflare.com`)
2. **Settings** → **Authentication** → **Login methods** → **Add new**
3. **Microsoft Entra ID** (oder "Azure AD" — gleich) wählen
4. Ausfüllen:
   - **App ID:** Client ID aus Schritt 3a
   - **Client secret:** Secret-Value aus Schritt 3a
   - **Directory ID:** Tenant ID aus Schritt 3a
   - Support Groups: ja, wenn Sie Entra-Gruppen für Access-Policies nutzen wollen
5. **Save**. Cloudflare zeigt nun eine **Redirect URL** an — diese kopieren.
6. Zurück in Entra → Ihre App → **Authentication** → **Add a platform** → **Web** → Redirect URL einfügen → Save.
7. Cloudflare → **Test** klicken. Browser leitet zu Microsoft-Login um, danach "Test successful".

---

## 4. Access-Applikation für `/admin` erstellen

1. Zero Trust → **Access** → **Applications** → **Add an application** → **Self-hosted**
2. Name: `KnowKit Admin`
3. **Application domain:**
   - Domain: `knowkit.de`
   - Path: `admin*` (Stern!) — schützt sowohl `/admin` als auch `/admin.html`
4. **Identity providers:** Nur **Microsoft Entra ID** aktivieren (alle anderen abwählen)
5. Weiter → **Policy**:
   - Name: `KnowKit Team`
   - Action: **Allow**
   - Include → **Emails ending in** → `@knowkit.de` (oder Ihre konkrete Domain)
   - Alternativ (sicherer): **Emails** → einzelne Adressen pflegen
6. Weiter → **Cookie settings**: Session duration 24 h ist ein guter Default
7. Add application

**Zweite Applikation für die Admin-API** (sonst könnte man über die API Daten ziehen, ohne das HTML-Panel zu öffnen):

1. Add another application → Self-hosted
2. Name: `KnowKit Admin API`
3. Domain: `knowkit.de`, Path: `api/admin/*`
4. Identity providers: Entra, gleiche Policy wie oben

---

## 5. Code deployen

Sobald Schritte 1–4 stehen:

```bash
cd "/Users/h2w/Documents/Projekte/KnowKit Website/knowkit-website"
git add .
git commit -m "Admin-Panel: Lead-Management mit D1 + Cloudflare Access"
git push
```

Cloudflare Pages baut automatisch. Nach ~60 Sekunden ist verfügbar:

- **`https://www.knowkit.de/admin`** — Lead-Liste (fragt zuerst nach Entra-Login)
- **Demo-Formular** auf knowkit.de schreibt neue Leads in die DB
- **Demo-Formular** auf knowkit.ai postet cross-origin an `knowkit.de/api/leads` (CORS ist in der Function freigegeben)

---

## Test-Plan nach Deploy

1. **Form-Test (DE):** Auf `https://www.knowkit.de/#demo` das Formular mit Test-Daten ausfüllen → absenden → "Vielen Dank"-Bildschirm muss kommen.
2. **Form-Test (EN):** Gleiches auf `https://www.knowkit.ai/#demo`.
3. **Admin-Login:** `https://www.knowkit.de/admin` öffnen im Inkognito-Modus → Entra-Login erscheint → mit KnowKit-Account einloggen → beide Test-Leads stehen in der Liste.
4. **Unauthorized-Test:** Dasselbe mit privater E-Mail → Cloudflare Access muss blockieren.
5. **Status ändern:** Einen Lead öffnen, Status auf "Kontaktiert" setzen, Notiz eintragen → Refresh → Änderung persistent.
6. **Delete-Test:** Einen Test-Lead löschen → verschwindet aus Liste.

---

## Laufende Pflege

- **Lead-Alerts per E-Mail:** Derzeit **nicht implementiert**. Kann nachträglich ergänzt werden (z. B. via MailChannels oder Resend in `functions/api/leads.js` nach dem INSERT). Sagen Sie Bescheid, wenn Sie das wollen.
- **Team erweitern:** Neue KnowKit-Mitarbeiter bekommen Zugriff, indem entweder ihre E-Mail-Domain (`@knowkit.de`) bereits in der Policy enthalten ist oder ihre E-Mail manuell zur Access-Policy hinzugefügt wird.
- **Lead exportieren:** Im Admin-Panel ist CSV-Export noch nicht gebaut. Quick-Fix für jetzt: über D1-Console `SELECT * FROM leads;` ausführen und Ergebnis kopieren. Wenn häufiger gebraucht, bauen wir einen Export-Button.
- **Schema ändern:** Bei Feld-Ergänzungen `ALTER TABLE leads ADD COLUMN ...` in D1-Console ausführen und die Function entsprechend erweitern.

---

## DSGVO-Hinweise

Mit dem Admin-Panel speichern Sie **personenbezogene Daten von Leads** (Name, E-Mail, Firma, Telefon).

Vor Go-Live sicherstellen:

- [ ] **Datenschutzerklärung** auf der Website ergänzen: Welche Daten werden beim Formular erfasst, Zweck, Speicherdauer, Löschanfrage-Prozess. Der DSB sollte das freigeben.
- [ ] **Formular-Einwilligungstext** unter dem Submit-Button: "Mit dem Absenden stimme ich zu, dass KnowKit meine Angaben zur Bearbeitung meiner Anfrage verarbeitet (siehe Datenschutz)." — aktuell steht da nur "Wir melden uns innerhalb von 24 Stunden."
- [ ] **Löschfristen:** Intern festlegen, wann Leads gelöscht werden (z. B. 12 Monate nach letztem Kontakt bei Status "lost"). Lässt sich später per SQL-Job umsetzen.
- [ ] **Auskunftsprozess:** Bei Anfragen nach Art. 15/17 DSGVO → Lead im Admin öffnen → Datensatz anzeigen bzw. Delete-Button nutzen.
