# Modul-Schnittstelle

Jedes Modul ist eine ES-Modul-Datei in `js/module/` und registriert sich beim
Import über `registriere({...})` aus `../registry.js`.

Ein Modul-Objekt:
- `id` (string, eindeutig, kleinbuchstaben, z. B. `"ernaehrung"`)
- `titel` (string, Anzeigename in der Tab-Leiste unten)
- `icon` (string, optional: Inline-SVG-Markup fürs Icon in der Tab-Leiste)
- `renderKachel(kachelEl)` – optional, aktuell ungenutzt (Kachel-Raster ist seit
  der Dunkel-Umstellung durch die feste Tab-Leiste unten ersetzt)
- `init(containerEl, supabase)` – optional: rendert die Detailansicht des Moduls

Aktivierung: Import-Zeile in `js/app.js` ergänzen (z. B.
`import './module/ernaehrung/index.js';`). Der Rest der App bleibt unangetastet.

## Ordner-Konvention (ab Etappe 1)

Größere Module liegen als Ordner `js/module/<name>/` mit einer `index.js`, die
`registriere({...})` aufruft. Reine Logik (Berechnungen, Routing-Helfer) kommt
in eigene Dateien mit `node:test`-Tests, Supabase-Zugriff gebündelt in
`daten.js`. Die Tab-Ansichten exportieren je eine Funktion
`zeige<Tab>(container, zustand, aktualisieren)`.
