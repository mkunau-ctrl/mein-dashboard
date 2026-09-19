# Etappe 3 – Sendungen-Automatisierung: Dedup + Status-Historie + Abholdaten

**Datum:** 2026-09-19
**Status:** bereit zum Bauen
**Vorgänger:** Etappe 2 (Eingabe-UI entfernt), siehe `docs/PROJEKT-LOG.md`
2026-09-19. Löst den seit Etappe 6 geparkten Sendungen-Mehrfachzeilen-Bug.

## 1. Ziel

Die E-Mail-Automatisierung (`automatisierung/postfach-scan.mjs` +
`automatisierung/klassifizieren.js`) erkennt eine bestehende Sendung anhand
ihrer Trackingnummer wieder, statt bei jeder der ~5 Status-Mails pro
Sendung eine neue Zeile anzulegen. Zusätzlich wird eine echte
Status-Historie geführt (wann war das Paket wo) sowie, falls in der
E-Mail vorhanden, ein Abholcode und eine Abholadresse+Öffnungszeiten
(Packstation/Postfiliale) extrahiert.

**Bewusst NICHT Teil dieser Etappe:** der eigentliche
Sendungs-Detail-Screen (Klick auf eine Sendung → volle Ansicht mit
Status-Historie, QR-/Barcode-Anzeige) — das ist Etappe 4
("Detail-Ansichten bauen"), die auf den hier gebauten Daten aufbaut.
Diese Etappe liefert nur das Datenmodell, die Automatisierung, und eine
minimale Anpassung der bestehenden Sendungen-Liste (neue Status-Kategorie
"abholbereit").

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Dedup-Schlüssel | Trackingnummer (pro `user_id`) | Einzige stabile, in DHL/Hermes/GLS/UPS-Mails durchgängig vorhandene ID |
| Sendungen ohne Trackingnummer (z. B. Amazon-Bestellbestätigung vor Versand) | Weiterhin neue Zeile anlegen, keine Verknüpfung versucht | Keine sichere Verknüpfungsmöglichkeit ohne Trackingnummer — bewusste, dokumentierte Grenze |
| Status-Historie | Neue Tabelle `sendungen_ereignisse`, ein Eintrag pro verarbeiteter Status-Mail | `sendungen.status` bleibt als schneller "aktueller Stand"-Cache für Sortierung/Badge bestehen, wird aber aus der Historie abgeleitet |
| Status-Kategorisierung | Deterministisches Keyword-Mapping in JS (`kategorisiereStatus`), NICHT durch die KI | Reproduzierbar, testbar, kein LLM-Rauschen bei einer reinen Textklassifikation |
| Neue Status-Kategorie "abholbereit" | Ergänzt zwischen "unterwegs" und "zugestellt" | Paket liegt an der Packstation/im Shop, ist aber noch nicht beim Nutzer — fachlich ein eigener Zustand |
| QR-/Barcode-Bild aus der E-Mail extrahieren | **Nicht Teil dieser Etappe** (Klassifikator liest nur Text, kein Bild-Parsing) | Technisch aufwändig, unzuverlässig; der Abholcode als Text reicht für die Terminal-Eingabe |
| QR-/Barcode-Generierung aus dem Abholcode | Datenerfassung hier, Anzeige/Generierung erst in Etappe 4 | Diese Etappe liefert nur den `abholcode`-Text in der DB; das Rendern als scanbarer Code (ohne Garantie, dass er von DHL akzeptiert wird) ist UI-Arbeit von Etappe 4 |
| Bestehende 7 Sendungen-Zeilen | Einmalig manuell aufgeräumt (erkennbare Duplikate per Trackingnummer zusammengefasst) | Nutzer-Entscheidung, bevor der Fix live geht |
| Keine erfundenen Daten | Klassifikator-Prompt verlangt explizit `null` für jedes Feld, das nicht wörtlich in der Mail steht | Durchgängiger Grundsatz aus den vorherigen Etappen |

## 3. Datenmodell

### 3.1 Neue Tabelle `sendungen_ereignisse`

```sql
create table public.sendungen_ereignisse (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  sendung_id uuid not null references public.sendungen(id) on delete cascade,
  beschreibung text not null,
  status_kategorie text not null default 'unbekannt'
    check (status_kategorie in ('unterwegs', 'abholbereit', 'zugestellt', 'unbekannt')),
  ort text,
  zeitpunkt timestamptz not null default now(),
  erstellt_am timestamptz not null default now()
);
alter table public.sendungen_ereignisse enable row level security;
create policy "sendungen_ereignisse_eigene_zeilen" on public.sendungen_ereignisse
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

RLS-Policy folgt dem Standard-Muster des Projekts (eine ALL-Policy pro
Tabelle, `user_id = auth.uid()`), wie in allen bestehenden Tabellen.

### 3.2 Erweiterung `sendungen`

Drei neue, nullable Spalten:

```sql
alter table public.sendungen
  add column abholcode text,
  add column abholadresse text,
  add column abholzeiten text;
