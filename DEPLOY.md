# Deployment Guide

Die KnowKit-Website wird auf **vier Domains** gehostet:

| Domain | Inhalt | Build-Output | Build-Target |
|---|---|---|---|
| `www.knowkit.de` | Deutsch, Variante A (Haupt) | `dist/de/` | `bash build.sh de` |
| `www.knowkit.ai` | Englisch, Variante A (Haupt) | `dist/ai/` | `bash build.sh ai` |
| `flaschenhals.knowkit.de` | Deutsch, Variante C (KI-Ära) | `dist/flaschenhals/` | `bash build.sh flaschenhals` |
| `bottleneck.knowkit.ai` | Englisch, Variante C (KI-Ära) | `dist/bottleneck/` | `bash build.sh bottleneck` |

Die beiden Landing-Subdomains zeigen **immer** Variant C — unabhängig davon, was im Editor aktiviert ist. Wird per `--only C` beim `build_content.py` erzwungen.

Form-Einreichungen von allen vier Domains gehen cross-origin an `https://www.knowkit.de/api/leads` (CORS in `functions/api/leads.js` freigegeben). Nur das `knowkit-de`-Pages-Projekt hat die D1-Bindung und die Pages Functions.

Der **Editor** (`editor.html` + `editor_server.py`) läuft nur lokal. Er ist nie Teil eines Deploy-Bundles. Workflow:

1. Lokal Texte im Editor bearbeiten → `content.json` speichern
2. Änderungen committen und pushen
3. Cloudflare Pages baut automatisch neu und veröffentlicht beide Domains

---

## Empfehlung: Cloudflare Pages

**Warum Cloudflare Pages?**

| Kriterium | Cloudflare Pages | GitHub Pages |
|---|---|---|
| Kosten | 0 € | 0 € |
| Privates Repo | ✅ ja | ❌ nur mit Pro-Plan |
| Bandbreite | unbegrenzt | 100 GB/Monat |
| CDN | global (330+ Standorte) | nur via Cloudflare davor |
| Custom Domains pro Projekt | mehrere | eine |
| Build-Befehle | ja | nein (nur statisch) |
| Deploy-Dauer | ~30 s | ~60 s |

**Fazit:** Cloudflare Pages — private Repos out-of-the-box, schneller, mehr Features.

---

## Einmalige Einrichtung

### 1. GitHub-Repository (privat)

```bash
cd "/Users/h2w/Documents/Projekte/KnowKit Website/knowkit-website"
git init
git add .
git commit -m "Initial commit: KnowKit website"
# GitHub → New repository → privat → knowkit-website
git remote add origin git@github.com:<user>/knowkit-website.git
git branch -M main
git push -u origin main
```

### 2. Cloudflare Pages – Projekt "knowkit-de"

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. GitHub autorisieren, `knowkit-website`-Repo auswählen
3. **Build settings:**
   - Production branch: `main`
   - Build command: `bash build.sh de`
   - Build output directory: `dist/de`
4. Nach dem ersten Deploy: **Custom domains** → `www.knowkit.de` hinzufügen
   - Cloudflare fragt nach DNS-Anpassung (siehe Schritt 4 unten)
5. Gewünscht: `knowkit.de` (ohne `www.`) → als zusätzliche Custom Domain hinzufügen oder 301-Redirect auf `www.knowkit.de`

### 3. Cloudflare Pages – Projekt "knowkit-ai"

Analog zu knowkit-de, aber:
   - Project name: `knowkit-ai`
   - Build command: `bash build.sh ai`
   - Build output directory: `dist/ai`
   - Custom domain: `www.knowkit.ai`

### 3b. Cloudflare Pages – Landing "knowkit-flaschenhals" (optional)

Wenn die KI-Ära-Landing unter `flaschenhals.knowkit.de` live gehen soll:

1. Workers & Pages → Create → Pages → Connect to Git → dasselbe Repo
2. **Build settings:**
   - Project name: `knowkit-flaschenhals`
   - Production branch: `main`
   - Build command: `bash build.sh flaschenhals`
   - Build output directory: `dist/flaschenhals`
3. Nach dem ersten Deploy: Custom domains → `flaschenhals.knowkit.de` hinzufügen
4. **Keine D1-Bindung nötig** — die Landing schreibt Leads cross-origin zurück an `www.knowkit.de/api/leads`

