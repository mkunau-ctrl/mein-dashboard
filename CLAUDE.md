# Mein Dashboard

**Ablage:** `C:\Users\PC\Projekte\mein-dashboard` (alle Projekte liegen unter
`C:\Users\PC\Projekte\<projektname>` – siehe Skill `projekt-workflow`).

## Zweck

Private Web-App für Mark, aufrufbar auf jedem Gerät im Browser (iPhone: "Zum
Home-Bildschirm"). Bündelt Lebensbereiche als Module: Ernährung (zuerst), dann
To-dos, Finanzen, Lager/Ersatzteile. Daten in Supabase. Mark trägt selbst ein
oder bittet Claude, Einträge in Supabase zu machen; das Dashboard zeigt sie an.

## Wo weiterlesen

- **Verlauf / warum was so ist:** `docs/PROJEKT-LOG.md` (neueste Einträge oben).
- **Gesamtkonzept:** `docs/specs/2026-09-08-dashboard-konzept.md`.
- **Feinpläne pro Etappe:** weitere Dateien in `docs/specs/`.

## Aufbau (Soll – wird beim Bau gefüllt)

- `index.html` – App-Hülle: Login-Screen + Kachel-Raster.
- `app.js` – Start, Auth (Magic-Link), Modul-Registry, Routing (`#/modul`).
- `supabase.js` – Supabase-Client (Projekt-URL + Anon-Key, dürfen öffentlich sein).
- `style.css` – gemeinsames Design.
- `module/ernaehrung.js`, `module/ernaehrung-stats.js` – Modul 1.
- `manifest.webmanifest`, `icons/` – PWA.
- `docs/` – Projekt-Doku.

## Starten / Testen / Bauen

- **Lokal ansehen:** kein Build. Im Repo-Wurzel
  (`C:\Users\PC\Projekte\mein-dashboard`) einen statischen Server starten,
  z. B. `python -m http.server 8000`, dann `http://localhost:8000`.
  (Datei direkt öffnen geht wegen Supabase-Auth-Redirect nicht zuverlässig.)
- **Deploy:** Push auf `main` → GitHub Pages veröffentlicht automatisch.
- **Tests:** Für Statistik-Logik (Streak, Quoten, Prognose) kleine
  JS-Unit-Tests; Setup wird in Etappe 1 festgelegt.

## Arbeitsweise

Dieses Projekt folgt dem Skill `projekt-workflow`: erst planen, dann bauen,
danach `docs/PROJEKT-LOG.md` und diese Datei aktualisieren. Antworten und Doku
auf Deutsch. Datenschutz beachten.

## Konventionen / Fallstricke

- **Keine Geheimnisse ins Repo.** Supabase-**Anon**-Key ist unkritisch und darf
  im Quelltext stehen (Schutz kommt über Row-Level-Security + Magic-Link-Login).
  Service-Role-Key, Zugangsdaten o. Ä. niemals committen.
- Alle Supabase-Tabellen haben `user_id` mit RLS `user_id = auth.uid()`.
- **Claude schreibt Daten:** Beim Insert über Supabase-MCP die `user_id` explizit
  auf Marks Auth-ID setzen (ID hier eintragen, sobald das Supabase-Projekt und
  der Account stehen: `USER_ID = <noch offen>`).
- GitHub-Account: `mkunau-ctrl`. Falls ein Push blockiert wird, pusht Mark selbst
  mit `!git push`.
- Datum im Log absolut schreiben (kein "heute").
