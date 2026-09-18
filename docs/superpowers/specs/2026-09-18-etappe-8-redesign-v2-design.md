# Etappe 8 (v2) – Redesign nach Marks eigenem Prototyp: Design

**Datum:** 2026-09-18
**Status:** bereit zum Bauen
**Vorgänger:** Ersetzt das Redesign aus den Log-Einträgen vom 2026-09-17
("Design-Korrektur" bis "Dunkles Redesign: tiefes Schwarz + feste
Tab-Leiste unten") – jenes Redesign hatte ein generisches Fintech-Mockup
als Vorlage. Mark will stattdessen sein eigenes, lauffähiges Prototyp
(`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`,
Quelle bei ihm: `Downloads/finanz-app.html`) als Vorlage – **inklusive
dessen Navigationsstruktur**, nicht nur der Optik.

## 1. Ziel

Die App bekommt eine neue Navigation nach Marks Prototyp: eine feste
Bottom-Nav mit **Home / Finanzen / Ausbildung / Suche / Profil** statt
einem Icon pro Fachmodul. Mehrere Fachmodule ändern dabei ihren Platz in
der App (siehe Abschnitt 2), zwei neue Screens (Suche, Profil) und ein
neuer, modul-übergreifender Home-Screen kommen dazu.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Bottom-Nav | Fest 5 Punkte: Home, Finanzen, Ausbildung, Suche, Profil – **nicht** mehr automatisch aus allen registrierten Modulen erzeugt | Mark will genau diese Anordnung aus seinem Prototyp, nicht "ein Icon pro Modul" |
| Ernährung | Bleibt als Modul/Code/Daten vollständig bestehen, verschwindet nur aus der Bottom-Nav (nicht mehr in der festen 5er-Liste) | Mark: "will ich erstmal nicht drinnen haben" – reversibel, kein Datenverlust |
| Lager | Verschwindet als eigenes Modul. Seine beiden Tabs (Teile, Bestellen) werden echte Tabs im Finanzen-Modul | Mark: "Teile/Bestellen werden echte Tabs in Finanzen" |
| To-dos, Sendungen | Bleiben eigene Screens (eigene Route, eigene Tabs), aber ohne eigenen Bottom-Nav-Punkt – erreichbar über "Alle anzeigen"-Links auf dem neuen Home-Screen | Mark: beide "auf dem Home-Bildschirm", wie im Prototyp (dort verlinkt Home zu eigenen Sendungen-/Rechnungen-Screens) |
| Unechter Kontostand | Neue Kennzahl in Finanzen: `unechterKontostand = kontostand + warenwert(parts)` | Mark: "einen echten Kontostand und einen unechten" – Lagerbestand hat einen Wert, ist aber kein Bargeld |
| Erfundene Daten | Weiterhin keine erfundenen "Einnahmen"-Einträge (Grundsatz aus dem vorigen Redesign bleibt) – Prototyp-Stat "Einnahmen" wird durch echte Kennzahlen ersetzt | Datenmodell trackt nur Ausgaben + Kontostand-Startwert, keine Einnahmen-Buchungen |
| Suche | Echte Volltextsuche über `expenses.notiz`, `todos.text`, `sendungen.haendler`, `termine.titel` – nicht nur Schnelleinstiege wie im Prototyp | Mark: "Echte Suche über Ausgaben/To-dos/Sendungen/Termine" |
| Profil | Nur Account-Info (E-Mail) + Abmelden + Hinweis auf den bestehenden Theme-Umschalter – kein neuer Funktionsumfang, keine Einstellungen-Unterseiten aus dem Prototyp | Mark: "Nur Account-Info + Logout + Link zu Einstellungen" |
| Theme-Default | Bleibt Systemeinstellung (`prefers-color-scheme`), **nicht** erzwungen dunkel wie im Prototyp | Mark: "Weiterhin Systemeinstellung folgen" |
| Ausbildungsfortschritt | Zeigt echtes Ausbildungsjahr (`ausbildungsjahr()`, z. B. "Jahr 2 von 3"), keine erfundene Prozent-Angabe aus dem Prototyp | Keine Fantasiewerte, gleicher Grundsatz wie bei den Einnahmen |
| Kalender-Feature | **Nicht Teil dieser Etappe.** Marks Wunsch nach einem Kalender ist eine eigene Idee für später | Getrennt von der Redesign-Frage, eigene Bewertung nötig |
| E-Mail-Automatisierung: Sendung erzeugt mehrere Zeilen | **Nicht Teil dieser Etappe.** Mark hat beobachtet, dass ~5 Mails pro Sendung aktuell ~5 Zeilen erzeugen statt eine Zeile zu aktualisieren – echter Bug in `postfach-scan.mjs`/`sendungen`-Datenmodell, braucht eigene Analyse (z. B. Dedup über Trackingnummer, Status-Update statt Insert) | Eigenständiges Thema, nicht Teil der Navigation/Optik-Frage |

## 3. Navigations-Architektur (technisch)

Aktuell erzeugt `js/app.js` die Bottom-Nav aus **allen** registrierten
Modulen (`alleModule()`). Das wird ersetzt durch eine feste, geordnete
Liste von Modul-IDs:

```js
const NAV_MODULE = ['home', 'finanzen', 'berichtsheft', 'suche', 'profil'];
```

`rendereTabLeiste()` iteriert `NAV_MODULE.map(holeModul)` statt
`alleModule()`. Ohne Hash öffnet die App `holeModul('home')` statt
`alleModule()[0]`. `berichtsheft` behält seine bestehende Modul-ID
(keine Routen-Änderung), bekommt aber `titel: 'Ausbildung'` statt
`'Berichtsheft'`.

Ernährung, Lager (entfernt), To-dos, Sendungen bleiben ganz normal über
`registriere()` erreichbar (Ernährung/Todos/Sendungen unverändert),
tauchen aber nicht in `NAV_MODULE` auf. Ernährung und Todos/Sendungen
sind weiterhin per Hash direkt erreichbar (`#/ernaehrung`, `#/todos`,
`#/sendungen`) – das ist unschädlich und spart eine eigene
"Ausblenden"-Logik.

## 4. Neues Modul "Home"

`js/module/home/` – neuer, modul-übergreifender Screen, folgt dem
etablierten Muster so weit sinnvoll (kein eigenes `berechnung.js`, da
keine neue Logik, nur Zusammenstellung bestehender Daten):

- `index.js` – `registriere({ id:'home', titel:'Home', icon, init })`.
  Kein `renderKachel` nötig (Bottom-Nav nutzt nur `titel`/`icon`), keine
  eigenen Tabs.
- `daten.js` – lädt parallel: `finanzen/daten.js:ladeAlles()`,
  `todos/daten.js:ladeAlles()`, `sendungen/daten.js:ladeAlles()`.
  Wiederverwendung bestehender Lade-Funktionen statt neuer
  Supabase-Queries.
- Anzeige: Kontostand-Karte (echt + unecht), "Nächste Termine" (aus
  `sendungen`-Modul-Daten, `sortiereTermine`), "Aktuelle Sendungen"
  (`sortiereSendungen`, nur offene), "Offene To-dos"
  (`sortiereOffeneTodos`) – je Abschnitt ein "Alle anzeigen"-Link zu
  `#/sendungen/...` bzw. `#/todos`.

## 5. Finanzen absorbiert Lager

- `js/module/finanzen/index.js`: `TABS` erweitert um `['teile','Teile']`
  und `['bestellen','Bestellen']`.
- `js/module/finanzen/daten.js`: `ladeAlles()` lädt zusätzlich `parts`
  (Query 1:1 aus `lager/daten.js` übernommen).
- `js/module/finanzen/berechnung.js`: übernimmt `warenwert`,
  `sortiereTeile`, `merkliste`, `naechsterStatus` aus
  `lager/berechnung.js` (Funktionen unverändert, nur Datei verschoben –
  bestehende Tests wandern mit nach
  `test/finanzen-berechnung.test.js`). Neue Funktion
  `unechterKontostand(settings, expenses, parts, heute)` =
  `kontostand(...) + warenwert(parts)`.
- `js/module/finanzen/teile.js`, `bestellen.js`: 1:1 aus
  `js/module/lager/teile.js`/`bestellen.js` übernommen (Pfade der
  Imports anpassen).
- `js/module/lager/` wird **komplett gelöscht** (Modul, Tests,
  Registrierung in `js/app.js`). Die `parts`-Tabelle in Supabase bleibt
  unverändert (nur der Zugriff wandert).
- `kontostand.js` (Tab) zeigt zusätzlich die neue Kennzahl.

## 6. Ausbildung (=Berichtsheft)

Keine funktionale Änderung. Nur: `titel: 'Ausbildung'` statt
`'Berichtsheft'` in `js/module/berichtsheft/index.js`, neues `icon`
(Doktorhut, wie im vorigen Redesign schon für Berichtsheft-Einträge
verwendet). "Fortschritt"-Anzeige (optional, an bestehende Optik
angelehnt): Text `"Ausbildungsjahr {ausbildungsjahr()}"`, keine
Prozent-/Fortschrittsbalken-Erfindung.

## 7. Neues Modul "Suche"

`js/module/suche/`:
- `index.js` – `registriere({ id:'suche', titel:'Suche', icon, init })`.
- `daten.js` – lädt dieselben drei Quellen wie Home
  (finanzen/todos/sendungen `ladeAlles()`).
- `berechnung.js` – reine Funktion `sucheAlles(zustand, suchtext)`:
  filtert `expenses` (nach `notiz`), `todos` (nach `text`), `sendungen`
  (nach `haendler`), `termine` (nach `titel`) case-insensitiv auf
  Teilstring-Treffer, gibt eine geordnete Trefferliste
  `{ typ, id, titel, ziel }` zurück (`ziel` = Hash-Route zum Springen,
  z. B. `#/sendungen/pakete`). Testbar mit `node:test` (kein Netz/DOM).
- Anzeige: Eingabefeld, Live-Filterung bei Eingabe (kein Absenden
  nötig), Trefferliste mit Sprung-Links.

## 8. Neues Modul "Profil"

`js/module/profil/`:
- `index.js` – `registriere({ id:'profil', titel:'Profil', icon,
  init })`.
- Kein `daten.js` nötig – nutzt `holeSession()` (bereits in `js/auth.js`)
  für die E-Mail-Adresse.
- Anzeige: E-Mail-Adresse, Button "Abmelden" (ruft `meldeAb()` aus
  `js/auth.js`, wie bisher der globale Logout-Button), ein Hinweistext,
  dass der Hell/Dunkel-Umschalter oben im Header zu finden ist (kein
  neuer Toggle in Profil).
- Der bisherige globale Header-Logout-Button (`#logout` in
  `index.html`) entfällt, Abmelden ist ab jetzt nur noch über den
  Profil-Screen erreichbar (passt zum Prototyp-Muster). Theme-Toggle
  und Passkey-Button bleiben im Header, wie bisher.

## 9. Definition of Done

- [ ] Bottom-Nav zeigt genau Home/Finanzen/Ausbildung/Suche/Profil, in
      dieser Reihenfolge.
- [ ] Ernährung/To-dos/Sendungen weiterhin per Hash erreichbar, aber
      nicht in der Bottom-Nav.
- [ ] `js/module/lager/` entfernt, Teile/Bestellen als Tabs in Finanzen
      funktionsfähig, `parts`-Daten unverändert nutzbar.
- [ ] Finanzen zeigt echten UND unechten Kontostand.
- [ ] Home zeigt Kontostand-Karte, Termine-, Sendungen- und
      To-dos-Vorschau mit funktionierenden "Alle anzeigen"-Links.
- [ ] Suche findet echte Treffer über alle vier Datenquellen und
      verlinkt korrekt weiter.
- [ ] Profil zeigt E-Mail, Abmelden funktioniert.
- [ ] Alle bisherigen + neuen `node:test`-Tests grün (insbesondere
      `unechterKontostand`, `sucheAlles`).
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert.

## 10. Bewusst NICHT in dieser Etappe

- Kalender-Feature (eigene, spätere Bewertung).
- Fix für "eine Sendung erzeugt mehrere Zeilen" in der
  E-Mail-Automatisierung (eigener Bug-Fix, siehe Abschnitt 2).
- Erzwungenes Dunkel-Theme als Standard.
- Neue Einstellungen-Unterseite (Toggles aus dem Prototyp).
- Ernährung-Modul löschen (nur aus der Nav entfernt).
