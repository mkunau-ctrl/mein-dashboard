# Modul-Schnittstelle

Jedes Modul ist eine ES-Modul-Datei in `js/module/` und registriert sich beim
Import über `registriere({...})` aus `../registry.js`.

Ein Modul-Objekt:
- `id` (string, eindeutig, kleinbuchstaben, z. B. `"ernaehrung"`)
- `titel` (string, Anzeigename der Kachel)
- `renderKachel(kachelEl)` – optional: befüllt die Kachel mit dem Tagesstand
- `init(containerEl, supabase)` – optional: rendert die Detailansicht des Moduls

Aktivierung: Import-Zeile in `js/app.js` ergänzen (z. B.
`import './module/ernaehrung.js';`). Der Rest der App bleibt unangetastet.
