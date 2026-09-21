# Etappe 4, Sub-Etappe E+F (+Sendungen/Termine/Todos-Anteil von C) – Design

**Datum:** 2026-09-21
**Status:** bereit zum Bauen
**Vorgänger:** Prototyp `docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`,
`CLAUDE.md` Abschnitt "Aktueller Stand" (Backlog A–Q, Sub-Etappe A
fertig, B geplant/noch nicht gebaut).

## 0. Einordnung — warum gebündelt

Der Nutzer hat entschieden, E (Design-Angleichung Profil/Suche/
Ausbildung) **vor** B zu bauen, und beim Planen zwei echte
Abhängigkeiten gefunden:

1. **E hängt an F:** Im Prototyp verlinkt das Profil-Menü
   ("App-Einstellungen", "Sicherheit") auf einen echten
   Einstellungen-Screen. Ohne F wäre das ein toter Link — deshalb F
   hier mit rein.
2. **E berührt Sendungen/Termine/Todos:** Suche zeigt sie als
   Schnelleinstiege, Ausbildung zeigt Termine/Aufgaben. Der Nutzer
   wollte: wenn an Sendungen gearbeitet wird, gleich alles dazu
   erledigen — deshalb der Sendungen/Termine/Todos-Anteil von Item C
   (Detail-Klicks) hier mit rein. Der **Transaktionen**-Anteil von C
   bleibt draußen (der Tab existiert erst nach Sub-Etappe B).

Diese Sub-Etappe bleibt Prototyp-Phase (Doku-Rigor-Regel gilt weiter).

## 1. Ziel

Profil-, Suche- und Ausbildung-Screen sehen aus und funktionieren wie
im Prototyp. Ein neuer, echter Einstellungen-Screen entsteht. Sendungen,
Termine und To-dos werden anklickbar und zeigen eine Detailansicht
(inkl. der seit Etappe 3 erfassten, aber bisher nirgends angezeigten
Abholcode/-adresse/-zeiten und Status-Historie).

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Dekorative Prototyp-Elemente (Benachrichtigungs-Schalter, "Bankkonto"/"Google Drive"-Anzeige, Profil-Menüpunkte "Persönliche Daten"/"Dokumente"/"Konten & Verbindungen") | **1:1 wie Prototyp bauen, rein optisch/klickbar ohne Backend** — Schalter lassen sich visuell umschalten (keine Speicherung), Menüpunkte ohne echte Funktion zeigen einen Hinweis-Toast "noch nicht verfügbar" statt Navigation | Nutzer-Entscheidung 2026-09-21: "erstmal hinsauen", spätere Sub-Etappen (G = Google Drive, K = Geräte-Austausch) **knüpfen dann an diese bestehende UI an**, statt sie neu zu bauen |
| "Sicherheit"-Bereich in Einstellungen | zeigt den **echten** Passkey-Status (eingerichtet/nicht) + "Passkey einrichten"-Knopf — verschiebt die bisher im Profil versteckte Passkey-Funktion hierher (Face ID/Touch ID im Prototyp entspricht technisch dem WebAuthn-Passkey, den es hier schon gibt) | War schon als eigene Idee vom Nutzer akzeptiert ("Passkey-Einrichtung in Einstellungen verschieben", 2026-09-19) |
| "App-Einstellungen" in Einstellungen | Dark Mode (echt, nutzt bestehendes `theme.js`) + Schriftgröße (neu, echt) sind real; Rest der Sektion dekorativ (siehe oben) | Zwei bereits vorhandene/geplante echte Features bekommen hier ihren Platz |
| Schriftgröße-Umsetzung | ein CSS-Skalierungsfaktor über `data-schriftgroesse` auf `<html>` (`klein`/`normal`/`gross`), Wahl in `localStorage` (Muster wie `theme.js`) | Einfachste Umsetzung, kein Server-Zustand nötig, gleiches Muster wie Dark Mode |
| "Alle Daten exportieren" | eigener Knopf unten in Einstellungen, JSON-Download aller Module (Ernährung, To-dos, Finanzen inkl. Einnahmen/Konten/Schulden, Lager, Berichtsheft, Sendungen/Termine) | War als Backup-Wunsch vom Nutzer bestätigt (2026-09-19) |
| Ausbildungsfortschritt-Daten | `berichtsheft_settings`: `ausbildungsbeginn = '2026-08-01'`, `ausbildungsdauer_jahre = 3.5` — vom Nutzer bestätigt, per Migration/Chat-Diktat eingetragen | Nutzer-Antwort 2026-09-21 |
| "Letzte Suchen" | `localStorage` (nicht Supabase) — reine Bequemlichkeit pro Gerät, kein geteilter Zustand nötig | Passt zum Projekt-Muster "Browser-Storage nur für Komfort, nie für kritischen Zustand" |
| Routing für Detail-Klicks | `js/router.js`s `parseHash` bekommt ein **drittes Segment** (`#/modul/unterseite/detail-id`) → `{ modul, unterseite, detail }`. Einmal zentral erweitert, gilt für Sendungen/Termine/Todos jetzt und Transaktionen später (Rest von C) | Bestehendes Muster (`modul`+`unterseite`) konsequent weitergeführt statt eines neuen, parallelen Mechanismus pro Modul |
| Such-Icons/Chevron | Suchtreffer bekommen Icon-Badge (passend zum Typ) + Chevron, wie im Prototyp; `ziel` zeigt jetzt direkt auf die Detailseite, nicht nur den Tab | Nutzt die neue Detail-Route sofort sinnvoll aus ("Zeitersparnis"-Prinzip) |

