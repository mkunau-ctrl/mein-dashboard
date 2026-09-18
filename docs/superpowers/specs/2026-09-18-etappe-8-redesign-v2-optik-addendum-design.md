# Etappe 8 (v2) – Optik-Addendum: Farben/Formen aus Marks Prototyp

**Datum:** 2026-09-18
**Status:** bereit zum Bauen
**Ergänzt:** `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md` (Abschnitt 2, Zeile "Theme-Default").
**Auslöser:** Nach Freigabe der ursprünglichen Spec hat Mark entschieden, dass zusätzlich zur Navigationsstruktur auch die komplette Optik (Farben, Karten-Layout, Formen) aus seinem Prototyp (`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`) übernommen werden soll — nicht nur die Anordnung. Das war in der ursprünglichen Spec bewusst ausgeschlossen ("nicht erzwungen dunkel wie im Prototyp"); diese Entscheidung wird hiermit für die Farb-/Formensprache aufgehoben (das Dark-als-erzwungener-Standard bleibt aber weiterhin ausgeschlossen — siehe unten).

## 1. Ansatz

Bestehende CSS-Klassen (`.stat-karte`, `.icon-badge`, `.punkt-zeile`, `.status-badge`, `.tab-leiste`, `#tab-leiste-unten`) werden umgeskinnt (Farb-Tokens + Radius/Schatten ersetzt), statt Prototyp-eigene Klassennamen einzuführen und jedes Modul-Template umzuschreiben. Das gilt automatisch für alle Module (auch Ernährung/To-dos/Sendungen/Berichtsheft), weil sie alle dieselben CSS-Variablen und Klassen nutzen — nur `app.css` wird geändert, kein Modul-JS außer den zwei unten explizit genannten Stellen.

**Theme-Auflösung bleibt unverändert:** `js/theme.js` (Systemeinstellung + manueller Override via `localStorage`/`data-theme`) wird nicht angefasst — nur die Farbwerte hinter den CSS-Variablen ändern sich.

## 2. Leitplanken (bewusste Korrekturen während der Klärung)

| Thema | Entscheidung | Warum |
|---|---|---|
| Farbpalette | 1:1 aus dem Prototyp übernommen (near-black `#0A0A0B`, iOS-Blau `#0A84FF`, grün/rot-Akzente, `border-radius:16px`) | Mark: "Prototyp-Palette 1:1" |
| Reichweite | Gilt für ALLE Module, nicht nur die neuen Screens dieser Etappe | Mark: "Überall gleichzeitig" |
| Neue interaktive Funktionen aus dem Prototyp (Filter-Chips, Benachrichtigungs-Glocke, Avatar-Upload) | **Nicht Teil dieser Etappe** — nur die optische Sprache (Farben/Formen/Karten/Pillen) wird übernommen | Das wäre neue Funktionalität, keine Optik, und würde die Etappe sprengen |
| Fortschrittsbalken (Ausbildungsjahr) | **Nicht gebaut** — keine reale Prozent-Kennzahl vorhanden (Ausbildungsjahr-Fortschritt war in der Ursprungs-Spec schon als optional markiert und wurde nicht umgesetzt) | Grundsatz "keine erfundenen Daten" gilt auch für die Optik-Bausteine selbst |
| Home-Stat-Kacheln (3er-Raster) | Kontostand / unechter Kontostand / Ausgaben diesen Monat statt Einnahmen/Ausgaben/Differenz | Einnahmen sind nirgends im Datenmodell erfasst (verifiziert: `js/module/finanzen/ausgaben.js:58,83` erzwingt `betrag > 0`) |
| Einnahmen-Tracking | **Nicht Teil dieser Etappe**, sondern eigene, spätere Etappe (analog Kalender, Sendungen-Dedup-Bug) | Neue Tabelle + neue Berechnungslogik + ändert `kontostand()`, auf dem mehrere schon fertige Tasks aufbauen — zu groß für ein Addendum |
| Avatar (Profil) | Zeigt den ersten Buchstaben der E-Mail-Adresse (z. B. "M" bei m.kunau@gmx.de), keine erfundenen Initialen/Namen | Name ist nirgends erfasst, nur die E-Mail-Adresse aus der Session |

## 3. Token-Mapping (`app.css` `:root`)

Bestehende deutsche Variablennamen bleiben, Werte werden 1:1 aus dem Prototyp übernommen, drei neue Tokens kommen dazu (`--karte-getoent`, `--schatten`, `--radius`, sowie getönte Hintergründe `--hm-rot-bg`/`--hm-gruen-bg`/`--akzent-bg`):

