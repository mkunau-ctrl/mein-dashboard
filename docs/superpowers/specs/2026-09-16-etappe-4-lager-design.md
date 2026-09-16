# Etappe 4 – Modul Lager/Ersatzteile: Design

**Datum:** 2026-09-16
**Status:** bereit zum Bauen (kurzes Design, Muster aus Etappe 1–3 übernommen)
**Vorgänger:** `docs/specs/2026-09-08-dashboard-konzept.md` (Abschnitt 4.3/6).

## 1. Ziel

Teileliste mit Bestand, Status (fehlt/bestellt/da) und Warenwert; eine
Bestell-Merkliste als gefilterte Sicht auf dieselben Daten.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Bestell-Merkliste | **kein eigenes Datenmodell**, nur eine gefilterte Sicht (Status ≠ `da`) auf `parts` | Vermeidet doppelte Datenhaltung/Sync-Probleme zwischen Teileliste und Merkliste. |
| Löschen von Teilen | harte Löschung | Wie Todos/Finanzen – keine Statistik-Historie nötig. |
| Warenwert | `Σ bestand · einzelwert` über alle Teile (Konzept-Formel unverändert) | `bestand` ist der tatsächliche Lagerbestand; bei `fehlt`/`bestellt` i. d. R. `0`, bis das Teil ankommt. |
| Status-Wechsel | Ein Knopf zyklisch `fehlt → bestellt → da → fehlt …` | Schneller Alltag ohne Dialog. |

## 3. Datenmodell (Supabase, Schema `public`)

RLS wie bei den anderen Modulen.

### `parts`
| Spalte | Typ | Hinweis |
|---|---|---|
| `bezeichnung` | `text not null` | |
| `bestand` | `numeric not null default 0` | tatsächlicher Lagerbestand |
| `soll_bestand` | `numeric` | optional, Zielbestand |
| `status` | `text not null default 'da'` | `fehlt` \| `bestellt` \| `da` |
| `einzelwert` | `numeric` | optional, € pro Stück |
| `erstellt_am` | `timestamptz not null default now()` | |

## 4. Logik (reine Funktionen in `berechnung.js`)

- `warenwert(parts)` → `Σ bestand · (einzelwert ?? 0)`.
- `sortiereTeile(parts)` → nach Status-Priorität (`fehlt` → `bestellt` →
  `da`), dann alphabetisch nach `bezeichnung`.
- `merkliste(parts)` → `sortiereTeile(parts)`, gefiltert auf `status !== 'da'`.
- `naechsterStatus(status)` → zyklisch `fehlt → bestellt → da → fehlt`.

## 5. Dateistruktur

`js/module/lager/`
| Datei | Aufgabe | Test |
|---|---|---|
| `index.js` | Registriert Modul (`id:'lager'`, `titel:'Lager'`), Tabs „Teile"/„Bestellen", Kachel „Lager: N fehlen/bestellt". | – |
| `daten.js` | Supabase-Wrapper: `ladeAlles`, `speicherTeil`, `entferneTeil`, `setzeStatus`. | – |
| `berechnung.js` | `warenwert`, `sortiereTeile`, `merkliste`, `naechsterStatus`. | ✅ |
| `teile.js` | Volle Liste + Warenwert-Summe + „+ Neues Teil". | manuell |
| `bestellen.js` | Merkliste, Status per Klick weiterschalten. | manuell |

## 6. Definition of Done

- [ ] Tabelle `parts` mit RLS angelegt.
- [ ] `node:test` grün: `berechnung.js`.
- [ ] Teil anlegen/bearbeiten/entfernen funktioniert.
- [ ] Status-Zyklus funktioniert, Merkliste zeigt nur offene Teile.
- [ ] Warenwert korrekt berechnet.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, nach `main` gemergt,
      gepusht.

## 7. Bewusst NICHT in Etappe 4

- Lieferanten-/Bestellhistorie.
- Barcode-Scan.
- Automatische Nachbestellung.
