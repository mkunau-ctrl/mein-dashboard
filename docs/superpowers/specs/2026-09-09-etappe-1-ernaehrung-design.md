# Etappe 1 – Modul Ernährung: Design / Spec

**Datum:** 2026-09-09
**Status:** abgestimmt mit Mark, bereit für den Implementierungsplan
**Vorgänger:** `docs/specs/2026-09-08-dashboard-konzept.md` (Abschnitt 5),
`docs/superpowers/plans/2026-09-08-etappe-0-grundgeruest.md`

---

## 1. Ziel

Das erste echte Fachmodul: Mark hakt täglich seine Ernährungs- und
Supplement-Punkte ab, trägt sein Gewicht ein und sieht vier Statistiken
(Streak, Quote pro Punkt, Kalender-Heatmap, Ziel-Prognose). Claude kann per
Supabase-MCP Tageseinträge setzen, die im Dashboard erscheinen.

Alles in **einer** Etappe (von Mark so gewünscht), aber intern in kleine,
einzeln testbare Bausteine zerlegt.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Statistik-Berechnung | **im Browser** (JS aus Roh-Log), nicht in Postgres | Kein Server-Code, keine SQL-View-Migrationen; Rechenlogik = reine Funktionen, mit `node:test` prüfbar. Ein Nutzer, wenige tausend Zeilen/Jahr – Datenmenge unkritisch. |
| Kalender-Heatmap | **handgebautes CSS-Grid** aus `<div>`s | Chart.js kann keine Heatmap ohne Zusatz-Plugin. |
| Gewichtskurve | **Chart.js 4.x** (exakt gepinnt, jsDelivr-ESM) | Im Konzept vorgesehen, passt für eine Linienkurve. |
| Punkt-Typ | vorerst **nur `haken`** (erledigt ja/nein); Mengen stehen im Namen | Mark will nur abhaken. Spalte `typ`/`wert` bleibt im Modell für spätere Zähler. |
| Bonus/Pflicht | alle Punkte **Pflicht** (`pflicht` default `true`); Spalte bleibt | Mark will keine Bonus-Punkte, evtl. später. |
| Aktualisierung | Laden beim Öffnen + „Aktualisieren"-Knopf; **kein Realtime** | Wie Konzept. |
| Löschen von Punkten | **Soft-Delete** (`aktiv = false`) | Historie / alte Log-Einträge bleiben auswertbar. |

## 3. Datenmodell (Supabase, Schema `public`)

Alle Tabellen haben `id uuid primary key default gen_random_uuid()`,
`user_id uuid not null default auth.uid()` und **RLS**: für `authenticated`,
alle Operationen, `using (user_id = auth.uid()) with check (user_id = auth.uid())`.

### `checklist_items`
| Spalte | Typ | Hinweis |
|---|---|---|
| `label` | `text not null` | Anzeigename, z. B. „4 Eier" |
| `kategorie` | `text not null default 'ernaehrung'` | `ernaehrung` \| `supplement` |
| `typ` | `text not null default 'haken'` | `haken` \| `zaehler` (zaehler reserviert, in Etappe 1 ungenutzt) |
| `zielwert` | `numeric` | nur für `zaehler`, sonst `null` |
| `einheit` | `text` | nur für `zaehler` |
| `plan_typ` | `text not null default 'taeglich'` | `taeglich` \| `wochentage` \| `intervall` |
| `plan_wochentage` | `int[]` | bei `wochentage`: 1=Mo … 7=So |
| `plan_intervall_tage` | `int` | bei `intervall`: Mindestabstand in Tagen seit letztem Abhaken |
| `pflicht` | `bool not null default true` | zählt ins Tagesziel |
| `sortierung` | `int not null default 0` | Reihenfolge in der Liste |
| `aktiv` | `bool not null default true` | Soft-Delete |
| `erstellt_am` | `timestamptz not null default now()` | |

