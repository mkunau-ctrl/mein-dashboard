# Etappe 4, Sub-Etappe D – Neues Rechnungen-Modul: Design

**Datum:** 2026-09-21
**Status:** Entwurf — enthält vom Koordinator zu bestätigende Annahmen (siehe unten)
**Vorgänger:** `CLAUDE.md` Backlog-Item D, Prototyp-Screen "Rechnungen"
(`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`).

## 0. Annahmen des Koordinators (bitte bestätigen)

Diese Spec wurde ohne direkte Rückfrage geschrieben (mehrere Forks
liefen parallel, der Nutzer wollte nicht von jedem einzeln gefragt
werden). Vier Design-Entscheidungen wurden deshalb selbst getroffen:

1. **Erfassung sowohl per App-Formular als auch per Chat-Diktat/Foto** —
   analog zu Einnahmen/Konten/Schulden aus Sub-Etappe A, passt zum
   Prototyp-Fidelity-Grundsatz.
2. **Die E-Mail-Automatisierung erkennt künftig auch Rechnungen**
   (neuer Klassifikations-Typ `rechnung` neben `beleg`/`sendung`/
   `amazon`/`termin`) — naheliegende, kleine Erweiterung des
   bestehenden Musters.
3. **Eine bezahlte Rechnung wird NICHT automatisch zu einer Ausgabe** —
   komplett getrenntes Datenmodell. Eine Rechnung ist schon vor der
   Zahlung real (sie existiert als offene Verbindlichkeit); die
   tatsächliche Ausgabe entsteht weiterhin über den etablierten Weg
   (Chat-Diktat/Foto einer Ausgabe), wenn Mark sie wirklich bezahlt
   hat. Automatische Verknüpfung würde Doppel-Buchungen riskieren.
4. **"Überfällig" = reiner Datumsvergleich** (`faellig_am < heute` UND
   `status = 'offen'`), kein Kulanz-Zeitraum.

Falls der Nutzer etwas davon anders will, ist das ein kleiner,
lokalisierter Änderungswunsch — keine dieser vier Annahmen hat
Auswirkungen auf andere Sub-Etappen.

## 1. Ziel

Ein komplett neues Rechnungen-Modul: offene, bezahlte und überfällige
Rechnungen verwalten, im Design des Prototyp-Screens "Rechnungen"
(Filter-Chips, Summenkarte oben).

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Datenmodell | eigene Tabelle `rechnungen`, kein Bezug zu `expenses` | Siehe Annahme 3 oben |
| Status | `offen`/`bezahlt` als Feld, "überfällig" wird berechnet (nicht gespeichert) | Konsistent mit dem Projekt-Stil (reine Berechnungsfunktionen statt denormalisierter Felder, wie bei Schulden in Sub-Etappe A) |
| Erfassung | App-Formular (wie Einnahmen/Konten/Schulden) + Chat-Diktat + Foto | Annahme 1 |
| E-Mail-Automatisierung | neuer Typ `rechnung` in `klassifizieren.js`, `postfach-scan.mjs` schreibt in `rechnungen` | Annahme 2 |
| Bottom-Nav | **kein eigener Nav-Punkt** — erreichbar über `#/rechnungen`, verlinkt vom bereits in Sub-Etappe E+F gebauten (dort noch dekorativen) "Rechnungen"-Schnelleinstieg in der Suche | Knüpft an die in E+F bewusst als Deko gebaute UI an (dort so vorgesehen), passt zum Muster "nicht jedes Modul braucht einen Bottom-Nav-Punkt" (Einstellungen/Projekte-Übersicht ebenso) |
| Fälligkeits-Erinnerung | **keine eigene Umsetzung hier** | Annahme aus dem ursprünglichen Backlog-Brainstorming: überlassen an Sub-Etappe M (Kalender & Erinnerungen) |

## 3. Datenmodell (Supabase, Schema `public`)