## 3. Datenmodell

**Keine neue Tabelle.** Nur neue Keys in der bestehenden
`berichtsheft_settings` (Key-Value, wie `finance_settings` früher):
`ausbildungsbeginn` (Datum-String), `ausbildungsdauer_jahre` (Zahl).
Schriftgröße lebt ausschließlich in `localStorage`, kein DB-Feld.

Für die Sendungen-Detailansicht wird die bereits seit Etappe 3
existierende Tabelle `sendungen_ereignisse` erstmals gelesen (bisher
nur von der Automatisierung geschrieben, nie von der App angezeigt) —
`sendungen/daten.js`s `ladeAlles()` wird dafür erweitert.

## 4. Router-Erweiterung

`js/router.js`:
```
'#/sendungen/pakete'        -> { modul:'sendungen', unterseite:'pakete', detail:null }
'#/sendungen/pakete/<id>'   -> { modul:'sendungen', unterseite:'pakete', detail:'<id>' }
```
Regex-Zeichenklasse für `unterseite`/`detail` muss neben Buchstaben/
Bindestrich jetzt auch Ziffern erlauben (`[a-z0-9-]`), da Supabase-
UUIDs Ziffern enthalten.

Jedes Modul mit Tabs (Sendungen, Todos) liest `detail` zusätzlich zu
`unterseite` aus `parseHash` und reicht es an die Tab-Anzeige-Funktion
durch; die Tab-Datei entscheidet selbst, ob sie die Liste oder eine
Detailansicht rendert (kein neuer globaler Mechanismus, nur ein
zusätzlicher, optionaler Parameter in der bestehenden `zeigeFn(container,
zustand, aktualisieren, …)`-Signatur — analog zu `zeitraum`/`setZeitraum`
aus Sub-Etappe B).

## 5. Logik (reine Funktionen)

- `js/module/berichtsheft/berechnung.js`: neue Funktion
  `ausbildungsFortschritt(beginn, dauerJahre, heute)` → `{ jahr,
  prozent }`. `jahr` nutzt die bestehende `ausbildungsjahr()`
  unverändert. `prozent` = vergangene Tage seit `beginn` geteilt durch
  `dauerJahre * 365.25` Tage, auf 0–100 begrenzt (`Math.min(100,
  Math.max(0, …))`), gerundet auf ganze Prozent.
- Keine weiteren neuen Berechnungsfunktionen nötig — Sendungen-/Termine-/
  Todo-Detailansichten zeigen nur vorhandene Felder, keine neue Logik.

## 6. Dateistruktur