### `daily_log`
| Spalte | Typ | Hinweis |
|---|---|---|
| `datum` | `date not null` | |
| `item_id` | `uuid not null references checklist_items(id)` | |
| `erledigt` | `bool not null default false` | |
| `wert` | `numeric` | für spätere Zähler |
| `aktualisiert_am` | `timestamptz not null default now()` | |
| | | `unique (user_id, datum, item_id)` |

### `weight_log`
| Spalte | Typ | Hinweis |
|---|---|---|
| `datum` | `date not null` | `unique (user_id, datum)` |
| `gewicht_kg` | `numeric not null` | |

### `settings`
`primary key (user_id, key)`, `value jsonb not null`.
Bekannte Keys:
- `koerpergroesse_cm` → Zahl (Seed: `179`)
- `zielgewicht_kg` → Zahl (Seed: `77`)
- `infos_markdown` → String (Referenz-Text, s. u.)

## 4. „Fällig heute"-Logik & Tagesziel

`istFaellig(item, datum, kontext)` → `bool`:
- `plan_typ = 'taeglich'` → immer `true`
- `plan_typ = 'wochentage'` → `plan_wochentage` enthält den Wochentag von
  `datum` (Mo=1 … So=7)
- `plan_typ = 'intervall'` → `kontext.letzteErledigung` ist `null`
  (nie erledigt) **oder** `datum − letzteErledigung ≥ plan_intervall_tage`.
  `letzteErledigung` = spätestes `daily_log.datum` mit `erledigt = true` für
  dieses Item, das `< datum` liegt (für „heute": letztes Abhaken vor heute).
  Folge: ein überfälliger Intervall-Punkt bleibt jeden Tag fällig, bis er
  abgehakt wird.

**Tagesstatus(datum)** (für Heatmap & Streak):
- `keine` – kein an `datum` fälliger Pflicht-Punkt (kommt praktisch nicht vor,
  da tägliche Punkte existieren) → Heatmap grau, Streak springt drüber
- `erfuellt` – **alle** an `datum` fälligen Pflicht-Punkte haben
  `daily_log.erledigt = true` → grün
- `teilweise` – mindestens einer, aber nicht alle → gelb
- `offen` – keiner erledigt → rot

**Streak** = aufeinanderfolgende Tage mit Status `erfuellt`
(`keine`-Tage unterbrechen nicht, verlängern aber auch nicht). Ausgabe:
`{ aktuell, laengste }`. Bewertet wird bis **gestern** (heute ist noch offen).

## 5. Statistiken (reine Funktionen in `berechnung.js`)

| Funktion | Eingabe | Ausgabe |
|---|---|---|
| `tagesStatus(datum, items, logs)` | Datum, aktive Items, Log-Zeilen | `'keine'\|'erfuellt'\|'teilweise'\|'offen'` |
| `streak(items, logs, heute)` | | `{ aktuell, laengste }` |
| `quoteProPunkt(items, logs, zeitraumTage)` | z. B. 30 / 90 / „seit Anlage" | `[{ itemId, label, faelligeTage, erledigteTage, quote }]` |
| `prognose(items, logs, heute, fensterTage=14, zielTage=30)` | | `{ quote, erwartet, zielTage }` z. B. `{0.7, 21, 30}` |
| `heatmapDaten(jahr, monat, items, logs)` | | `[{ datum, status }]` für alle Tage des Monats bis heute |

**Prognose:** Erfolgsquote (`erfuellt`-Tage / bewertete Tage) der letzten
`fensterTage` → hochgerechnet auf `zielTage`: „≈ 21 von 30 Tagen".

## 6. Dateistruktur

### Neu: `js/module/ernaehrung/`
| Datei | Aufgabe | Test |
|---|---|---|
| `index.js` | Registriert Modul (`id:'ernaehrung'`, `titel:'Ernährung'`), baut Tab-Leiste, Unter-Routing, `renderKachel` („Heute 6/9"), `init(container)`. | – |
| `daten.js` | Supabase-Wrapper (einzige Datei mit Netz): `ladeItems`, `speichereItem`, `deaktiviereItem`, `ladeLog(von,bis)`, `setzeLogEintrag(datum,itemId,erledigt)`, `ladeGewicht`, `setzeGewicht(datum,kg)`, `ladeSettings`, `setzeSetting(key,value)`. | – |
| `zeitplan.js` | `istFaellig(item, datum, kontext)`. | ✅ |
| `berechnung.js` | `tagesStatus`, `streak`, `quoteProPunkt`, `prognose`, `heatmapDaten`. | ✅ |
| `heute.js` | Heute-Ansicht: fällige Punkte nach Kategorie, Tippen = erledigt, Fortschrittsring. | manuell |
| `liste.js` | Liste bearbeiten: anlegen/umbenennen, Zeitplan setzen, sortieren, deaktivieren. | manuell |
| `gewicht.js` | Gewicht eintragen, Chart.js-Kurve, Ziel-Linie (`zielgewicht_kg`), BMI wenn `koerpergroesse_cm` gesetzt, Feld für Körpergröße. | manuell |
| `statistik.js` | Streak-Karten, Quote-Balken, CSS-Heatmap mit Monats-Navigation, Prognose-Text. | manuell |
| `infos.js` | `settings.infos_markdown` nur lesen (Mini-Markdown → HTML). | – |

### Geändert (Etappe 0)
- **`js/router.js`** – `parseHash` liefert zusätzlich `unterseite`:
  `#/ernaehrung/statistik` → `{ modul:'ernaehrung', unterseite:'statistik' }`,
  `#/ernaehrung` → `{ modul:'ernaehrung', unterseite:null }`.
  `test/router.test.js` wird erweitert.
- **`js/app.js`** – Detail-Routing (in Etappe 0 bewusst weggelassen): zeigt Hash
  auf ein registriertes Modul, wird das Kachel-Raster ausgeblendet und
  `modul.init(container)` gerufen; Hash ohne Modul → zurück zum Raster.
- **`index.html`** – Chart.js-CDN (feste Version), Container `#modul-detail`.
- **`js/module/README.md`** – Ordner-Konvention ergänzen (`module/<name>/index.js`).
- **`app.css`** – Stile für Tab-Leiste, Heute-Liste, Fortschrittsring,
  Quote-Balken, Heatmap-Grid.

### Datenfluss
`init()` lädt einmal: aktive Items, Log der letzten 90 Tage, Gewicht, Settings.
Views rendern daraus. Abhaken schreibt sofort (`setzeLogEintrag`) und
aktualisiert den lokalen Zustand. „Aktualisieren"-Knopf lädt neu. Für Streak/
Prognose, die weiter zurückreichen, lädt `statistik.js` bei Bedarf den
kompletten Log nach (`ladeLog(null, heute)`).

## 7. Startbefüllung (per Supabase-MCP beim Bau, `user_id` = Marks Auth-UID)

`checklist_items` (Sortierung in dieser Reihenfolge):

**Kategorie `ernaehrung`:**
| label | plan_typ | Detail |
|---|---|---|
| 2 Brötchen (Sauerteig) | taeglich | |
| 4 Eier | taeglich | |
| 1 Banane | taeglich | |
| 1 Glas Milch | taeglich | |
| 350 g Sauerteigbrot gesamt | taeglich | |
| 1 Handvoll geröstete Kürbiskerne | taeglich | |
| 1–2 Paranüsse | taeglich | |
| Jodiertes Meersalz beim Kochen | taeglich | |
| 100 g Fleisch | wochentage | `{1,2,3,4,5,6}` (Mo–Sa) |
| Leber 25 g | wochentage | `{1,4}` (Mo & Do) |

**Kategorie `supplement`:**
| label | plan_typ | Detail |
|---|---|---|
| NORSAN Omega-3 Total 4 ml | taeglich | |
| Magnesiumbisglycinat 2 Kapseln | taeglich | |
| Vitamin C gepuffert 2 Kapseln | taeglich | |
| Vitamin D3/K2 + Omega-3 Kombi (1 Kps) | intervall | `plan_intervall_tage = 5` |

`weight_log`: ein Eintrag für den Bautag, `gewicht_kg = 71`.

`settings`: `koerpergroesse_cm = 179`, `zielgewicht_kg = 77`,
`infos_markdown` = die PDF-Abschnitte **Wichtigster offener Punkt (Bluttest)**,
**Bezugsquellen** (4 Links), **Hauptgerichte-Rotation**,
**Wichtige Erkenntnisse aus der Recherche**.

## 8. Testen

- **TDD** für `zeitplan.js`, `berechnung.js`, die `router`-Erweiterung: Tests
  zuerst, mit erfundenen Item-/Log-Daten. Prüffälle u. a.: Wochentag-Punkt
  taucht am falschen Tag nicht auf; Intervall-Punkt wird nach 5 Tagen fällig
  und bleibt überfällig; Streak bricht bei `teilweise`; Heatmap-Farbe pro
  Status; Prognose-Hochrechnung.
- **Manueller Testlauf** (Live-URL + iPhone-Safari), fester Ablauf:
  1. Login → Kachel „Ernährung" zeigt „Heute x/y".
  2. Modul öffnen → Heute-Liste zeigt nur heute fällige Punkte, gruppiert.
  3. Punkte abhaken → Fortschrittsring steigt, Kachel-Zahl aktualisiert nach
     Zurück.
  4. Liste bearbeiten: neuen Punkt anlegen, Zeitplan „nur Mo/Do", speichern →
     erscheint in Heute nur am richtigen Tag.
  5. Gewicht-Tab: Körpergröße 179 eintragen → BMI erscheint; heutiges Gewicht
     ändern → Kurve + Ziel-Linie sichtbar.
  6. Statistik-Tab: Streak-Karten, Quote-Balken, Heatmap blättern, Prognose.
  7. Infos-Tab: Referenz-Text lesbar.
- **DoD Claude↔Supabase:** nach dem Bau per MCP `insert into daily_log` für
  heute + ein Item; im Dashboard nach „Aktualisieren" sichtbar.

## 9. Definition of Done

- [ ] 4 Tabellen + RLS in Supabase angelegt (per `apply_migration`).
- [ ] Startdaten geseedet (14 Checklisten-Punkte, Gewicht, 3 Settings).
- [ ] `node:test` grün: `zeitplan`, `berechnung`, `router` (+ die aus Etappe 0).
- [ ] Heute / Liste / Gewicht / Statistik / Infos funktionieren auf
      Desktop-Chrome **und** iPhone-Safari.
- [ ] Alle vier Statistiken mit Testdaten verifiziert.
- [ ] Claude setzt per MCP einen Tageseintrag, er erscheint im Dashboard.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, alles auf `main` gepusht,
      Live-Deploy geprüft.

## 10. Bewusst NICHT in Etappe 1 (Ideen fürs Log)

- **Hauptgerichte-Rotation** (Gulasch → Lasagne → …, 2 Tage je Gericht) als
  eigener Anzeiger – geparkt.
- **Zähler-Punkte** (Wasser 2/3 …) – Modell ist vorbereitet (`typ`, `wert`,
  `zielwert`), UI kommt bei Bedarf.
- **Bonus-Punkte** – `pflicht`-Spalte existiert, UI-Umschalter später.
- **Realtime-Aktualisierung** – später projektweit.
- **Echte PNG-/Apple-Touch-Icons** – offener Punkt aus Etappe 0, hier miterledigen
  falls Zeit, sonst weiter offen.

## 11. Offene Abhängigkeit

`apply_migration` und Seed-Inserts laufen über den Supabase-MCP mit
Admin-Rechten – `user_id` in jedem Insert **explizit** auf
`df0b24a6-6a74-4830-995c-84015161dcc3` setzen (steht in `CLAUDE.md`).
