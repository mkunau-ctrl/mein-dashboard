# Etappe 4, Sub-Etappe B – Finanzen-Redesign: Design

**Datum:** 2026-09-21
**Status:** bereit zum Bauen
**Vorgänger:** Sub-Etappe A (`docs/superpowers/specs/2026-09-19-etappe-4-sub-a-konten-einnahmen-schulden-design.md`,
fertig, siehe `docs/PROJEKT-LOG.md`), Prototyp
`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`.

## 0. Einordnung

Sub-Etappe A hat das Datenmodell gelegt (Konten, Einnahmen,
Einnahmen-Vorlagen, Schulden). Diese Sub-Etappe baut darauf das
prototyp-genaue Finanzen-UI: drei neue Tabs (Übersicht/Transaktionen/
Analyse) ganz vorne in der Finanzen-Tab-Leiste, einen "Regelmäßige
Ausgaben"-Tab anstelle von "Abos", einen neuen Kontostand-Detail-Screen
von Home aus, und CSV-Export. Weiterhin Prototyp-Phase (siehe
Doku-Rigor-Regel in `CLAUDE.md`) — Fehler/Abweichungen während der
Umsetzung werden dokumentiert, nicht nur das Endergebnis.

## 1. Ziel

Finanzen-Modul zeigt jetzt echte Einnahmen UND Ausgaben (bisher nur
Ausgaben-fokussiert dargestellt, obwohl Einnahmen seit Sub-Etappe A
existieren), im Design des von Mark vorgegebenen Prototyps, mit echt
funktionierendem Zeitraum-Filter, Analyse-Diagrammen, einem
Kontostand-Detail-Screen mit echtem Verlauf, echten Vorlagen für
wiederkehrende Ausgaben (bisher nur Muster-Erkennung), und CSV-Export.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Reihenfolge der Tabs | Übersicht, Transaktionen, Analyse, Ausgaben, Einnahmen, Kontostand, Konten, Schulden, Regelmäßige Ausgaben, Teile, Bestellen (Monat entfällt, siehe unten) | Neue Tabs vorne (Prototyp-Reihenfolge), bestehende dahinter, Nutzer-Entscheidung "Kontostand bleibt zusätzlich" |
| Default-Tab | wechselt von `ausgaben` zu `uebersicht` | Übersicht ist im Prototyp der Landing-Tab von Finanzen |
| Geteilter Zeitraum-Zustand | eine Modul-Variable `zeitraum` in `finanzen/index.js` (Default `'30T'`), an Übersicht **und** Transaktionen weitergereicht | Nutzer-Entscheidung: Filter wirkt auf beide gemeinsam |
| Zeitraum-Berechnung | `zeitraumVon(bereich, heute)`: 7T/30T als Tage-Subtraktion, 3M/6M/1J als echte Monats-Subtraktion (`setUTCMonth`) | Monate haben unterschiedliche Länge — Tage-Näherung würde bei 3M/6M/1J leicht danebenliegen |
| Analyse-Kategorien-Zeitraum | **aktueller Kalendermonat** (wiederverwendet `summeProMonat`/`summenProKategorie` unverändert), **nicht** der Übersicht/Transaktionen-Zeitraum | Analyse ist ein eigener, von Übersicht/Transaktionen entkoppelter Tab (wie im Prototyp, ohne eigene Range-Buttons); vermeidet einen dritten Ort, der denselben Zeitraum-Zustand kennen müsste |
| "Monat"-Tab | **entfällt**, Inhalt geht in Analyse auf (aktueller Monat + Kategorien sind jetzt dort) | Redundant zu Analyse, Monats-Vor/Zurück-Navigation war laut Nutzer ohnehin verzichtbar (aus Sub-Etappe-4-Diskussion) |
| "Abos" → "Regelmäßige Ausgaben" | neue Tabelle `ausgaben_vorlagen` (1:1 wie `einnahmen_vorlagen`) mit Bestätigen-Mechanik; bestehende `erkenneAbos`-Erkennung bleibt als separate Liste mit "Als Vorlage übernehmen"-Knopf | Nutzer-Entscheidung 2026-09-21 |
| CSV-Format | Komma-getrennt, Dezimalpunkt, ISO-Datum, UTF-8 — **kein** deutsches Excel-Semikolon-Format | Einfachste, robusteste Variante; bewusst kein Anspruch auf perfekten Excel-Import, reicht fürs Archivieren/Finanzamt |
| CSV-Umfang | exportiert exakt das, was der Zeitraum-Filter im Transaktionen-Tab zeigt; Suche/Kategorie-Chip wirken nicht auf den Export | Nutzer-Entscheidung 2026-09-21 |
| Kontostand-Detail-Screen-Routing | Unterseite von Home: `#/home/kontostand`, `home/index.js` bekommt einen eigenen `hashchange`-Listener (Muster wie Finanzen/Todos/Berichtsheft) | Kein neuer Mechanismus — `parseHash` unterstützt Modul+Unterseite bereits, Home hatte bisher nur keine eigene Unterseite |
| Kontostand-Verlauf (Sparkline) | echte Tages-Werte der letzten 30 Tage, fix, kein eigener Zeitraum-Filter auf diesem Screen | Nutzer-Entscheidung aus der Ursprungsplanung: Detail-Screen zeigt Prototyp-Optik, keine Range-Buttons dort |
| "Neu setzen" bei Konten | unverändert aus Sub-Etappe A | nicht Teil dieser Sub-Etappe |