```

`status` hat aktuell keine Check-Constraint in der Datenbank (nur
`default 'unterwegs'`, verifiziert per Schema-Abfrage) — die Gültigkeit
der vier Werte (`unterwegs`/`abholbereit`/`zugestellt`/`unbekannt`) wird
ausschließlich in `kategorisiereStatus()` (Abschnitt 4) und
`STATUS_ZYKLUS`/`STATUS_PRIORITAET` (Abschnitt 7) durchgesetzt, analog
zum bestehenden Muster (auch der bisherige Dreier-Wertebereich hatte
keine DB-Constraint).

## 4. Status-Kategorisierung (`automatisierung/klassifizieren.js`)

Neue, reine Funktion (mit `node:test` getestet):

```js
const STATUS_SCHLUESSELWOERTER = [
  { kategorie: 'zugestellt', muster: /zugestellt|geliefert|ausgeliefert|abgegeben/i },
  { kategorie: 'abholbereit', muster: /abholbereit|zur abholung|packstation.*bereit|paketshop.*hinterlegt|abholung möglich/i },
  { kategorie: 'unterwegs', muster: /unterwegs|zustellfahrzeug|sortierzentrum|im zielland|versandt|übergeben/i },
];

export function kategorisiereStatus(statusText) {
  if (!statusText) return 'unbekannt';
  for (const { kategorie, muster } of STATUS_SCHLUESSELWOERTER) {
    if (muster.test(statusText)) return kategorie;
  }
  return 'unbekannt';
}
```

## 5. Klassifikator-Prompt erweitern

`baustePrompt()` in `klassifizieren.js`: die `sendung`- und `amazon`-Zeilen
im JSON-Schema um optionale Felder erweitern:

```
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
```

Zusätzlicher Prompt-Hinweis: "Fülle `statusText`/`ort`/`abholcode`/
`abholadresse`/`abholzeiten` NUR, wenn der Wert wörtlich oder eindeutig
aus der E-Mail hervorgeht. Erfinde keine Werte — bei Unsicherheit `null`."

`parseKlassifikation()` validiert weiterhin nur die bereits bestehenden
Pflichtfelder (`haendler` für `sendung`) — die neuen Felder sind alle
optional, keine zusätzliche Pflichtprüfung nötig.

## 6. Dedup + Schreiblogik (`automatisierung/postfach-scan.mjs`)

`schreibeErgebnis(k)` für `k.typ === 'sendung' || k.typ === 'amazon'`:

1. Wenn `k.trackingnummer` gesetzt ist: bestehende Zeile in `sendungen`
   mit `trackingnummer = k.trackingnummer` und `user_id = DASHBOARD_USER_ID`
   suchen.
   - **Gefunden:** `sendungen`-Zeile aktualisieren — die neue Kategorie
     `neu = kategorisiereStatus(k.statusText)` wird nur dann als `status`
     übernommen, wenn **beide** gelten: `neu !== 'unbekannt'` (eine Mail
     ohne erkennbaren Status darf einen bekannten Status nie
     überschreiben) UND die Priorität von `neu` laut `STATUS_PRIORITAET`
     aus Abschnitt 7 (dort nur für `unterwegs`0/`abholbereit`1/
     `zugestellt`2 relevant, `unbekannt`s Wert in dieser Tabelle ist nur
     für die Listen-Sortierung gedacht, nicht für diesen Vergleich) ist
     größer oder gleich der Priorität des aktuellen `status`. Ist der
     aktuelle `status` selbst `unbekannt`, gilt jede erkannte Kategorie
     (`unterwegs`/`abholbereit`/`zugestellt`) automatisch als Fortschritt
     und wird übernommen. So bewegt sich der Status nur vorwärts (eine
     verspätet eintreffende "unterwegs"-Mail nach bereits "zugestellt"
     ändert nichts mehr) und wird nie durch eine nichtssagende Mail auf
     "unbekannt" zurückgeworfen. `letzte_aktualisierung` wird bei JEDEM
     verarbeiteten Ereignis auf jetzt gesetzt, unabhängig davon ob sich
     `status` ändert.
     `abholcode`/`abholadresse`/`abholzeiten`/`beschreibung` nur
     überschreiben, wenn `k` für das jeweilige Feld einen Wert liefert
     (nie einen vorhandenen Wert mit `null` überschreiben). Danach einen
     neuen Eintrag in `sendungen_ereignisse` anlegen
     (`beschreibung: k.statusText || k.beschreibung || 'Status-Update'`,
     `status_kategorie`, `ort: k.ort`).
   - **Nicht gefunden:** neue `sendungen`-Zeile anlegen (wie bisher, plus
     die drei neuen Felder), danach den ersten `sendungen_ereignisse`-
     Eintrag dafür anlegen.
2. Wenn `k.trackingnummer` NICHT gesetzt ist: wie bisher eine neue Zeile
   anlegen (keine Verknüpfung versucht), plus einen ersten
   `sendungen_ereignisse`-Eintrag.

## 7. Sendungen-Liste anpassen (`js/module/sendungen/`)

- `berechnung.js`: `STATUS_PRIORITAET` wird vollständig neu definiert als
  `{ unterwegs: 0, abholbereit: 1, unbekannt: 2, zugestellt: 3 }` (bisher
  `{ unterwegs: 0, unbekannt: 1, zugestellt: 2 }`). `STATUS_ZYKLUS`
  (Klick-Reihenfolge des Status-Buttons) wird zu `{ unterwegs:
  'abholbereit', abholbereit: 'zugestellt', zugestellt: 'unterwegs',
  unbekannt: 'unterwegs' }`. Test-Datei `test/sendungen-berechnung.test.js`
  um einen Fall für `abholbereit` (Sortierung und Zyklus) ergänzen.
- `app.css`: neuer Token `--hm-gelb-bg` (Dunkel: `#3D2F0F`, Hell: `#FBF0D6`
  — analog zum bestehenden Muster der anderen `--hm-*-bg`-Töne) plus neue
  Regel `.status-abholbereit { background: var(--hm-gelb-bg); color:
  var(--hm-gelb); }`, damit "abholbereit" sich optisch klar von
  "unterwegs" (blau) und "zugestellt" (grün) abhebt.
