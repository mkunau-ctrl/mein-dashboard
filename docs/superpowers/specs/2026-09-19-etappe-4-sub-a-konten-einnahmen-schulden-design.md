# Etappe 4, Sub-Etappe A – Konten, Einnahmen & Schulden: Design

**Datum:** 2026-09-19
**Status:** bereit zum Bauen
**Vorgänger:** `CLAUDE.md` Abschnitt "Aktueller Stand" (Backlog A–Q),
Konzept-Muster aus `2026-09-16-etappe-3-finanzen-design.md` und
`2026-09-16-etappe-2-todos-design.md` (Vorlagen-Mechanik).

## 0. Einordnung

Diese Sub-Etappe ist bewusst nur das **Fundament**: Datenmodell +
einfache, funktionale Erfassung. Das hübsche, prototyp-genaue UI
(Übersicht/Transaktionen/Analyse-Tabs, Kontostand-Detail-Screen) kommt
erst in Sub-Etappe B, die auf diesem Datenmodell aufbaut. Diese und alle
folgenden Sub-Etappen (A–Q, siehe `CLAUDE.md`) werden bewusst als
**Prototyp** behandelt – jeder Schritt inkl. Fehlern/verworfenen
Ansätzen wird in `docs/PROJEKT-LOG.md` dokumentiert, nicht nur das
Endergebnis.

## 1. Ziel

Drei bisher fehlende Finanz-Konzepte einführen, auf denen die späteren
Sub-Etappen aufbauen:
1. **Mehrere Konten** statt einem einzelnen Kontostand.
2. **Echte Einnahmen-Erfassung** (bisher gab es nur Ausgaben).
3. **Schulden-Tracking** (wem ich was schulde / wer mir was schuldet),
   mit Teilzahlungen.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Datenmodell Einnahmen | eigene Tabelle `einnahmen`, nicht `expenses` um ein `art`-Feld erweitert | Geringeres Risiko für bestehenden, funktionierenden Ausgaben-Code (Nutzer-Entscheidung 2026-09-19). |
| Konto-Zuordnung | `expenses`/`einnahmen` bekommen ein Pflichtfeld `konto_id` | Nutzer will beides: meistens nur ein Hauptkonto, aber Buchungen sollen einem Konto zuordenbar sein. Pflichtfeld statt nullable + Fallback-Logik hält die Berechnungen einfach. |
| Wiederkehrende Einnahmen | Vorlage wird **bestätigt** (wie To-dos abhaken), erzeugt dann die echte Zeile | Kontostand soll nur eingetroffenes Geld zeigen, nichts, das nur theoretisch fällig wäre. |
| Schulden-Status | kein eigenes Status-Feld, Restbetrag wird berechnet (`gesamtbetrag − Summe(Zahlungen)`) | Passt zum bestehenden Stil (reine Berechnungsfunktionen statt denormalisierter Felder), Nutzer wollte explizit Teilzahlungen/Verlauf. |
| Schulden vs. Kontostand | eigene 4. Kennzahl "Netto-Vermögen", beeinflusst die anderen 3 Kontostand-Sichten nicht | Nutzer-Entscheidung 2026-09-19: Schulden sollen einfließen, aber nicht die "echten" Kontostand-Zahlen verfälschen. |
| UI in dieser Sub-Etappe | einfach/funktional (Liste + Formular, wie bisherige Tabs), noch nicht Prototyp-Design | Prototyp-genaues Redesign ist Sub-Etappe B/E; hier zählt nur, dass die Daten korrekt erfasst/berechnet werden. |

## 3. Datenmodell (Supabase, Schema `public`)

RLS wie bei den anderen Tabellen: `user_id = auth.uid()`, `for all to
authenticated`. Migration wird vom Koordinator per Supabase-Migration
angelegt (bestehendes Projekt-Muster, keine Migrationsdateien im Repo).

### `konten` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `name` | `text not null` | z. B. "Hauptkonto", "Trade Republic", "Volksbank" |
| `kontostand_start` | `numeric not null` | |
| `stand_datum` | `date not null` | |
| `erstellt_am` | `timestamptz not null default now()` | |

Migration legt einmalig eine Zeile `name:'Hauptkonto'` an und übernimmt
die bisherigen Werte aus `finance_settings.kontostand_start`/
`stand_datum`. `finance_settings` bleibt bestehen (wird evtl. später für
andere Einstellungen weiterverwendet), die beiden Kontostand-Keys werden
danach nicht mehr gelesen/geschrieben.