**Dunkel (Standard, sowie `:root[data-theme="dark"]`):**
`--bg:#000000; --karte:#0A0A0B; --karte-getoent:#0D0D0F; --text:#FFFFFF; --gedaempft:#8E9196; --rand:#232326; --icon-bg:#141416; --icon-farbe: var(--text); --akzent:#0A84FF; --pille-bg: var(--karte); --pille-text: var(--text); --hm-gruen:#22C55E; --hm-rot:#F0473F; --hm-gelb:#e0b73a; --hm-rot-bg:#3D2020; --hm-gruen-bg:#183A28; --akzent-bg:#122A47; --ueberfaellig-bg: var(--hm-rot-bg); --ueberfaellig-text: var(--hm-rot); --schatten: none; --radius: 16px;`

**Hell (`prefers-color-scheme: light` bzw. `:root[data-theme="light"]`):**
`--bg:#F7F8FA; --karte:#FFFFFF; --karte-getoent:#EEF1F3; --text:#14161A; --gedaempft:#868B93; --rand:#E7E9EC; --icon-bg:#EEF1F3; --icon-farbe: var(--text); --akzent:#0A84FF; --pille-bg: var(--karte); --pille-text: var(--text); --hm-gruen:#16A34A; --hm-rot:#EF4444; --hm-gelb:#e0b73a; --hm-rot-bg:#FBDAD8; --hm-gruen-bg:#DCF3E3; --akzent-bg:#DCEBFF; --ueberfaellig-bg: var(--hm-rot-bg); --ueberfaellig-text: var(--hm-rot); --schatten: 0 1px 3px rgba(16,18,24,.05), 0 1px 1px rgba(16,18,24,.03); --radius: 16px;`

## 4. Neue/geänderte Komponentenklassen

- `.stat-karte`, `.stat-karte.gross`: `border-radius` auf `var(--radius)`, `box-shadow` auf `var(--schatten)`, `.gross`-Variante nutzt `var(--karte-getoent)` als Hintergrund statt `var(--karte)`.
- Neu `.stat-grid`/`.stat`: 3er-Raster für Mini-Kennzahlen (Home).
- `.status-badge`-Familie: von reinen Volltonfarben auf getönte Hintergrund+Textfarbe umgestellt (wie Prototyp-Status-Pillen).
- `.tab-leiste`: Hintergrund von `var(--bg)` auf `var(--icon-bg)`, aktiver Tab bekommt `var(--schatten)`.
- `#tab-leiste-unten`: Hintergrund auf `var(--nav-bg)` (neuer Token, dunkel `#000000EE` / hell `#FFFFFFEE`) + `backdrop-filter: blur(10px)`.
- Neu `.section-head`/`.link-muted`: für "Alle anzeigen"-Links (behebt die offene Lücke aus Task 4, das Home-Modul nutzt diese Klassen schon).
- Neu `.avatar`: Kreis mit großem Anfangsbuchstaben (Profil).
- Neu `.icon-badge.gruen`/`.icon-badge.rot`: getönte Icon-Badge-Varianten (für Stat-Kacheln).

## 5. Definition of Done (Addendum)

- [ ] `app.css` nutzt die neuen Token-Werte, keine hartkodierten Farben mehr in den geänderten Regeln.
- [ ] Alle bestehenden Module (Ernährung/To-dos/Finanzen/Sendungen/Berichtsheft) übernehmen die neue Optik automatisch (keine Modul-Änderungen nötig, außer Home-Stat-Grid und Profil-Avatar).
- [ ] Home zeigt ein 3er-Stat-Raster: Kontostand / unechter Kontostand / Ausgaben diesen Monat.
- [ ] Profil zeigt einen Avatar-Kreis mit dem ersten Buchstaben der E-Mail-Adresse.
- [ ] Kein Fortschrittsbalken ohne echte Datenbasis, keine erfundenen Einnahmen.
- [ ] `npm test` bleibt grün (reine CSS-/Markup-Änderungen, keine Logikänderung).

## 6. Bewusst NICHT in diesem Addendum

- Einnahmen-Tracking (eigene, spätere Etappe).
- Neue interaktive Funktionen aus dem Prototyp ohne reale Datenbasis (Filter-Chips, Glocke, Avatar-Upload).
- Erzwungenes Dunkel-Theme als Standard (bleibt Systemeinstellung, unverändert aus der Ursprungs-Spec).
