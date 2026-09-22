# Etappe 4, Sub-Etappe N: Handyreparatur-Aufträge

## 0. Herkunft und Korrektur zum ursprünglichen Backlog-Eintrag

`CLAUDE.md`s ursprüngliche Beschreibung von Item N ging von einem
Kunden-Reparaturservice aus ("Kunde bringt Gerät, zahlt für Reparatur,
holt ab"). Im Brainstorming am 2026-09-22 hat sich anhand realer
Rohdaten (acht Reparatur-Positionen ohne jeden Kundennamen) und einer
gezielten Rückfrage herausgestellt: **das eigentliche Geschäftsmodell
ist Ankauf-Reparatur-Weiterverkauf** (Mark kauft defekte Handys,
repariert sie, verkauft sie weiter) — kein klassischer
Reparaturservice. Diese Spec beschreibt entsprechend das tatsächliche
Modell, nicht die ursprüngliche Backlog-Notiz.

## 1. Ziele

1. Reparatur-Vorhaben erfassen: Gerät, Warenwert (Einkaufs-/
   Reparaturkosten), voraussichtlicher Verkaufspreis, Status.
2. Der bereits bestehende Warenwert (Home-Kontostand-Karte,
   Finanzen-Übersicht) bezieht offene Reparatur-Aufträge automatisch
   mit ein — kein separater, unverbundener Wert.
3. Erwarteter Gewinn (über alle offenen Aufträge mit hinterlegtem
   Verkaufspreis) und tatsächlicher Gewinn im laufenden Monat (aus
   bereits verkauften Aufträgen) werden sichtbar.
4. Beim Verkauf eines Geräts (Status → "verkauft") entsteht automatisch
   ein Eintrag in der bestehenden `einnahmen`-Tabelle.
5. Die acht real vorliegenden Rohdaten (in `CLAUDE.md` gesichert)
   werden nach dem Bauen direkt eingetragen.

## 2. Datenmodell

Neue Tabelle `handyreparatur_auftraege` (RLS nach Projekt-Standard:
`user_id = auth.uid()`, `for all to authenticated`, `user_id default
auth.uid()`):

| Spalte | Typ | Pflicht | Bemerkung |
|---|---|---|---|
| `id` | uuid | ja | Primärschlüssel, Default `gen_random_uuid()` |
| `user_id` | uuid | ja | Default `auth.uid()` |
| `geraet` | text | ja | Freitext, z. B. "iPhone 14 Pro" |
| `notiz` | text | nein | z. B. "2 Rückseiten", "Kamera" |
| `status` | text | ja | `offen` \| `fertig` \| `verkauft`, Default `offen`, Check-Constraint |
| `warenwert` | numeric | ja | Einkaufs-/Reparaturkosten |
| `voraussichtlicher_verkaufspreis` | numeric | nein | optional, wie in den Rohdaten teils vorhanden |
| `tatsaechlicher_verkaufspreis` | numeric | nein | wird beim Setzen auf "verkauft" befüllt |
| `verkaeufer` | text | nein | von wem gekauft, optional |
| `kaeufer` | text | nein | an wen verkauft, optional |
| `verkauft_am` | date | nein | gesetzt beim Statuswechsel zu "verkauft" |
| `erstellt_am` | timestamptz | ja | Default `now()` |

## 3. Warenwert-Anbindung (bestätigt: gemeinsame Summe)

`js/module/finanzen/berechnung.js`s `warenwert(teile)` bekommt einen
zweiten, optionalen Parameter:

```js
export function warenwert(teile, reparaturAuftraege = []) {
  const lager = teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
  const reparaturen = reparaturAuftraege
    .filter((a) => a.status !== 'verkauft')
    .reduce((s, a) => s + a.warenwert, 0);
  return lager + reparaturen;
}
```

Rückwärtskompatibel (zweiter Parameter optional, Default leeres Array)
— alle bestehenden Aufrufer (`home/index.js`, `finanzen/uebersicht.js`
nach Sub-Etappe S, `finanzen/kontostand.js`) funktionieren unverändert
weiter, bis sie explizit erweitert werden, um auch die neuen
Reparatur-Aufträge zu übergeben (Teil des Implementierungsplans, nicht
dieser Spec).

## 4. Neue Kennzahlen (reine Funktionen in einem neuen
   `js/module/handyreparatur/berechnung.js`)