## 3. Datenmodell (Supabase, Schema `public`, Ergänzung zu Sub-Etappe A)

### `ausgaben_vorlagen` (neu, 1:1 wie `einnahmen_vorlagen`)
| Spalte | Typ | Hinweis |
|---|---|---|
| `bezeichnung` | `text not null` | |
| `betrag` | `numeric not null` | |
| `plan_tag_im_monat` | `int not null` | |
| `naechste_faelligkeit` | `date not null` | |
| `konto_id` | `uuid not null references konten` | |
| `aktiv` | `boolean not null default true` | |

RLS wie überall: `user_id = auth.uid()`, `for all to authenticated`.

### `expenses` (Erweiterung)
| Spalte | Typ | Hinweis |
|---|---|---|
| `vorlage_id` | `uuid references ausgaben_vorlagen` | mirrors `einnahmen.vorlage_id`, nullable, per Migration ergänzt |

## 4. Logik (reine Funktionen, `js/module/finanzen/berechnung.js`, ergänzt)

- `zeitraumVon(bereich, heute)` → `string` ('YYYY-MM-DD'), Startdatum für
  `'7T'|'30T'|'3M'|'6M'|'1J'`. Tage-Bereiche per Tage-Subtraktion,
  Monats-Bereiche per `setUTCMonth`.
- `summenProKategorieZeitraum(expenses, von, bis)` → wie
  `summenProKategorie`, aber Datumsfenster statt Kalendermonat (für
  Übersicht/Transaktionen-Zeitraum).
- `summenProBezeichnungZeitraum(einnahmen, von, bis)` → analoge Funktion
  für Einnahmen, gruppiert nach `bezeichnung` (Einnahmen haben kein
  `kategorie`-Feld).
- `letzteMonate(anzahl, heute)` → `[{jahr, monat}]`, die letzten `anzahl`
  Kalendermonate inkl. dem aktuellen, älteste zuerst (für das
  6-Monats-Balkendiagramm in Analyse; nutzt die bestehende
  `summeProMonat` pro Eintrag, **funktioniert unverändert auch für
  `einnahmen`**, da beide nur `{datum, betrag}` brauchen).
- `jahresUebersicht(expenses, einnahmen, jahr)` → `{ einnahmenSumme,
  ausgabenSumme, sparquote }`. `sparquote` = `(einnahmenSumme −
  ausgabenSumme) / einnahmenSumme * 100`, gerundet auf eine Nachkomma-
  stelle, `null` wenn `einnahmenSumme` 0 ist (Division durch 0
  vermeiden).
- `kontostandVerlauf(konten, expenses, einnahmen, tage, heute)` →
  `[{ datum, stand }]`, ein Eintrag pro Tag der letzten `tage` Tage
  (inkl. `heute`), `stand` = `gesamtKontostand(...)` an diesem Tag
  (Wiederverwendung, keine neue Kontostand-Logik).
- `zuCsvZeilen(transaktionen)` → `string[]` (eine Zeile pro Eintrag,
  Header-Zeile inklusive), reine String-Erzeugung ohne DOM/Download —
  das Auslösen des Downloads (Blob + Klick) ist UI-Code in
  `transaktionen.js`, nicht Teil dieser Funktion (Trennung reine
  Logik/DOM wie im Rest des Projekts).

## 5. Regelmäßige-Ausgaben-Vorlagen-Mechanik

1:1 das Muster aus Sub-Etappe A für Einnahmen-Vorlagen übertragen
(inkl. der dort gefundenen Lehre: `naechsteFaelligkeit` **immer** mit
`{ plan_typ: 'monatlich', plan_tag_im_monat }` aufrufen, nie mit der
rohen Vorlagen-Zeile):
- `legeAusgabenVorlageAn({ bezeichnung, betrag, plan_tag_im_monat,
  konto_id })` — legt Vorlage + erste `expenses`-Zeile mit `vorlage_id`
  an.
- `bestaetigeAusgabenVorlage(vorlage)` — rückt Vorlage vor, legt neue
  `expenses`-Zeile mit `vorlage_id` an.
- `entferneAusgabe` wird erweitert: wenn die Ausgabe eine `vorlage_id`
  hat, wird die zugehörige Vorlage `aktiv:false` gesetzt (wie bei
  `entferneEinnahme`).
- **"Als Vorlage übernehmen"** (aus einem erkannten Abo-Muster,
  `erkenneAbos`-Ergebnis `{ haendler, betrag, naechsteFaelligkeit }`):
  ruft `legeAusgabenVorlageAn` mit `bezeichnung: haendler`, `betrag`,
  `plan_tag_im_monat` = Tag-Anteil von `naechsteFaelligkeit`, `konto_id`
  = Hauptkonto (erstes Konto in `zustand.konten`).