### `rechnungen` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `haendler` | `text not null` | z. B. "E.ON", "Telekom" |
| `betrag` | `numeric not null` | |
| `faellig_am` | `date not null` | |
| `status` | `text not null default 'offen'` | Check-Constraint: `status in ('offen','bezahlt')` |
| `bezahlt_am` | `date` | nullable, gesetzt beim Bezahlen |
| `notiz` | `text` | optional |
| `quelle` | `text not null default 'manuell'` | `manuell`/`foto`/`email`, gleiches Muster wie `expenses.quelle` |
| `erstellt_am` | `timestamptz not null default now()` | |

RLS wie überall: `user_id = auth.uid()`, `for all to authenticated`.

## 4. Logik (reine Funktionen, `js/module/rechnungen/berechnung.js`)

- `istUeberfaellig(rechnung, heute)` → `boolean` (Annahme 4).
- `sortiereRechnungen(rechnungen, heute)` → überfällige zuerst (nach
  `faellig_am` aufsteigend, älteste Fälligkeit zuerst), dann offene
  nicht-überfällige (nach `faellig_am` aufsteigend), dann bezahlte
  (nach `bezahlt_am` absteigend).
- `summeOffenerRechnungen(rechnungen)` → Summe aller `status:'offen'`
  (für die Summenkarte oben, wie im Prototyp: "X offene Rechnungen,
  Y € Summe").

## 5. Dateistruktur

`js/module/rechnungen/` (neues Modul, kein Bottom-Nav-Eintrag):
| Datei | Aufgabe | Test |
|---|---|---|
| `daten.js` | `ladeAlles`, `legeRechnungAn({haendler,betrag,faellig_am,notiz,quelle})`, `setzeRechnungBezahlt(id)`, `entferneRechnung(id)` | – |
| `berechnung.js` | siehe Abschnitt 4 | ✅ |
| `index.js` | Registrierung (`id:'rechnungen'`), Summenkarte oben, Filter-Chips (Offen/Bezahlt/Überfällig, Muster wie `finanzen/transaktionen.js`s Kategorie-Chips aus Sub-Etappe B), Liste + Formular (Muster wie `finanzen/schulden.js`) | manuell |

`automatisierung/klassifizieren.js`:
- `ERLAUBTE_TYPEN`/`baustePrompt()` um `rechnung` erweitert:
  `{"typ":"rechnung","haendler":string,"betrag":number,"faelligAm":"YYYY-MM-DD"}`.

`automatisierung/postfach-scan.mjs`:
- `schreibeErgebnis()` bekommt einen neuen `if (k.typ === 'rechnung')`-
  Zweig, schreibt nach `rechnungen` (inkl. `konto_id`-Lehre aus
  Sub-Etappe A: hier nicht nötig, `rechnungen` hat kein `konto_id`-Feld,
  da eine Rechnung noch keine Kontobuchung ist).

`js/module/suche/index.js`:
- Der bestehende, seit E+F dekorative "Rechnungen"-Schnelleinstieg wird
  auf echte Navigation umgestellt (`#/rechnungen` statt Toast).

## 6. Definition of Done

- [ ] Tabelle `rechnungen` angelegt (RLS, Check-Constraint `status`).
- [ ] `node --test` grün: `istUeberfaellig`, `sortiereRechnungen`,
      `summeOffenerRechnungen`.
- [ ] Rechnung anlegen (Formular + Chat-Diktat-fähige `daten.js`-
      Funktion), als bezahlt markieren, löschen funktioniert.
- [ ] Filter-Chips zeigen korrekt offen/bezahlt/überfällig.
- [ ] E-Mail-Automatisierung erkennt Rechnungen (`rechnung`-Typ), legt
      sie automatisch an.
- [ ] Suche-Schnelleinstieg "Rechnungen" führt zur echten Liste statt
      zum Toast.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.

## 7. Bewusst NICHT in dieser Sub-Etappe

- Automatische Verknüpfung zu `expenses` beim Bezahlen (Annahme 3).
- Fälligkeits-Erinnerungen auf Home (Sub-Etappe M).
- Eigener Bottom-Nav-Punkt.
