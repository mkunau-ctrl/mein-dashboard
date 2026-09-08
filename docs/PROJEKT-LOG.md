# Projekt-Log: Mein Dashboard

Chronologisches Logbuch, neueste Einträge oben. Prosa, kein Code-Dump.

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
