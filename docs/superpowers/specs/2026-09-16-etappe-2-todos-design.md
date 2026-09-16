# Etappe 2 – Modul To-dos: Design

**Datum:** 2026-09-16
**Status:** abgestimmt mit Mark, bereit zum Bauen
**Vorgänger:** `docs/specs/2026-09-08-dashboard-konzept.md` (Abschnitt 4.3/6),
Etappe 1 (`docs/superpowers/specs/2026-09-09-etappe-1-ernaehrung-design.md`)
als Muster für Modul-Struktur und Datenzugriff.

## 1. Ziel

Ein Aufgaben-Modul: Mark trägt einmalige und wiederkehrende Todos ein
("Müll raus" jeden Montag, "TÜV Auto" jährlich am 1.3. …), hakt sie ab und
sieht offene/überfällige Aufgaben auf der Kachel.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Wiederkehrende Todos | eigene **Vorlage** bleibt bestehen, beim Abhaken wird eine **neue Zeile** (erledigt) angelegt und eine neue offene Instanz erzeugt | Von Mark am 2026-09-16 so entschieden – mehr Historie statt ein Datum, das nur weiterspringt. Analog zum Ernährungsmuster (`checklist_items` ↔ `daily_log`), hier aber nur je eine offene Instanz statt einer Zeile pro Tag. |
| Rhythmus-Optionen | täglich, bestimmte Wochentage, monatlich (Tag im Monat) | Deckt Marks genannte Beispiele ab; kein Intervall-Typ wie bei Ernährung (unnötig für Todos, YAGNI). |
| Löschen (einmalig, offen) | harte Löschung | Todos sind keine Statistikbasis, kein Grund für Soft-Delete. |
| Löschen/Beenden (wiederkehrend) | Vorlage `aktiv=false` + offene Instanz löschen | Stoppt künftige Instanzen; bereits erledigte Zeilen (Historie) bleiben. |
| Priorität/Kategorien | keine | Nicht gewünscht/gebraucht, YAGNI – ggf. später ergänzen. |
| Aktualisierung | Laden beim Öffnen + „Aktualisieren"-Knopf, kein Realtime | Wie Ernährung. |

## 3. Datenmodell (Supabase, Schema `public`)

Beide Tabellen: `id uuid primary key default gen_random_uuid()`, `user_id uuid
not null default auth.uid()`, RLS für `authenticated`: alle Operationen,
`using (user_id = auth.uid()) with check (user_id = auth.uid())`.

### `todo_vorlagen` (nur für wiederkehrende Todos)
| Spalte | Typ | Hinweis |
|---|---|---|
| `text` | `text not null` | |
| `plan_typ` | `text not null` | `taeglich` \| `wochentage` \| `monatlich` |
| `plan_wochentage` | `int[]` | bei `wochentage`: 1=Mo … 7=So |
| `plan_tag_im_monat` | `int` | bei `monatlich`: 1–31 |
| `naechste_faelligkeit` | `date not null` | wird nach jedem Abhaken fortgeschrieben |
| `aktiv` | `bool not null default true` | `false` = beendet, keine neuen Instanzen mehr |
| `erstellt_am` | `timestamptz not null default now()` | |

### `todos` (einmalige Todos + Instanzen wiederkehrender Vorlagen)
| Spalte | Typ | Hinweis |
|---|---|---|
| `text` | `text not null` | |
| `faellig` | `date` | optional, auch bei einmaligen Todos |
| `erledigt` | `bool not null default false` | |
| `erledigt_am` | `timestamptz` | |
| `vorlage_id` | `uuid references todo_vorlagen(id)` | `null` bei einmaligen Todos |
| `erstellt_am` | `timestamptz not null default now()` | |

## 4. Logik (reine Funktionen in `planung.js`)

- `naechsteFaelligkeit(vorlage, ausgehendVon)` → nächstes Datum **nach**
  `ausgehendVon`, das zu `plan_typ`/`plan_wochentage`/`plan_tag_im_monat` passt.
  - `taeglich` → `ausgehendVon + 1 Tag`.
  - `wochentage` → nächster Tag aus der Liste (kann in dieselbe oder die
    nächste Woche fallen).
  - `monatlich` → nächster `plan_tag_im_monat`, ggf. im Folgemonat; liegt der
    Tag nicht im Monat (z. B. 31. im Februar), wird der Monatsletzte genommen.
- `sortiereOffeneTodos(todos, heute)` → überfällige zuerst (älteste zuerst),
  dann nach `faellig` aufsteigend, Todos ohne `faellig` ans Ende (Anlagedatum
  als Zweitkriterium).
- `istUeberfaellig(todo, heute)` → `faellig !== null && faellig < heute &&
  !erledigt`.

## 5. Dateistruktur (Muster wie `js/module/ernaehrung/`)

`js/module/todos/`
| Datei | Aufgabe | Test |
|---|---|---|
| `index.js` | Registriert Modul (`id:'todos'`, `titel:'To-dos'`), Tabs „Offen"/„Erledigt", `renderKachel` („3 offen, 1 überfällig"), `init`. | – |
| `daten.js` | Supabase-Wrapper: `ladeAlles`, `legeEinmaligesTodoAn`, `legeVorlageAn`, `hakeAb(todo)` (erledigt + legt nächste Instanz an, wenn `vorlage_id` gesetzt), `entferneTodo(todo)` (löscht bzw. beendet Vorlage). | – |
| `planung.js` | `naechsteFaelligkeit`, `sortiereOffeneTodos`, `istUeberfaellig`. | ✅ |
| `offen.js` | Offen-Ansicht: Liste + „+ Neues Todo" (Dialog: Text, optional Fälligkeitsdatum, optional Wiederkehr-Rhythmus). | manuell |
| `erledigt.js` | Erledigt-Ansicht: letzte 60 Tage, neueste zuerst. | manuell |

### Datenfluss
`init()` lädt einmal: offene Todos + erledigte der letzten 60 Tage + aktive
Vorlagen (für die Bearbeiten-Ansicht). Abhaken ruft `hakeAb` (schreibt sofort,
erzeugt bei Bedarf die nächste Instanz) und aktualisiert lokal. „Aktualisieren"
lädt neu.

## 6. Definition of Done

- [ ] Tabellen `todo_vorlagen` + `todos` mit RLS angelegt.
- [ ] `node:test` grün: `planung.js`.
- [ ] Einmaliges Todo anlegen, abhaken, löschen funktioniert.
- [ ] Wiederkehrendes Todo (z. B. wöchentlich) anlegen, abhaken → neue offene
      Instanz mit korrektem nächsten Datum erscheint, alte Zeile bleibt in
      „Erledigt".
- [ ] Kachel zeigt offene/überfällige Anzahl korrekt.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, nach `main` gemergt
      und gepusht.

## 7. Bewusst NICHT in Etappe 2

- Priorität/Kategorien/Tags.
- Erinnerungen/Push (gehört zur separaten Etappe-5-Idee „Kalender + Push").
- Unterteilung in Projekte/Listen – eine flache Liste reicht laut Konzept.