- `pakete.js`: `STATUS_TEXT`-Map um `abholbereit: 'abholbereit'` ergänzen.
  Keine sonstigen Änderungen an der Listenansicht — kein Klick-Handler,
  keine Detail-Navigation (das ist Etappe 4).

## 8. Migration der bestehenden 7 Zeilen

Vor dem ersten produktiven Lauf mit der neuen Automatisierung: die 7
bestehenden `sendungen`-Zeilen per SQL sichten (`select * from sendungen
order by trackingnummer`), erkennbare Duplikate (gleiche
Trackingnummer) identifizieren, die älteren/redundanten Zeilen löschen
und ggf. die verbleibende Zeile mit dem aktuellsten bekannten Status
versehen. Manuelle, einmalige Aktion, kein Code dafür nötig — wird bei
der Implementierung direkt per Supabase-Tool ausgeführt und im
Projekt-Log dokumentiert (wie viele Zeilen vorher/nachher).

## 9. Definition of Done

- [ ] `sendungen_ereignisse`-Tabelle existiert mit RLS-Policy.
- [ ] `sendungen` hat die drei neuen Spalten (`abholcode`, `abholadresse`,
      `abholzeiten`).
- [ ] `kategorisiereStatus()` implementiert und getestet.
- [ ] Klassifikator-Prompt liefert die fünf neuen optionalen Felder.
- [ ] `postfach-scan.mjs` erkennt bestehende Sendungen per Trackingnummer
      wieder und aktualisiert statt neu anzulegen; legt bei jedem
      Durchlauf einen `sendungen_ereignisse`-Eintrag an.
- [ ] `berechnung.js`/`pakete.js`/`app.css` unterstützen die neue
      Status-Kategorie `abholbereit`.
- [ ] Bestehende 7 Zeilen einmalig aufgeräumt, im Projekt-Log dokumentiert.
- [ ] `npm test` grün (inkl. neuer Tests für `kategorisiereStatus` und die
      erweiterte Sendungen-Sortierung).
- [ ] Live-Test: nächster automatischer Postfach-Scan verarbeitet eine
      bekannte Sendung ohne neue Duplikat-Zeile zu erzeugen (manuell
      beobachtet, da der Scheduled Task täglich läuft).

## 10. Bewusst NICHT in dieser Etappe

- Der Sendungs-Detail-Screen (Klick auf eine Sendung, Status-Historie
  anzeigen, QR-/Barcode rendern) — Etappe 4.
- Echte Bild-Extraktion von QR-/Barcodes aus E-Mail-Anhängen.
- Verknüpfung von Sendungen ohne Trackingnummer mit einer später
  eintreffenden Trackingnummer-Mail (z. B. Amazon-Bestellbestätigung →
  spätere Versandbestätigung bleiben getrennte Zeilen).
- Rückwirkende Anreicherung der Status-Historie für bereits verarbeitete,
  vergangene E-Mails (nur ab dem nächsten Lauf werden Ereignisse
  gesammelt).