```js
export function erwarteterGewinn(auftraege) {
  return auftraege
    .filter((a) => a.status !== 'verkauft' && a.voraussichtlicher_verkaufspreis != null)
    .reduce((s, a) => s + (a.voraussichtlicher_verkaufspreis - a.warenwert), 0);
}

export function istGewinnImMonat(auftraege, jahr, monat) {
  return auftraege
    .filter((a) => a.status === 'verkauft' && a.verkauft_am
      && Number(a.verkauft_am.slice(0, 4)) === jahr && Number(a.verkauft_am.slice(5, 7)) === monat)
    .reduce((s, a) => s + (a.tatsaechlicher_verkaufspreis - a.warenwert), 0);
}
```

(Exakte Signaturen/Tests sind Sache des Implementierungsplans — hier
nur das Rechenprinzip festgehalten.)

## 5. Statuswechsel und Einnahme-Erzeugung

Drei Status: **offen → fertig → verkauft** (bestätigt). Übergänge per
Klick weiterschaltbar, analog zum bestehenden Sendungs-Status-Zyklus
(`STATUS_ZYKLUS`-Muster aus `js/module/sendungen/berechnung.js`).

Beim Wechsel zu **"verkauft"**:
1. `verkauft_am` wird auf das heutige Datum gesetzt.
2. `tatsaechlicher_verkaufspreis` muss angegeben werden (Prompt/Formularfeld
   beim Statuswechsel — vorbefüllt mit `voraussichtlicher_verkaufspreis`,
   falls vorhanden, aber änderbar, da der tatsächliche Preis abweichen kann).
3. Ein Eintrag in `einnahmen` wird angelegt (`legeEinnahmeAn`, bestehende
   Funktion aus `finanzen/daten.js`): `betrag` = tatsächlicher
   Verkaufspreis, `bezeichnung` = Gerätename, `quelle: 'manuell'`,
   `konto_id` = Hauptkonto (erstes Konto aus `zustand.konten`, gleiche
   Konvention wie in Sub-Etappe D für Rechnungs-Zahlungen).

## 6. UI

Eigenes Modul `js/module/handyreparatur/` (Dateien: `daten.js`,
`berechnung.js`, `index.js`), **nicht** in Bottom-Nav oder
Finanzen-Tab-Leiste — erreichbar über einen neuen Suche-Schnelleinstieg
(`js/module/suche/index.js`s `SCHNELLEINSTIEGE`-Array, Ziel
`#/handyreparatur`), analog zu "Rechnungen". Eine Liste (analog
`rechnungen/index.js`s Muster: Filter-Chips offen/fertig/verkauft,
Summenkarte oben mit Warenwert-Summe + erwartetem Gewinn), Formular
zum Anlegen neuer Aufträge, Klick auf einen Auftrag zeigt/ändert Status.

## 7. Nicht-Ziele

- Kein Kundenname-Feld (Geschäftsmodell ist Ankauf/Weiterverkauf, kein
  Kundenservice — s. Abschnitt 0).
- Keine Kalender-Verknüpfung (Sub-Etappe M existiert noch nicht,
  bleibt spätere Erweiterung wie ursprünglich in `CLAUDE.md` notiert).
- Kein Foto-Upload für Geräte (nicht angefragt).

## 8. Datenmigration der Rohdaten

Nach dem Bauen werden die acht in `CLAUDE.md` gesicherten
Rohdaten-Zeilen per Supabase-MCP eingetragen (Chat-Diktat-Konvention,
kein UI-Formular nötig) — Status jeweils `offen` (da kein Status
bekannt war), `warenwert`/`voraussichtlicher_verkaufspreis` aus den
dokumentierten Zahlen übernommen.