### Profil (`js/module/profil/`)
- `index.js` — komplett nach Prototyp: Avatar mit Initialen (bleibt),
  Name (aus E-Mail-Lokalteil abgeleitet, da kein echter Name gespeichert
  ist), E-Mail, Menü (Persönliche Daten*, Konten & Verbindungen*,
  Dokumente*, Berichtsheft→`#/berichtsheft`, App-Einstellungen→
  `#/einstellungen`) — **kein separater "Sicherheit"-Menüpunkt mehr im
  Profil**, da Sicherheit jetzt direkt Teil von Einstellungen ist (ein
  Klick weniger als im Prototyp, bewusste kleine Vereinfachung).
  `*` = dekorativ, zeigt Toast "noch nicht verfügbar". Abmelden-Knopf
  bleibt unten.

### Einstellungen (neues Modul `js/module/einstellungen/`)
- `index.js` — registriert als **kein** Bottom-Nav-Punkt (wie
  Ernährung/To-dos/Sendungen: nur per Hash `#/einstellungen`
  erreichbar, verlinkt von Profil). Abschnitte: Darstellung (Dark Mode
  Switch, echt; Schriftgröße, echt), Benachrichtigungen (dekorativ),
  Verbundene Dienste (dekorativ), Sicherheit (echter Passkey-Status +
  Einrichten-Knopf, wiederverwendet bestehende `registrierePasskey()`
  aus `js/auth.js`), App (Version + "Alle Daten exportieren"-Knopf,
  echt). Zurück-Knopf führt zu `#/profil`.
- `export.js` — reine Export-Logik: `sammleAlleDaten()` (ruft
  `ladeAlles()` aller Module parallel auf, wie `home/daten.js` es für
  drei Module schon tut, hier für alle sieben) + Download-Trigger
  (Blob/Klick, wie `finanzen/transaktionen.js`s CSV-Export aus
  Sub-Etappe B).
- `schriftgroesse.js` — `wendeSchriftgroesseAn()`/`setzeSchriftgroesse()`,
  1:1 nach dem Muster von `js/theme.js`.

### Suche (`js/module/suche/`)
- `index.js` — nach Prototyp: Searchbar oben, "Schnelleinstiege"
  (Kontostand→`#/finanzen`, Sendungen→`#/sendungen`, Berichtsheft→
  `#/berichtsheft`, Rechnungen*/Dokumente* dekorativ), "Letzte Suchen"
  (aus `localStorage`, max. 5, neueste zuerst, Klick übernimmt den
  Begriff ins Suchfeld). Treffer bekommen Icon-Badge + Chevron.
- `berechnung.js` — `ziel` je Treffer zeigt jetzt auf die Detailroute
  (`#/sendungen/pakete/<id>` statt `#/sendungen/pakete`, `#/todos/offen/<id>`
  bzw. `#/todos/erledigt/<id>` je nach `erledigt`-Status,
  `#/sendungen/termine/<id>`). Ausgaben bleiben auf `#/finanzen/ausgaben`
  (keine Ausgaben-Detailroute in dieser Sub-Etappe).

### Ausbildung (`js/module/berichtsheft/`)
- `index.js` — `TABS` erweitert um `['uebersicht', 'Übersicht']` ganz
  vorne (Prototyp-Reihenfolge: Übersicht/Berichtsheft/Aufgaben), Default-
  Tab wechselt von `eintraege` zu `uebersicht`. `eintraege`-Tab bleibt
  unter dem Namen "Berichtsheft" in der Leiste.
- `uebersicht.js` (neu) — Fortschritts-Ring (`ausbildungsFortschritt`,
  reine CSS-`conic-gradient`-Technik wie `.fortschritt-ring` in
  `app.css`, bereits vorhanden fürs Ernährungs-Modul, hier
  wiederverwendet), "Nächste Termine" (liest `sendungen.termine`, wie
  Home es tut), "Offene Aufgaben" (liest `todos.offen`, wie Home es
  tut) — beide Abschnitte klickbar zu ihren Detailrouten.

