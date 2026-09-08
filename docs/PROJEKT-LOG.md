# Projekt-Log: Mein Dashboard

Chronologisches Logbuch, neueste Einträge oben. Prosa, kein Code-Dump.

---

## 2026-09-09 – Etappe 0: Grundgerüst gebaut (Branch `etappe-0`)

**Was:** Das komplette Grundgerüst der App wurde auf dem Branch `etappe-0`
gebaut: Test-Harness + Router (`parseHash`), Supabase-Client + Auth-Wrapper
(Magic-Link), Modul-Registry, HTML-Shell mit Login-Flow und leerem
Kachel-Raster, PWA-Manifest + SVG-Icon. Dazu die Modul-Schnittstellen-Doku
(`js/module/README.md`).

**Warum:** Bevor das erste Fachmodul (Ernährung) entsteht, braucht es ein
tragfähiges, getestetes Skelett: Auth, Routing, eine Stelle, an der sich Module
anmelden, und ein deploybares statisches Bundle.

**Entscheidungen:**
- Tests mit `node --test` (Bordmittel) statt eines Test-Frameworks – kein
  zusätzliches Dependency, kein Build.
- `supabase-js` exakt gepinnt auf `2.116.0` über jsDelivr-ESM nach einem
  kurzen Supply-Chain-Review (kein `@latest`, feste Version).
- Hosting weiterhin GitHub Pages, statisches Repo, kein Build-Schritt.

**Stand danach:** 8 Unit-Tests grün (`npm test`). Aller Code liegt auf Branch
`etappe-0`. **Deploy und Merge nach `main` stehen noch aus** – die App ist noch
nicht live.

**Offene Punkte:**
- Branch `etappe-0` nach `main` mergen.
- GitHub Pages aktivieren (Settings → Pages, Branch `main` / `/root`).
- End-to-End-Test des Magic-Link-Logins auf der Live-URL (Desktop + iPhone).
- `USER_ID` (Marks Auth-UID) nach dem ersten Login in `CLAUDE.md` eintragen.
- Echte PNG-Icons 192/512 + `apple-touch-icon` in Etappe 1 nachliefern
  (iOS nutzt sonst einen Screenshot für den Home-Bildschirm).
- Evtl. eigenes SMTP für die Magic-Link-Mails (Supabase-Default hat Limits).
- Realtime-Aktualisierung des Dashboards (später).

---

## 2026-09-08 – Zentrale Projekt-Ablage eingeführt

**Was:** Ab jetzt liegen alle Projekte unter `C:\Users\PC\Projekte\<name>`.
`mein-dashboard` wurde nach `C:\Users\PC\Projekte\mein-dashboard` verschoben.
Diese Konvention ist im Skill `projekt-workflow` und im Gedächtnis festgehalten.

**Warum:** Marks Projekte lagen verstreut (teils direkt im Benutzerordner, teils
auf dem Desktop). Er will einen festen großen Ordner mit einem Unterordner pro
Projekt, damit er auf jedem Rechner alles an derselben Stelle findet.

**Stand danach:** mein-dashboard, energiesparer-modus, monitor-focus-follow,
tischlerei-kosiek, malerbetrieb-heinze-website, tobis-hausmeister-redesign sind
umgezogen. Die geplante Aufgabe „MonitorFocusFollow" wurde auf den neuen Pfad
angepasst und läuft. fehlzeiten-portal, tipptrainer und
rechtschreibung-windows-verbessern konnten noch nicht umziehen (laufende
Dev-Server / andere Session) – stehen noch aus.

**Offene Punkte:** die drei verbliebenen Projekte umziehen, sobald ihre
Prozesse beendet sind.

---

## 2026-09-08 – Projekt gestartet, Gesamtkonzept geschrieben

**Was:** Das Projekt "Mein Dashboard" wurde angelegt (Repo, Doku-Gerüst). Das
Gesamtkonzept liegt in `docs/specs/2026-09-08-dashboard-konzept.md`. Noch kein
Code.

**Warum:** Mark wollte ursprünglich einen Ernährungstracker (feste Tagesliste
abhaken + Statistik). Im Gespräch wurde klar, dass er eigentlich eine zentrale
Oberfläche für mehrere Lebensbereiche will (Ernährung, To-dos, Finanzen,
Lager/Ersatzteile), die er auch per Claude füttern kann. Deshalb erst ein
Gesamtkonzept, dann Modul für Modul.

**Entscheidungen:**
- Web-App statt nativer iOS-App (App-Store-Aufwand zu hoch), läuft überall im
  Browser, iPhone per "Zum Home-Bildschirm".
- Hosting: GitHub Pages, öffentliches Repo. Kein eigener Server.
- Technik: reines HTML/CSS/JS ohne Framework/Build, `supabase-js` + `Chart.js`
  per CDN. Bewusst gegen React/Next.js entschieden (Overkill).
- Daten: Supabase (eine DB, pro Modul Tabellen). Login per Magic-Link,
  Row-Level-Security pro Zeile.
- Claude schreibt direkt in Supabase (MCP am PC, Connector in der App) – kein
  Backend nötig.
- Bewusst nicht: native App, Bank-API, Offline-Sync, Mehrbenutzer, Push.
- Modul-Reihenfolge: Ernährung → To-dos → Finanzen → Lager.

**Stand danach:** Konzept-Dokument steht. Repo wird auf GitHub gepusht. Kein
lauffähiger Code.

**Offene Punkte / Nächste Schritte:**
- Mark liest das Konzept gegen und gibt frei.
- Danach Feinplan für Etappe 0 (Grundgerüst: Repo, Supabase-Projekt, Auth,
  leeres Kachel-Raster, Deploy) über die Superpowers-Planungs-Skills.
- Supabase-Projekt "mein-dashboard" anlegen.
