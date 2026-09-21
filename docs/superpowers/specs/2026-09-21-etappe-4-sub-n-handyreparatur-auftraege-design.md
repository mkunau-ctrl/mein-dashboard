# Etappe 4, Sub-Etappe N – Handyreparatur-Aufträge: Design

**Datum:** 2026-09-21
**Status:** bereit zum Bauen (Nutzer-Antworten liegen vor)
**Vorgänger:** Sub-Etappe A (Einnahmen-Datenmodell), `CLAUDE.md` Backlog-Item N.

## 1. Ziel

Handyreparatur-Aufträge (Kunde/Gerät/Problem/Preis) erfassen; beim
Abholen entsteht automatisch eine Einnahme, optional wird ein
Lager-Teil verbraucht.

## 2. Grundsatz-Entscheidungen (Nutzer-Antworten, 2026-09-21)

| Thema | Entscheidung |
|---|---|
| Status-Zyklus | `offen → fertig → abgeholt`, **kein Rücksprung** von `abgeholt` (anders als der zyklische Teile-Status `fehlt→bestellt→da→fehlt` — ein abgeholter Auftrag ist fertig/archiviert, kein wiederkehrender Lagerbestand) |
| Erfassung | **nur Chat-Diktat** — kein App-Formular, `daten.js`-Funktion ist die Schnittstelle für Claude |
| Lager-Verknüpfung | **ja**, optional: ein Auftrag kann ein Teil (`parts`) referenzieren; beim Wechsel auf `abgeholt` sinkt `bestand` des verknüpften Teils um 1 |
| Ort im Dashboard | neuer Tab **"Aufträge"** in Finanzen (`js/module/finanzen/`), kein eigenes Modul |
| Einnahme bei Abholung | automatisch: `legeEinnahmeAn` mit `betrag = preis`, `bezeichnung = "Reparatur " + geraet`, `konto_id` = erstes Konto (Hauptkonto) |

## 3. Datenmodell

### `auftraege` (neu)
| Spalte | Typ | Hinweis |
|---|---|---|
| `kunde` | `text not null` | |
| `geraet` | `text not null` | |
| `problem` | `text` | optional |
| `preis` | `numeric not null` | |
| `status` | `text not null default 'offen'` | `offen`\|`fertig`\|`abgeholt` |
| `teil_id` | `uuid references parts` | optional, nullable |
| `erstellt_am` | `timestamptz not null default now()` | |

RLS wie überall: `user_id = auth.uid()`, `for all to authenticated`.

## 4. Logik (reine Funktionen, `js/module/finanzen/berechnung.js`, ergänzt)

- `naechsterAuftragStatus(status)` → `offen→'fertig'`, `fertig→'abgeholt'`,
  `abgeholt→null` (kein weiterer Schritt, UI blendet den Status-Knopf
  dann aus statt ihn klickbar zu lassen).
- `sortiereAuftraege(auftraege)` → offen/fertig vor abgeholt, innerhalb
  gleicher Gruppe neueste zuerst (`erstellt_am` absteigend).

## 5. Dateistruktur

`js/module/finanzen/` (ergänzt):
| Datei | Aufgabe | Test |
|---|---|---|
| `berechnung.js` | siehe Abschnitt 4 | ✅ |
| `daten.js` | `ladeAlles` lädt zusätzlich `auftraege` als `zustand.auftraege`. Neue Funktionen: `legeAuftragAn({kunde, geraet, problem, preis, teil_id})` (nur für Chat-Diktat, keine UI-Formular-Anbindung), `setzeAuftragStatus(auftrag, neuerStatus)` — bei `neuerStatus === 'abgeholt'` zusätzlich `legeEinnahmeAn(...)` und, falls `auftrag.teil_id` gesetzt, `bestand` des Teils um 1 senken (liest das Teil, schreibt `bestand - 1`, min. 0). `entferneAuftrag(id)`. | – |
| `auftraege.js` (neu) | Liste (wie `teile.js`/`ausgaben.js`: Anzeige + Status-Klick-Zyklus + Löschen, **kein Formular**, da nur Chat-Diktat). Status-Knopf bei `abgeholt` ist deaktiviert/ausgeblendet (kein weiterer Zyklus-Schritt). | manuell |
| `index.js` | `TABS` um `['auftraege', 'Aufträge']` ergänzt. | – |

## 6. Definition of Done

- [ ] Migration: `auftraege` angelegt, RLS gesetzt.
- [ ] `node --test` grün: `naechsterAuftragStatus`, `sortiereAuftraege`.
- [ ] Auftrag per Chat-Diktat anlegen funktioniert, Status-Zyklus
      offen→fertig→abgeholt funktioniert, bei `abgeholt` entsteht
      automatisch eine Einnahme und (falls verknüpft) sinkt der
      Teile-Bestand um 1.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert.

## 7. Bewusst NICHT in dieser Sub-Etappe

- App-Formular zum Anlegen (bewusst nur Chat-Diktat, Nutzer-Entscheidung).
- Verknüpfung mit einem Kalender-Termin fürs Abholdatum — kommt erst
  mit Sub-Etappe M (Kalender), sobald die existiert.
