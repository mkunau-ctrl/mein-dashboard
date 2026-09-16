# Etappe 3 – Modul Finanzen: Design

**Datum:** 2026-09-16
**Status:** bereit zum Bauen (kurzes Design, Muster aus Etappe 1/2 übernommen)
**Vorgänger:** `docs/specs/2026-09-08-dashboard-konzept.md` (Abschnitt 4.3/6).

## 1. Ziel

Ausgaben erfassen ("20 € Tanken"), aktuellen Kontostand sehen, Monatsübersicht
nach Kategorie.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Kategorie | freies Textfeld, kein festes Enum | Konzept nennt keine feste Liste; Mark/Claude tippen die Kategorie beim Eintragen frei ein (z. B. "Tanken", "Lebensmittel"). YAGNI – Liste kann später aus den tatsächlich genutzten Werten entstehen. |
| Kontostand-Berechnung | `kontostand_start − Summe(Ausgaben seit stand_datum)`, wie im Konzept festgelegt | Kein Abgleich mit echter Bank-API (bewusst nicht im Projekt). Mark aktualisiert `kontostand_start`/`stand_datum` von Hand, wenn er seinen echten Kontostand abgleichen will. |
| Löschen von Ausgaben | harte Löschung | Keine Statistik-Historie nötig, die durchs Löschen verfälscht würde (anders als Ernährungs-Streak). |
| Zeitraum Monatsübersicht | pro Kalendermonat, Summe gesamt + pro Kategorie | Reicht laut Konzept ("Monatsübersicht"). |
| Währung | nur Euro, kein Mehrwährungs-Feld | Einziger genutzter Kontext. |

## 3. Datenmodell (Supabase, Schema `public`)

RLS wie bei den anderen Modulen: `user_id = auth.uid()`, `for all to
authenticated`.

### `expenses`
| Spalte | Typ | Hinweis |
|---|---|---|
| `betrag` | `numeric not null` | in Euro, positiv = Ausgabe |
| `kategorie` | `text not null default 'sonstiges'` | freier Text |
| `notiz` | `text` | optional |
| `datum` | `date not null default current_date` | |
| `erstellt_am` | `timestamptz not null default now()` | |

### `finance_settings`
`primary key (user_id, key)`, `value jsonb not null`. Keys:
- `kontostand_start` → Zahl
- `stand_datum` → `'YYYY-MM-DD'`-String

## 4. Logik (reine Funktionen in `berechnung.js`)

- `kontostand(settings, expenses, heute)` → `kontostand_start − Summe(betrag)`
  aller `expenses` mit `datum >= stand_datum` und `<= heute`.
- `summeProMonat(expenses, jahr, monat)` → Gesamtsumme des Monats.
- `summenProKategorie(expenses, jahr, monat)` → `[{ kategorie, summe }]`,
  absteigend sortiert.

## 5. Dateistruktur (Muster wie `js/module/todos/`)

`js/module/finanzen/`
| Datei | Aufgabe | Test |
|---|---|---|
| `index.js` | Registriert Modul (`id:'finanzen'`, `titel:'Finanzen'`), Tabs „Ausgaben"/„Kontostand"/„Monat", Kachel „Ausgaben heute: X €". | – |
| `daten.js` | Supabase-Wrapper: `ladeAlles`, `legeAusgabeAn`, `entferneAusgabe`, `setzeKontostandStart`. | – |
| `berechnung.js` | `kontostand`, `summeProMonat`, `summenProKategorie`. | ✅ |
| `ausgaben.js` | Liste der letzten Ausgaben (neueste zuerst) + „+ Neue Ausgabe". | manuell |
| `kontostand.js` | Aktueller Stand, Formular zum Neusetzen von Start/Datum. | manuell |
| `monat.js` | Monats-Navigation, Summe gesamt + Balken pro Kategorie. | manuell |

## 6. Definition of Done

- [ ] Tabellen `expenses` + `finance_settings` mit RLS angelegt.
- [ ] `node:test` grün: `berechnung.js`.
- [ ] Ausgabe anlegen/löschen funktioniert, Kachel zeigt heutige Summe.
- [ ] Kontostand korrekt aus Start − Summe berechnet, neu setzbar.
- [ ] Monatsübersicht zeigt Summe + Kategorien für den aktuellen und
      vorherige Monate.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, nach `main` gemergt,
      gepusht.

## 7. Bewusst NICHT in Etappe 3

- Bank-/Konto-API-Anbindung (Grundsatzentscheidung im Gesamtkonzept).
- Budgets/Limits pro Kategorie.
- Wiederkehrende Ausgaben (Abos) – eigene Idee fürs Log, falls gewünscht.