### `expenses` (Erweiterung)
| Spalte | Typ | Hinweis |
|---|---|---|
| `konto_id` | `uuid not null references konten` | Migration befüllt alle bestehenden Zeilen mit der ID von "Hauptkonto". |

### `einnahmen` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `betrag` | `numeric not null` | |
| `bezeichnung` | `text not null default 'sonstiges'` | freier Text, z. B. "Handyreparaturen", "Ausbildungsvergütung" |
| `notiz` | `text` | optional |
| `datum` | `date not null default current_date` | |
| `quelle` | `text not null default 'manuell'` | `manuell` / `email` / `foto`, gleiches Muster wie `expenses.quelle` |
| `konto_id` | `uuid not null references konten` | |
| `vorlage_id` | `uuid references einnahmen_vorlagen` | gesetzt, wenn aus einer Vorlage bestätigt |
| `erstellt_am` | `timestamptz not null default now()` | |

### `einnahmen_vorlagen` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `bezeichnung` | `text not null` | |
| `betrag` | `numeric not null` | |
| `plan_tag_im_monat` | `int not null` | 1–31, wie `todo_vorlagen.plan_tag_im_monat` |
| `naechste_faelligkeit` | `date not null` | |
| `konto_id` | `uuid not null references konten` | |
| `aktiv` | `boolean not null default true` | |

Immer monatlich (`plan_typ` fest `'monatlich'`, kein eigenes Feld nötig
– anders als bei To-dos gibt es hier keinen täglich/wochentags-Fall).

### `schulden` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `person` | `text not null` | |
| `gesamtbetrag` | `numeric not null` | |
| `richtung` | `text not null` | `ich_schulde` \| `mir_wird_geschuldet` |
| `notiz` | `text` | optional |
| `erstellt_am` | `date not null default current_date` | |

### `schulden_zahlungen` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `schuld_id` | `uuid not null references schulden` | |
| `betrag` | `numeric not null` | |
| `datum` | `date not null default current_date` | |
| `notiz` | `text` | optional |

## 4. Logik (reine Funktionen, `js/module/finanzen/berechnung.js`, ergänzt)

- `kontostandProKonto(konto, expenses, einnahmen, heute)` →
  `konto.kontostand_start + Summe(einnahmen für konto, datum im Fenster)
  − Summe(expenses für konto, datum im Fenster)`. Fenster wie bisher:
  `>= konto.stand_datum && <= heute`.
- `gesamtKontostand(konten, expenses, einnahmen, heute)` → Summe von
  `kontostandProKonto` über alle Konten.
- `unechterGesamtKontostand(konten, expenses, einnahmen, teile, heute)`
  → `gesamtKontostand(...) + warenwert(teile)` (ersetzt die bisherige
  `unechterKontostand`, die von einem einzelnen Konto ausging – bisherige
  Aufrufer, z. B. `home/index.js`, werden mit angepasst).
- `schuldenRestbetrag(schuld, zahlungen)` → `gesamtbetrag − Summe(betrag
  der Zahlungen dieser Schuld)`.
- `offeneSchulden(schulden, alleZahlungen)` → nur Schulden mit
  Restbetrag `> 0` (Rundung auf Cent beachten).
- `sortiereSchulden(schulden, alleZahlungen)` → offene zuerst (nach
  Restbetrag absteigend), dann beglichene.
- `nettoVermoegen(konten, expenses, einnahmen, teile, schulden,
  alleZahlungen, heute)` → `unechterGesamtKontostand(...) +
  Summe(Restbeträge, richtung:'mir_wird_geschuldet') −
  Summe(Restbeträge, richtung:'ich_schulde')`.
- Einnahmen-Vorlagen-Fälligkeit: **Wiederverwendung** von
  `naechsteFaelligkeit` aus `js/module/todos/planung.js` (importiert,
  aufgerufen mit `{ plan_typ:'monatlich', plan_tag_im_monat }` – die
  Funktion ist bereits generisch genug, keine Kopie nötig).

## 5. Vorlagen-Mechanik (Einnahmen)

1:1 das Muster aus `todos/daten.js` (`legeTodoAn`/`hakeAb`) auf
Einnahmen übertragen:
- Neue wiederkehrende Einnahme anlegen → Zeile in `einnahmen_vorlagen`
  + erste `einnahmen`-Zeile mit `vorlage_id` gesetzt.
