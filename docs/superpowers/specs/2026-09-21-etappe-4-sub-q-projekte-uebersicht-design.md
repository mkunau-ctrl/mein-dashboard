# Etappe 4, Sub-Etappe Q – Projekte-Übersicht: Design

**Datum:** 2026-09-21
**Status:** bereit zum Bauen (mit den Nutzer-Antworten aus dem
ursprünglichen Brainstorming — diese Fassung ist die dritte Version
dieser Datei, nachdem sie zweimal von fehlgeleiteten, eigentlich
anderen Sub-Etappen zugewiesenen Forks überschrieben wurde. Jetzt
zusätzlich committed, damit sie nicht noch einmal verloren geht.)

## 0. Hinweis zur Entstehung dieser Fassung

Diese Spec wurde ursprünglich von einem eigenen Fork mit echten
Nutzer-Rückfragen (per `AskUserQuestion`) erarbeitet. Danach haben
**zwei verschiedene, eigentlich anderen Sub-Etappen (P bzw. vermutlich
O/N) zugewiesene Forks** versehentlich denselben Dateipfad
überschrieben — mit jeweils eigenen, erfundenen Annahmen statt der
echten Nutzer-Antworten. Der Koordinator hat diese Fassung anhand der
in der ursprünglichen Fork-Abschlussmeldung dokumentierten
Original-Entscheidungen rekonstruiert. Wird im Projekt-Log als Fehler
dokumentiert (Doku-Rigor-Regel) — Ursache wird noch untersucht,
vermutlich ein Kontext-Vermischungsproblem zwischen parallelen Forks.

## 1. Ziel

Ein Bereich im Dashboard, der alle lokalen Projekte unter
`C:\Users\PC\Projekte\<name>` auflistet und pro Projekt den Inhalt
seiner `CLAUDE.md` anzeigt — primär für Claude gedacht (schneller
Kontext-Zugriff über Supabase-MCP, ohne erst jedes Projektverzeichnis
einzeln öffnen zu müssen), für Mark über die Suche auffindbar.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Datenhaltung | neue Tabelle `claude_projekte` (`name`, `inhalt`, `sync_zeitstempel`) | GitHub Pages kann nicht lokal auf die Festplatte zugreifen — Supabase ist die Brücke, gleiches Prinzip wie bei der E-Mail-Automatisierung |
| Sync-Mechanismus | neues Node-Skript `automatisierung/projekte-sync.mjs`, **voller Re-Sync bei jedem Lauf** (bestehende Zeilen löschen, neu schreiben, kein Diff/Merge) | Einfachste, robusteste Variante — Projekte-Liste ändert sich selten genug, dass ein voller Re-Sync keine spürbaren Kosten hat |
| Projekt-Erkennung | automatisch alle Unterordner von `C:\Users\PC\Projekte\`, die eine `CLAUDE.md` enthalten | Nutzer-Bestätigung: keine manuelle Pflegeliste nötig |
| Sync-Frequenz | Windows Scheduled Task, **werktags 06:30 / 13:00 / 15:30 Uhr, am Wochenende zusätzlich 18:00 / 21:00 Uhr**, plus jederzeit manuell ausführbar | Nutzer-Antwort — deutlich häufiger als die tägliche E-Mail-Automatisierung, da Projekt-Stände sich im Tagesverlauf oft ändern |
| Einstiegspunkt im Dashboard | **kein eigener Bottom-Nav-Punkt** — neuer Schnelleinstieg "Projekte" im Suche-Screen (`#/projekte`), analog zum neuen Einstellungen-Screen (auch ohne eigenen Nav-Punkt) | Nutzer-Bestätigung: primär für Claude gedacht, Mark braucht nur gelegentlichen Zugriff |
| Darstellung | einfaches, selbstgeschriebenes Markdown-Rendering (nur Überschriften `#`/`##` + fett `**...**`, kein externes Markdown-Paket) | `CLAUDE.md`-Dateien nutzen nur einfache Markdown-Elemente, eine volle Bibliothek wäre Overkill |
| Funktionsumfang | reine Anzeige, **keine** projektübergreifende Suche/Volltextsuche über alle `CLAUDE.md`-Inhalte | YAGNI — kann bei Bedarf später ergänzt werden, kein aktueller Wunsch |

## 3. Datenmodell (Supabase, Schema `public`)

### `claude_projekte` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `name` | `text not null` | Projektordner-Name |
| `inhalt` | `text not null` | kompletter `CLAUDE.md`-Inhalt |
| `sync_zeitstempel` | `timestamptz not null default now()` | Zeitpunkt des letzten Syncs |

RLS wie überall: `user_id = auth.uid()`, `for all to authenticated`.
`unique (user_id, name)` — Upsert-Ziel für den vollen Re-Sync.

## 4. Dateistruktur

- `automatisierung/projekte-sync.mjs` (neu) — scannt
  `C:\Users\PC\Projekte\*\CLAUDE.md`, liest jede gefundene Datei, macht
  einen vollen Re-Sync (`delete` aller bestehenden Zeilen des Nutzers,
  dann `insert` aller aktuell gefundenen Projekte). Kein
  `letzter-lauf.js`-Zeitfenster-Mechanismus nötig (anders als beim
  E-Mail-Scan) — jeder Lauf ist vollständig unabhängig vom vorherigen.
- `js/module/projekte/` (neues Modul, kein Bottom-Nav-Eintrag):
  - `index.js` — Registrierung (`id:'projekte'`), Liste aller Projekte
    (Name + Sync-Zeitstempel), Klick öffnet die Detailansicht.
  - `daten.js` — `ladeAlles()` liest `claude_projekte`.
  - `markdown.js` — reine Funktion `zuHtml(markdown): string` (nur
    Überschriften + fett, keine externe Bibliothek).
- `js/module/suche/index.js` — "Projekte" als neuer Schnelleinstieg
  ergänzt (führt zu `#/projekte`).
- Windows Scheduled Task `MeinDashboard-ProjekteSync`: werktags
  06:30/13:00/15:30 Uhr, Wochenende zusätzlich 18:00/21:00 Uhr.

## 5. Definition of Done

- [ ] Tabelle `claude_projekte` angelegt (RLS, `unique(user_id,name)`).
- [ ] `projekte-sync.mjs` läuft manuell fehlerfrei durch, findet alle
      Projekte mit `CLAUDE.md` unter `C:\Users\PC\Projekte\`.
- [ ] Scheduled Task eingerichtet, läuft nach Zeitplan.
- [ ] Neues Projekte-Modul zeigt Liste + Detailansicht mit
      gerendertem Markdown.
- [ ] Suche zeigt "Projekte" als neuen Schnelleinstieg.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert (inkl. des
      zweifachen Überschreib-Vorfalls dieser Spec-Datei, siehe
      Abschnitt 0), gepusht.

## 6. Bewusst NICHT in dieser Sub-Etappe

- Projektübergreifende Volltextsuche über alle `CLAUDE.md`-Inhalte.
- Aktionen auslösen (z. B. Claude-Sessions starten) — reine Anzeige.