## 6. Dateistruktur

`js/module/finanzen/` (ergänzt):
| Datei | Aufgabe | Test |
|---|---|---|
| `berechnung.js` | siehe Abschnitt 4 | ✅ |
| `daten.js` | `ladeAlles` lädt zusätzlich `ausgaben_vorlagen` (aktiv) als `zustand.ausgabenVorlagen`. Neue Funktionen siehe Abschnitt 5. | – |
| `uebersicht.js` (neu) | Balance-Karte (Gesamt-Kontostand, klickbar → `#/home/kontostand`) + Zeitraum-Range-Buttons + Einnahmen/Ausgaben/Differenz-Zeile + Kategorien-Vorschau (Top-Ausgaben-Kategorien, Link zu Analyse). | manuell |
| `transaktionen.js` (neu) | Suchfeld + Kategorie-Chips + kombinierte Einnahmen+Ausgaben-Liste (Zeitraum-gefiltert) + CSV-Export-Button. | manuell |
| `analyse.js` (neu) | Ausgaben-nach-Kategorie + Einnahmen-nach-Bezeichnung (beide aktueller Monat) + 6-Monats-Balkendiagramm + Jahresübersicht/Sparquote. | manuell |
| `regelmaessige-ausgaben.js` (neu, ersetzt `abos.js`) | Fällige Vorlagen mit "Bezahlt"-Knopf + Liste bestehender Vorlagen + erkannte Abo-Muster mit "Als Vorlage übernehmen"-Knopf. | manuell |
| `index.js` | `TABS` neu sortiert (siehe Abschnitt 2), Default-Tab `uebersicht`, `monat`/`abos` aus `TABS`/`LADER` entfernt, drei neue Tabs + `regelmaessige-ausgaben` ergänzt. | – |
| `monat.js`, `abos.js` | **gelöscht** (Inhalt geht in `analyse.js` bzw. `regelmaessige-ausgaben.js` auf) | – |

`js/module/home/`:
| Datei | Änderung |
|---|---|
| `index.js` | Kontostand-Karte wird klickbar (`location.hash = '#/home/kontostand'`). Eigener `hashchange`-Listener ergänzt: bei `unterseite === 'kontostand'` wird `kontostand.js` (dynamisch importiert) gerendert statt der normalen Home-Ansicht. |
| `kontostand.js` (neu) | Der Detail-Screen: Balance-Karte mit Augen-Icon (Kontostand ausblenden, reiner UI-Zustand, keine Persistenz), echte Sparkline aus `kontostandVerlauf` (SVG-Polyline, Muster wie im Prototyp), zusätzliche Warenwert-Zeile. Zurück-Button setzt `location.hash = '#/home'`. |

`app.css`: neue Klassen `.range-row`/`.range`/`.range.aktiv` (Zeitraum-
Buttons) und `.chips`/`.chip`/`.chip.aktiv` (Kategorie-Chips), auf die
bestehenden Projekt-Variablen abgebildet (`--icon-bg`/`--gedaempft` statt
Prototyp-`--muted`, `--text`/`--bg` fürs aktive Chip/Range wie im
Prototyp).

## 7. Definition of Done

- [ ] Migration: `ausgaben_vorlagen` angelegt (RLS), `expenses.vorlage_id`
      ergänzt.
- [ ] `node --test` grün: alle neuen `berechnung.js`-Funktionen.
- [ ] Übersicht zeigt echten Zeitraum-gefilterten Kontostand +
      Einnahmen/Ausgaben/Differenz, Zeitraum-Wechsel wirkt auch auf
      Transaktionen.
- [ ] Transaktionen: Suche + Kategorie-Chips funktionieren, CSV-Export
      lädt eine Datei mit den sichtbaren (Zeitraum-gefilterten)
      Einträgen herunter.
- [ ] Analyse zeigt beide Kategorien-Aufschlüsselungen, 6-Monats-Chart,
      Jahresübersicht mit Sparquote.
- [ ] Regelmäßige Ausgaben: Vorlage anlegen (über "Übernehmen" aus
      erkanntem Muster) + bestätigen funktioniert und rückt korrekt vor.
- [ ] Kontostand-Detail-Screen von Home aus erreichbar, zeigt echte
      Sparkline + Warenwert-Zeile, Augen-Icon blendet aus.
- [ ] Keine Regression: Ausgaben/Einnahmen/Kontostand/Konten/Schulden/
      Teile/Bestellen-Tabs funktionieren unverändert; `home/index.js`
      normale Ansicht (ohne `#/home/kontostand`) unverändert.
- [ ] `docs/PROJEKT-LOG.md` (inkl. Fehlern/verworfener Ansätze) +
      `CLAUDE.md` aktualisiert, gepusht.

## 8. Bewusst NICHT in dieser Sub-Etappe

- Detail-Klick-Ansichten für einzelne Transaktionen (Sub-Etappe C).
- Neues Rechnungen-Modul (Sub-Etappe D).
- Design-Angleichung von Profil/Suche/Ausbildung (Sub-Etappe E).
- Mehr Einstellungen, Google Drive (Sub-Etappen F/G).
