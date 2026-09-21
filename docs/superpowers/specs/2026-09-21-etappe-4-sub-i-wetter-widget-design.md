# Etappe 4, Sub-Etappe I – Wetter-Widget: Design

**Datum:** 2026-09-21
**Status:** bereit zum Bauen
**Vorgänger:** `CLAUDE.md` Abschnitt "Aktueller Stand" (Backlog A–Q).

## 1. Ziel

Ein einfaches Wetter-Widget auf dem Home-Screen: aktuelle Temperatur +
3-Tage-Vorschau für Lemgo, ohne Konto/API-Key.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| API | [Open-Meteo](https://open-meteo.com) | Kostenlos, kein API-Key, kein Backend nötig, reiner Client-seitiger `fetch()` |
| Standort | Lemgo, PLZ 32657, feste Koordinaten `lat=52.0333, lon=8.9000` | Nutzer-Antwort 2026-09-21: feste Stadt statt Browser-Geolocation (kein Berechtigungsdialog nötig) |
| Vorschau-Zeitraum | 3 Tage (heute + 2) | Nutzer-Entscheidung 2026-09-21 |
| Platzierung | ganz unten auf Home, nach den bestehenden Listen-Abschnitten (Termine/Sendungen/To-dos) | Nutzer-Entscheidung 2026-09-21: dezent, nicht prominent |
| Caching | `localStorage`, 30 Minuten gültig (Zeitstempel + Daten), danach neu abrufen | Vermeidet unnötige Requests bei jedem Home-Aufruf, Wetter ändert sich nicht minütlich |
| Fehlerfall (kein Internet/API down) | Widget zeigt still "Wetter gerade nicht verfügbar", kein Fehler-Alert | Wetter ist ein Nice-to-have, kein kritisches Feature — darf Home nicht blockieren oder stören |

## 3. Datenmodell

**Keins.** Reiner Client-seitiger API-Aufruf, keine Supabase-Tabelle.

## 4. Logik (reine Funktionen, `js/module/home/wetter.js`)

- `wetterUrl(lat, lon, tage)` → `string` (baut die Open-Meteo-URL, z. B.
  `https://api.open-meteo.com/v1/forecast?latitude=52.0333&longitude=8.9000&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Berlin&forecast_days=3`) —
  reine String-Erzeugung, testbar ohne Netz.
- `wettercodeZuText(code)` → `string` (bildet Open-Meteos numerischen
  `weathercode` auf einen kurzen deutschen Text + ein passendes Icon-Kürzel
  ab, z. B. `0` → "Klar", `61` → "Regen" — kleine Lookup-Tabelle der
  gängigsten Codes, `sonstiges` als Fallback).
- `istCacheGueltig(zeitstempel, jetzt)` → `boolean` (Differenz < 30 Minuten).

Der eigentliche `fetch()`-Aufruf + `localStorage`-Zugriff ist UI-Code in
`wetter.js`s exportierter Anzeige-Funktion (Netz/Storage-Zugriff wird wie
im Rest des Projekts nicht automatisiert getestet, nur die drei reinen
Funktionen oben).

## 5. Dateistruktur

- `js/module/home/wetter.js` (neu): `wetterUrl`, `wettercodeZuText`,
  `istCacheGueltig` (getestet) + `zeigeWetter(container)`
  (async, holt aus `localStorage`-Cache oder `fetch()`, rendert eine
  kleine `.stat-karte`-Zeile mit 3 Tages-Spalten, min/max-Temperatur +
  Icon-Text). Fehlerfall: `catch` zeigt stillen Hinweistext, kein
  `alert()`.
- `js/module/home/index.js`: `renderHome()` (bzw. die entsprechende
  Render-Funktion, je nachdem was Sub-Etappe B/E bis dahin daraus
  gemacht haben) ruft nach dem letzten bestehenden `<section>`
  zusätzlich `zeigeWetter(container.querySelector(...))` auf bzw. hängt
  einen neuen Container an — **Achtung beim Bauen:** `home/index.js` hat
  sich seit dieser Spec-Erstellung eventuell schon durch Sub-Etappe E
  (Hashchange-Routing) verändert; die ausführende Task muss den dann
  aktuellen Stand der Datei lesen, nicht diesen Spec-Text blind
  übernehmen.

## 6. Definition of Done

- [ ] `node --test` grün: `wetterUrl`, `wettercodeZuText`,
      `istCacheGueltig`.
- [ ] Home zeigt unten ein Wetter-Widget mit 3-Tage-Vorschau für Lemgo.
- [ ] Cache greift beim zweiten Aufruf innerhalb 30 Minuten (kein
      erneuter Netzwerk-Request, manuell/im Netzwerk-Tab prüfbar).
- [ ] Kein Internet/API-Fehler → stiller Hinweistext, keine kaputte
      Home-Seite, kein Alert.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.

## 7. Bewusst NICHT in dieser Sub-Etappe

- Browser-Geolocation (bewusst feste Koordinaten statt Standortabfrage).
- Wetterwarnungen/Push-Benachrichtigungen bei Unwetter.
- Mehrere Standorte/Orte wechseln.
