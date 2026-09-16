# Etappe 5 – Modul Berichtsheft: Design

**Datum:** 2026-09-16
**Status:** bereit zum Bauen
**Vorgänger:** `docs/specs/2026-09-08-dashboard-konzept.md` (Etappe 5, ergänzt
2026-09-16), Muster aus Etappe 1–4.

## 1. Ziel

Mark führt seinen Ausbildungsnachweis (Berichtsheft) fürs erste per Diktat an
Claude oder per Formular in der App: ein Eintrag pro Tag (Betrieb oder
Berufsschule), am Ende druckfertig als PDF (über den Browser-Druckdialog,
gruppiert nach Woche wie das klassische Papier-Berichtsheft).

## 2. Recherche: übliches Format

Laut IHK/HWK-Vorlagen (siehe Quellen unten) ist der Ausbildungsnachweis
i. d. R. wochenweise aufgebaut: Kopf mit Name, Ausbildungsberuf,
Ausbildungsjahr, Zeitraum; pro Tag (Mo–Fr, ggf. Sa) betriebliche Tätigkeiten
mit ungefährer Stundenzahl bzw. Berufsschul-Themen; am Ende zwei
Unterschriftfelder (Azubi, Ausbilder) mit Datum. Genau daran orientiert sich
dieses Design, da Mark keine eigene Vorlage hat.

Quellen: [karrierebibel.de](https://karrierebibel.de/ausbildungsnachweis/),
[ausbildung.de](https://www.ausbildung.de/ratgeber/berichtsheft/),
[IHK München](https://www.ihk-muenchen.de/de/berufsbildung-berufszugang/ausbilden/ausbildungsverhaeltnis/berichtsheft/klassisches-berichtsheft/).

## 3. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Rhythmus | **ein Eintrag pro Tag**, unabhängig davon, wann Mark diktiert | Von Mark am 2026-09-16 so entschieden. Mark kann mehrere Tage auf einmal nachtragen. |
| Diktat | Mark erzählt frei im Chat, Claude fragt fehlende Pflichtfelder (Datum, Stunden, Tätigkeiten) aktiv nach, **bevor** gespeichert wird, dann schreibt Claude per Supabase-MCP direkt (wie im Gesamtkonzept vorgesehen) | Von Mark bestätigt. |
| Manuelle Eingabe | zusätzlich normales Formular in der App (wie bei den anderen Modulen) | Konzept: „Mark trägt selbst ein **oder** bittet Claude". |
| Vorlage | kein eigenes Dokument von Mark – Struktur aus der Recherche (Abschnitt 2) übernommen | Marks Wunsch. |
| PDF-Export | **kein neues JS-Paket** – eine Druckansicht (`@media print`-CSS) pro Woche, Mark nutzt den Browser-Druckdialog ("Als PDF speichern") | Passt zum Projekt-Grundsatz "kein Framework, kein Build"; spart eine PDF-Bibliothek für ein Ergebnis, das der native Druckdialog genauso gut liefert. |
| Tagesart | `betrieb` \| `schule` \| `sonstiges` (Urlaub/Krankheit/Feiertag) | Deckt die im Berichtsheft üblichen Fälle ab; bei `schule` stehen in „Tätigkeiten" die Unterrichtsthemen statt Arbeitsaufgaben. |

## 4. Datenmodell (Supabase, Schema `public`)

RLS wie bei den anderen Modulen.

### `berichtsheft_eintraege`
| Spalte | Typ | Hinweis |
|---|---|---|
| `datum` | `date not null` | `unique (user_id, datum)` – ein Eintrag pro Tag |
| `art` | `text not null default 'betrieb'` | `betrieb` \| `schule` \| `sonstiges` |
| `taetigkeiten` | `text not null` | Stichpunkte/Text |
| `stunden` | `numeric not null` | Pflichtfeld laut Diktat-Regel |
| `erstellt_am` | `timestamptz not null default now()` | |

### `berichtsheft_settings`
`primary key (user_id, key)`, `value jsonb not null`. Keys: `name`,
`ausbildungsberuf`, `ausbildungsbeginn` (Datum, für die Lehrjahr-Anzeige auf
dem Ausdruck).

## 5. Logik (reine Funktionen in `berechnung.js`)

- `wochenStart(datumStr)` → Montag der Woche als `'YYYY-MM-DD'`.
- `gruppiereNachWoche(eintraege)` → `[{ start, eintraege: [...] }]`,
  neueste Woche zuerst, Einträge je Woche nach Datum sortiert.
- `ausbildungsjahr(ausbildungsbeginn, datumStr)` → ganzzahliges Lehrjahr
  (1, 2, 3 …) ab `ausbildungsbeginn`.

## 6. Dateistruktur

`js/module/berichtsheft/`
| Datei | Aufgabe | Test |
|---|---|---|
| `index.js` | Registriert Modul (`id:'berichtsheft'`, `titel:'Berichtsheft'`), Tabs „Einträge"/„Drucken", Kachel „Diese Woche: N Einträge". | – |
| `daten.js` | Supabase-Wrapper: `ladeAlles`, `speichereEintrag`, `entferneEintrag`, `speichereSettings`. | – |
| `berechnung.js` | `wochenStart`, `gruppiereNachWoche`, `ausbildungsjahr`. | ✅ |
| `eintraege.js` | Liste (neueste zuerst) + Formular anlegen/bearbeiten/löschen. | manuell |
| `drucken.js` | Wochenweise Druckansicht (Kopfdaten-Formular + `@media print`-Layout + Druck-Knopf `window.print()`). | manuell |

## 7. Claude ↔ Supabase (Diktat-Weg)

Wenn Mark im Chat einen oder mehrere Tage erzählt: Claude sammelt pro Tag
`datum`, `art`, `taetigkeiten`, `stunden`; fehlt eines dieser drei, fragt
Claude gezielt nach, bevor per Supabase-MCP in `berichtsheft_eintraege`
geschrieben wird (`user_id` explizit auf Marks Auth-ID, wie in `CLAUDE.md`
hinterlegt). Danach kurz bestätigen, was eingetragen wurde.

## 8. Definition of Done

- [ ] Tabellen `berichtsheft_eintraege` + `berichtsheft_settings` mit RLS.
- [ ] `node:test` grün: `berechnung.js`.
- [ ] Eintrag anlegen/bearbeiten/löschen über die App funktioniert.
- [ ] Druckansicht zeigt Wochen korrekt gruppiert mit Kopfdaten und
      Unterschriftfeldern, `window.print()` liefert ein sauberes Layout.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, nach `main` gemergt,
      gepusht.

## 9. Bewusst NICHT in Etappe 5

- Kein Abgleich/Export in ein offizielles IHK-Onlineportal.
- Keine automatische Erkennung von Feiertagen/Ferien.
- Kein PDF-Paket (siehe Entscheidung oben) – nur Browser-Druck.
