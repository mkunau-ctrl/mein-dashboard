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

## Aufbau (Stand Etappe 4 – Module Ernährung + To-dos + Finanzen + Lager, in `main` gemergt, live)

- `index.html` – App-Hülle: Login-Ansicht + Dashboard-Ansicht mit Kachel-Raster.
- `app.css` – gemeinsames Design.
- `js/app.js` – Einstieg: verdrahtet Auth, Routing, Registry und Detail-Routing
  (`#/modul/unterseite`) mit dem DOM.
- `js/router.js` – `parseHash('#/modul/unterseite')` → `{ modul, unterseite }`.
- `js/view.js` – `entscheideAnsicht(session)` → `'login'` | `'dashboard'`.
- `js/auth.js` – Magic-Link-Wrapper: `sendeMagicLink`, `holeSession`, `meldeAb`, `beiAuthWechsel`.
- `js/supabase.js` – Supabase-Client (Projekt-URL + Publishable-Key, öffentlich ok); `supabase-js@2.116.0` per jsDelivr-ESM.
- `js/registry.js` – Modul-Registry: `registriere`, `alleModule`, `holeModul`, `leereRegistry`.
- `js/module/README.md` – Modul-Schnittstelle (`id`, `titel`, `renderKachel`, `init`).
- `js/module/ernaehrung/` – erstes Fachmodul:
  - `index.js` – Registrierung, Tab-Leiste, Unter-Routing, Kachel-Text.
  - `daten.js` – einzige Datei mit Supabase-Netzwerkzugriff (Items, Log, Gewicht, Settings).
  - `zeitplan.js` – `istFaellig` (täglich/wochentage/intervall).
  - `berechnung.js` – `tagesStatus`, `streak`, `quoteProPunkt`, `prognose`, `heatmapDaten`.
  - `heute.js`, `liste.js`, `gewicht.js`, `statistik.js`, `infos.js` – die fünf Tabs.
  Details/Entscheidungen: `docs/superpowers/specs/2026-09-09-etappe-1-ernaehrung-design.md`.
- `js/module/todos/` – zweites Fachmodul (Aufgaben):
  - `index.js` – Registrierung, Tabs „Offen"/„Erledigt", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `todos` + `todo_vorlagen`.
  - `planung.js` – `naechsteFaelligkeit`, `sortiereOffeneTodos`, `istUeberfaellig`.
  - `offen.js`, `erledigt.js` – die zwei Tabs.
  Details: `docs/superpowers/specs/2026-09-16-etappe-2-todos-design.md`.
- `js/module/finanzen/` – drittes Fachmodul (Ausgaben/Kontostand):
  - `index.js` – Registrierung, Tabs „Ausgaben"/„Kontostand"/„Monat", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `expenses` + `finance_settings`.
  - `berechnung.js` – `kontostand`, `summeProMonat`, `summenProKategorie`.
  - `ausgaben.js`, `kontostand.js`, `monat.js` – die drei Tabs.
  Details: `docs/superpowers/specs/2026-09-16-etappe-3-finanzen-design.md`.
- `js/module/lager/` – viertes Fachmodul (Teile/Ersatzteile):
  - `index.js` – Registrierung, Tabs „Teile"/„Bestellen", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `parts`.
  - `berechnung.js` – `warenwert`, `sortiereTeile`, `merkliste`, `naechsterStatus`.
  - `teile.js`, `bestellen.js` – die zwei Tabs.
  Details: `docs/superpowers/specs/2026-09-16-etappe-4-lager-design.md`.
- `manifest.webmanifest`, `icon.svg` – PWA. **Echte PNG-Icons (192/512) und
  `apple-touch-icon` fehlen weiterhin** (offener Punkt seit Etappe 0).
- `test/` – `node --test` Unit-Tests: `router`, `view`, `registry`,
  `ernaehrung-zeitplan`, `ernaehrung-berechnung`, `todos-planung`,
  `finanzen-berechnung`, `lager-berechnung` (42 grün).
- `.nojekyll` – GitHub Pages soll das Repo unverändert ausliefern.
- `docs/` – Projekt-Doku.

## Starten / Testen / Bauen

- **Lokal ansehen:** kein Build. Im Repo-Wurzel
  (`C:\Users\PC\Projekte\mein-dashboard`) einen statischen Server starten,
  `python -m http.server 8000`, dann `http://localhost:8000` öffnen.
  (Datei direkt öffnen geht wegen Supabase-Auth-Redirect nicht zuverlässig.)
- **Tests:** `npm test` (läuft `node --test` über `test/`). Stand: 42 grün.
- **Deploy:** Push auf `main` → GitHub Pages veröffentlicht automatisch unter
  `https://mkunau-ctrl.github.io/mein-dashboard/`. Pages ist aktiv (Source:
  Branch `main`, Ordner `/root`). Seit 2026-09-09 live.

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
  auf Marks Auth-ID setzen: `USER_ID = df0b24a6-6a74-4830-995c-84015161dcc3`.
- GitHub-Account: `mkunau-ctrl`. Falls ein Push blockiert wird, pusht Mark selbst
  mit `!git push`.
- Datum im Log absolut schreiben (kein "heute").

### Supabase-Projekt

- Name `mein-dashboard`, Ref `vogztxoaqbnuciboughd`.
- URL `https://vogztxoaqbnuciboughd.supabase.co`; Publishable-Key steht in
  `js/supabase.js` (öffentlich, unkritisch).
- Auth: E-Mail-Provider an. Site URL
  `https://mkunau-ctrl.github.io/mein-dashboard/`. Redirect-Allowlist:
  `http://localhost:8000/**` und `https://mkunau-ctrl.github.io/mein-dashboard/**`.
- `USER_ID` (Marks Auth-UID) = `df0b24a6-6a74-4830-995c-84015161dcc3`
  (erster Login am 2026-09-09).