- **Bestätigen** ("Eingegangen"-Knopf) einer fälligen Vorlagen-Einnahme
  → Vorlage wird per `naechsteFaelligkeit` auf den nächsten Monat
  vorgerückt, neue `einnahmen`-Zeile mit `vorlage_id` angelegt.
- Löschen einer Vorlagen-Einnahme-Instanz → zugehörige Vorlage wird
  `aktiv:false` gesetzt (keine weiteren Instanzen mehr), wie bei
  `entferneTodo`.

## 6. Dateistruktur

`js/module/finanzen/` (bestehendes Modul, ergänzt):
| Datei | Ergänzung | Test |
|---|---|---|
| `daten.js` | `ladeAlles` lädt zusätzlich `konten`, `einnahmen`, `einnahmen_vorlagen` (aktiv), `schulden`, `schulden_zahlungen`. Neue Funktionen: `legeEinnahmeAn`, `bestaetigeEinnahmenVorlage`, `entferneEinnahme`, `legeKontoAn`, `legeSchuldAn`, `verbucheZahlung`. | – |
| `berechnung.js` | siehe Abschnitt 4. | ✅ |
| `einnahmen.js` (neu) | Liste + "+ Neue Einnahme"-Formular, analog `ausgaben.js`. Zeigt fällige Vorlagen oben mit "Eingegangen"-Knopf. | manuell |
| `konten.js` (neu) | Liste der Konten mit jeweiligem Kontostand, Formular zum Anlegen/Neusetzen, **je Konto darunter dessen einzelne Transaktionen** (Ausgaben + Einnahmen dieses Kontos, chronologisch). | manuell |
| `schulden.js` (neu) | Liste offener/beglichener Schulden, Formular zum Anlegen + Zahlung verbuchen, **je Schuld darunter der Zahlungs-Verlauf** (einzelne Teilzahlungen). | manuell |
| `index.js` | `TABS` erweitert um `einnahmen`, `konten`, `schulden` (einfache Reihenfolge hinten anhängen, Sub-Etappe B sortiert die Tab-Leiste dann komplett neu nach Prototyp). | – |

`js/module/home/index.js`: Aufruf von `unechterKontostand` →
`unechterGesamtKontostand` mit den neuen Parametern angepasst (Konten
statt Settings).

## 7. Chat-Diktat

Wie bei Ausgaben/Berichtsheft: Mark kann im Chat eine Einnahme, ein
neues Konto oder eine Schuld/Zahlung erzählen, Claude fragt fehlende
Pflichtfelder aktiv nach und trägt direkt per Supabase-MCP ein.

## 8. Definition of Done

- [ ] Migration: `konten` (+ Hauptkonto-Zeile aus bisherigen Werten),
      `expenses.konto_id` (befüllt), `einnahmen`, `einnahmen_vorlagen`,
      `schulden`, `schulden_zahlungen` angelegt, RLS gesetzt.
- [ ] `node --test` grün: alle neuen `berechnung.js`-Funktionen.
- [ ] Einnahme anlegen/löschen funktioniert, wiederkehrende Einnahme
      per Vorlage bestätigen funktioniert und rückt korrekt vor.
- [ ] Konto anlegen, Kontostand pro Konto und gesamt korrekt.
- [ ] Schuld anlegen, Teilzahlung verbuchen, Restbetrag korrekt.
- [ ] `home/index.js` zeigt weiterhin einen sinnvollen Kontostand (an
      neue Funktion angepasst), keine Regression.
- [ ] `docs/PROJEKT-LOG.md` (inkl. aufgetretener Fehler/verworfener
      Ansätze) + `CLAUDE.md` aktualisiert, nach `main` gemergt, gepusht.

## 9. Bewusst NICHT in dieser Sub-Etappe

- Prototyp-genaues UI (Übersicht/Transaktionen/Analyse-Tabs,
  Kontostand-Detail-Screen) – Sub-Etappe B.
- `ausgaben_vorlagen` ("Regelmäßige Ausgaben") – Sub-Etappe B.
- Detail-Klick-Ansichten – Sub-Etappe C.
- Bank-/Konto-API-Anbindung – weiterhin bewusst nicht Teil des Projekts,
  Kontostände bleiben manuell gepflegt.