### 3c. Cloudflare Pages – Landing "knowkit-bottleneck" (optional)

Wenn die EN-Variante unter `bottleneck.knowkit.ai` live gehen soll:

1. Project name: `knowkit-bottleneck`
2. Build command: `bash build.sh bottleneck`
3. Build output directory: `dist/bottleneck`
4. Custom domain: `bottleneck.knowkit.ai`
5. Ebenfalls **keine D1-Bindung nötig**

### 4. DNS

- Wenn Domain **bereits über Cloudflare** läuft: Custom-Domain-Verknüpfung funktioniert automatisch per „Set up a route".
- Wenn Domain **woanders** (Strato/IONOS/etc.): Nameserver auf Cloudflare umstellen (Registrar → Cloudflare-Nameserver eintragen), dann wie oben verknüpfen.
- Cloudflare stellt **automatisch HTTPS** (SSL/TLS) bereit — keine separate Cert-Verwaltung.

---

## Täglicher Workflow

Texte bearbeiten & deployen:

```bash
# Server lokal starten (falls nicht schon laufend)
python3 editor_server.py

# Editor öffnen: http://localhost:9101/editor.html
# Texte ändern, speichern

# Deployen:
git add content.json
git commit -m "Content: neue Hero-Headline"
git push
# → Cloudflare Pages baut beide Projekte automatisch (~30 s pro Projekt)
```

Lokalen Build testen (ohne Deploy):

```bash
./build.sh both       # baut dist/de und dist/ai
python3 -m http.server 8080 -d dist/de    # DE lokal prüfen
python3 -m http.server 8081 -d dist/ai    # EN lokal prüfen
```

---

## Checkliste vor dem Go-Live

- [ ] **Impressum** (impressum.html) — Adresse, Registereintrag, USt-ID eintragen
- [ ] **Datenschutz** (datenschutz.html) — final von DSB prüfen lassen
- [ ] **Demo-Formular** — `https://formspree.io/f/YOUR_FORM_ID` durch echten Endpoint ersetzen
- [ ] **Analytics** (Plausible-Snippet) — auskommentiert im Head; bei Bedarf aktivieren
- [ ] **Login-URLs** — sicherstellen, dass `knowkit.de/login` und `knowkit.ai/login` tatsächlich existieren (die verweisen aktuell ins Leere, solange KnowKit nur lokal läuft)
- [ ] **Englische Legal-Seiten** — `impressum.html`/`datenschutz.html` sind deutsch; für knowkit.ai sollten eigene Versionen (`imprint.html`/`privacy.html`) in Englisch erstellt werden. Footer-Links in `en.html` entsprechend anpassen.
- [ ] **Robots/Sitemap** — robots.txt und sitemap.xml prüfen; Sitemap bei Google Search Console einreichen

---

## Sicherheit

**Was ist öffentlich sichtbar?**

- HTML, CSS, JS, Bilder, `content.json` — alles was im Browser landet
- Das ist Marketing-Content → darf öffentlich sein

**Was bleibt privat?**

- Quellcode im **privaten** GitHub-Repo (nur Mitglieder)
- Editor + `editor_server.py` werden nicht deployed (sind in `.gitignore`/build.sh ausgeschlossen)
- Lokale Backups (`.content-backups/`) sind nicht im Repo

**Risiken**

- `content.json` enthält auch unveröffentlichte Varianten B–E → wer die Datei direkt aufruft, sieht alle Varianten. Falls das ein Problem ist, sollten Entwürfe außerhalb von content.json gehalten oder vor Deploy entfernt werden.

---

## Fallback: GitHub Pages (nicht empfohlen)

Falls Cloudflare Pages nicht möglich ist:

- Zwei Repos (oder ein Repo mit zwei Branches `deploy-de` / `deploy-ai`)
- In jedem Repo nur das passende `dist/`-Verzeichnis als Root committen
- GitHub Pages → Settings → Pages → Source: `main`, Folder: `/` (für committetes dist)
- Custom Domain im Repo-Setting konfigurieren

GitHub Pages-Limits: 100 GB/Monat, privates Repo nur mit Pro-Plan.