### Sendungen (`js/module/sendungen/`)
- `daten.js` — `ladeAlles()` lädt zusätzlich `sendungen_ereignisse`
  (sortiert nach Zeit) als `zustand.ereignisse`.
- `pakete.js` — Zeile klickbar (führt zu `#/sendungen/pakete/<id>`,
  Status-Knopf/Löschen-Knopf stoppen die Klick-Weiterleitung via
  `stopPropagation`).
- `sendung-detail.js` (neu) — zeigt Händler, Tracking, Status,
  Abholcode/-adresse/-zeiten (nur falls vorhanden), Status-Historie
  (aus `zustand.ereignisse`, gefiltert auf `sendung_id`, chronologisch).
  Zurück-Knopf führt zu `#/sendungen/pakete`.
- `termine.js` — Zeile klickbar analog, führt zu `#/sendungen/termine/<id>`.
- `termin-detail.js` (neu) — zeigt Titel, Fälligkeitsdatum, Quelle.
  Zurück-Knopf führt zu `#/sendungen/termine`.
- `index.js` — `zeigeAktuellenTab` liest `detail` aus `parseHash`,
  reicht es an die Tab-Funktion durch; `pakete.js`/`termine.js`
  entscheiden anhand von `detail`, ob sie die Liste oder (per
  dynamischem Import von `sendung-detail.js`/`termin-detail.js`) die
  Detailansicht rendern.

### To-dos (`js/module/todos/`)
- `offen.js`, `erledigt.js` — Zeile klickbar analog (führt zu
  `#/todos/offen/<id>` bzw. `#/todos/erledigt/<id>`), Checkbox/Löschen
  stoppen die Weiterleitung.
- `todo-detail.js` (neu) — zeigt Text, Fälligkeit, Wiederkehr-Info
  (falls `vorlage_id` gesetzt). Zurück-Knopf führt zum jeweiligen Tab.
- `index.js` — analog zu Sendungen: `detail` durchreichen.

### Gemeinsam
- `js/router.js` — dritte Gruppe in der Regex, `detail` im
  Rückgabeobjekt (Abschnitt 4).
- `js/app.js` — `NAV_MODULE` bleibt unverändert (`einstellungen` ist
  bewusst kein Bottom-Nav-Punkt, wie in Abschnitt 6 "Einstellungen"
  begründet).

## 7. Definition of Done

- [ ] `berichtsheft_settings` enthält `ausbildungsbeginn`/
      `ausbildungsdauer_jahre` (per Chat-Diktat/Supabase-MCP vom
      Koordinator eingetragen, keine eigene Task).
- [ ] `node --test` grün: `ausbildungsFortschritt` getestet.
- [ ] Profil, Suche (inkl. Schnelleinstiege + Letzte Suchen), Ausbildung
      (inkl. Fortschritts-Ring) sehen wie im Prototyp aus.
- [ ] Neuer Einstellungen-Screen erreichbar über Profil, Dark Mode +
      Schriftgröße + Passkey + Datenexport funktionieren echt, Rest
      dekorativ wie Prototyp.
- [ ] Sendungen, Termine, To-dos sind anklickbar, zeigen eine
      Detailansicht, Zurück führt zur Liste zurück. Sendungen-Detail
      zeigt Abholcode/-adresse/-zeiten (wo vorhanden) + Status-Historie.
- [ ] Suchtreffer führen direkt zur Detailseite des jeweiligen Eintrags.
- [ ] Keine Regression: bestehende Status-Zyklus-/Lösch-/Abhak-Buttons
      in den Listen funktionieren weiterhin (Klick-Weiterleitung wird
      korrekt gestoppt).
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.

## 8. Bewusst NICHT in dieser Sub-Etappe

- Transaktionen-Detail-Klick (Rest von C, erst nach Sub-Etappe B).
- Echte Backend-Anbindung für Benachrichtigungen/Bankkonto/Google
  Drive/Persönliche Daten/Dokumente/Konten & Verbindungen (spätere
  Sub-Etappen knüpfen an die hier gebaute Deko-UI an).
- Rechnungen-Modul (Sub-Etappe D).
