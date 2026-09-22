# Etappe 4, Sub-Etappe S: Design-/Performance-Verfeinerung

## 0. Herkunft und Einordnung

Nach Abschluss von Sub-Etappe R (UI-Politur) hat Mark eine größere,
zweite Verfeinerungsrunde gewünscht — diesmal nicht mehr "Bugs
beheben", sondern ein echtes visuelles und wahrnehmbares
Performance-Upgrade. Ausgelöst durch eigenes Nutzungsgefühl ("fühlt
sich langsam an", "Design gefällt mir noch nicht") und zwei
Bildquellen: den bestehenden Prototyp
(`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`)
sowie fünf neue, feinere Referenz-Mockups (nur als Chat-Screenshots
vorhanden, hier textlich beschrieben, s. Abschnitt 6). Eingeordnet als
**Sub-Etappe S** im Backlog (nach R, vor N — s. `CLAUDE.md`).

Bounded-Brainstorming ist hier nicht ausreichend: die
Performance-Architektur (Service Worker + Stale-while-revalidate) ist
ein neues Subsystem, das app-weite Design-Politur betrifft nahezu jede
Datei im Projekt. Deshalb architektonischer Pfad mit dieser Spec.

## 1. Ziele

1. Die App soll sich beim Öffnen (Home-Bildschirm-Icon) und beim
   Navigieren zwischen Screens **sofort** anfühlen, nicht wie ein
   Web-Reload.
2. Übergänge zwischen Screens/Tabs sollen **sanft eingeblendet**
   erscheinen statt abrupt zu wechseln — kein Ladebalken.
3. Die Akzentfarbe (aktuell iOS-Blau `#0A84FF`) weicht einem
   neutralen Schwarz/Weiß-Pillen-Look, konsistent mit dem, wie der
   Prototyp aktive Zustände tatsächlich darstellt.
4. Die Finanzen-Startseite (Übersicht-Tab) wird zur zentralen,
   scrollbaren Seite mit weniger, aber informativeren Elementen.
5. Durchgängige visuelle Politur: individuelle Icons statt generischer
   Platzhalter-Icons, Status als schlanker Punkt statt grauer Pille,
   weniger sichtbare Rahmen/Grautöne, konsistente Tab-Pillen-Optik.
6. Ein struktureller Layout-Fehler aus Sub-Etappe R (Leerraum oben bei
   Finanzen/Todos/Ernährung/Sendungen/Ausbildung) wird behoben.

**Explizit NICHT Teil dieser Etappe** (im Brainstorming erwogen, dann
verworfen): eine Wisch-Geste zum Zurücknavigieren. Die bestehenden
Zurück-Buttons bleiben die einzige Navigationsmethode, bekommen aber
ein schlankeres Aussehen (Abschnitt 5).

## 2. Performance-Architektur

### 2.1 Service Worker für das App-Gerüst

Neue Datei `sw.js` im Repo-Wurzelverzeichnis, registriert in `js/app.js`
beim Start (`navigator.serviceWorker.register('./sw.js')`, mit
Feature-Check — Service Worker sind in alten Browsern nicht verfügbar,
darf den App-Start nicht blockieren, falls nicht unterstützt).

- **Cache-Strategie:** Cache-first für alle statischen, selbst
  gehosteten Dateien (`index.html`, `app.css`, alle `js/**/*.js`,
  `manifest.webmanifest`, `icon.svg`). Cross-Origin-Requests (Supabase
  API unter `vogztxoaqbnuciboughd.supabase.co`, jsDelivr-CDN für
  `supabase-js`) werden vom Service Worker **nicht** abgefangen —
  `fetch`-Handler prüft `event.request.url`-Origin und lässt
  Cross-Origin-Requests unverändert ans Netz durch.
- **Cache-Versionierung:** `CACHE_NAME = 'mein-dashboard-v1'` (Version
  bei jeder Struktur-Änderung des Caches manuell hochzählen — kein
  automatisches Build-Tooling in diesem Projekt). Im `activate`-Event
  alle Caches löschen, deren Name nicht dem aktuellen `CACHE_NAME`
  entspricht, damit alte Versionen nicht ewig Speicher belegen.
- **Update-Verhalten:** Browser prüfen Service-Worker-Updates
  automatisch bei jedem Seitenaufruf; ein neuer Service Worker
  aktiviert sich nach Standard-Verhalten erst nach einem erneuten
  vollständigen Laden aller offenen Tabs (kein `skipWaiting()`/
  `clients.claim()` — bewusst konservativ, verhindert einen halb
  aktualisierten Zustand während der Nutzer in der App ist).

### 2.2 Stale-while-revalidate für Modul-Daten

Aktuell (Problem, verifiziert im Code): `js/app.js`s `oeffneModul()`
ruft bei jedem Modul-Wechsel `modul.init(container)` neu auf, und
praktisch jedes Modul beginnt seine `init`-Funktion mit einem
blockierenden `await ladeZustand()` (voller Supabase-Reload), bevor
überhaupt etwas gerendert wird — daher die spürbare Verzögerung bei
jeder Navigation, auch wenn man Sekunden zuvor schon auf demselben
Modul war.

**Neues Muster, pro betroffenem Modul** (`home`, `finanzen`, `todos`,
`ernaehrung`, `sendungen`, `berichtsheft`, `suche` — überall wo
`ladeAlles()`/vergleichbares existiert):

```js
let zustand = null; // bestehende Modul-Variable, bleibt ueber Modul-Wechsel hinweg erhalten (Modul-Datei wird nur einmal importiert)

async function init(container) {
  containerRef = container;
  if (zustand) {
    render(container); // sofort mit alten Daten zeichnen, kein Warten
  }
  const frisch = await ladeAlles(); // Netzwerk-Aufruf im Hintergrund
  zustand = frisch;
  if (containerRef === container && containerRef.isConnected) {
    render(container); // still, ohne Ladeanzeige, mit aktuellen Daten neu zeichnen
  }
}
```

Der Unterschied zu heute: `render()` wird **zweimal** aufgerufen, wenn
bereits alte Daten vorhanden sind (sofort mit alt, dann still mit
neu) — beim allerersten Aufruf eines Moduls in der Session (kein alter
`zustand`) bleibt es wie bisher bei einem Ladeplatzhalter, da noch
nichts zum sofortigen Anzeigen da ist.

**Wichtig:** das gilt für den Wechsel *zwischen* Modulen (Home →
Finanzen → Home). Innerhalb eines Moduls (z. B. Finanzen-Tab-Wechsel)
ist bereits durch den gemeinsamen `zustand` in `finanzen/index.js`
nichts zu tun — dort liegt kein Netzwerk-Problem vor, nur das
fehlende Übergangs-Gefühl (s. Abschnitt 3).

## 3. Sanfte Übergänge, kein Ladebalken

Sub-Etappe R hat für den Finanzen-Tab-Wechsel bereits eine
Fade-in-Animation eingeführt (`#tab-inhalt.tab-wechsel` +
`@keyframes tab-inhalt-einblenden`). Diese Muster wird
**verallgemeinert**:

- Neue, wiederverwendbare CSS-Klasse `.einblenden` (ersetzt/ergänzt das
  Finanzen-spezifische `.tab-wechsel`) mit derselben Keyframe-Animation,
  in `app.css` an zentraler Stelle definiert.
- Angewendet überall, wo ein Container per `innerHTML` neu befüllt
  wird und sich für den Nutzer wie ein "neuer Screen" anfühlt:
  Modul-Wechsel (`js/app.js`s `modulDetail`), Finanzen-Tab-Wechsel
  (bereits vorhanden, nur Klassenname vereinheitlichen), Detail-Screens
  (Sendung/Termin/Todo/Transaktion/Kategorie-Detail).
- Kein Lade-Spinner/-Balken. Der bestehende `<p class="lade">Lädt
  …</p>`-Text bleibt nur für den echten Erstlade-Fall (kein
  `zustand` im Speicher vorhanden, s. Abschnitt 2.2) — im
  Normalfall (Daten schon im Speicher) taucht er praktisch nie mehr
  auf.

## 4. Farbschema: weg von Blau

`--akzent: #0A84FF` (dunkel) / `#0A84FF` (hell) wird durch das
Schwarz/Weiß-Pillen-Prinzip ersetzt, das der Prototyp für aktive
Zustände tatsächlich nutzt (`--blue` kommt dort nur für die
"unterwegs"-Sendungsstatus-Markierung vor, nicht als UI-Akzent).

- `button { background: var(--akzent); ... }` (Basis-Button-Stil,
  aktuell blau — u. a. Login-Submit, "Bezahlt"-Buttons) wird zu
  `background: var(--text); color: var(--bg);` (invertierte Pille,
  exakt wie `.range.aktiv`/`.tab-leiste button.aktiv` das schon
  machen).
- `--akzent`-Variable bleibt als Name bestehen (an vielen Stellen
  referenziert), ihr Wert wird aber neu definiert: `--akzent: var(--text)`
  in beiden Themes (hell: `--akzent: #14161A`, dunkel: `--akzent:
  #ffffff`) — dadurch ändert sich die Farbe überall automatisch mit,
  ohne jede Fundstelle einzeln anzufassen.
- `.fortschritt-ring` (Ausbildungsfortschritt, Ernährungs-Quote) nutzt
  `var(--akzent)` fürs `conic-gradient` — übernimmt die neue Farbe
  automatisch.
- Farbige Status-Elemente, die **bewusst** Bedeutung tragen (grün für
  Einnahmen/Erfolg, rot für Ausgaben/Fehler, gelb für "abholbereit"),
  bleiben unverändert — nur die "neutrale" Akzentfarbe verschwindet.

## 5. Struktureller Header-Fix + Zurück-Button-Politur

### 5.1 Neuladen-Button wandert in den globalen Header

Aktuell hat jedes der fünf Module mit eigener Tab-Leiste (Finanzen,
Todos, Ernährung, Sendungen, Berichtsheft) noch eine fast leere
`.modul-kopf`-Zeile mit nur dem `⟳`-Neuladen-Button (Rest wurde in
Sub-Etappe R entfernt) — das kostet unnötig vertikalen Platz.

- `index.html`s globaler Header bekommt einen dritten Button neben
  `#theme-toggle-dashboard`: `<button id="neu-laden-global" type="button" title="Aktualisieren">⟳</button>`.
- `js/app.js`: neuer Klick-Handler auf `#neu-laden-global`, der das
  aktuell aktive Modul neu lädt. Da jedes Modul sein eigenes
  `ladeZustand`/`init`-Paar hat, braucht es einen generischen Hook —
  die Registry (`js/registry.js`) bekommt ein optionales
  `aktualisieren()`-Feld pro Modul (analog zu `init`), das die Module,
  die einen Neuladen-Button hatten, selbst befüllen (ruft intern ihr
  bisheriges `ladeZustand()` + Re-Render auf). `js/app.js`s Handler
  ruft `holeModul(aktivesModulId)?.aktualisieren?.()` auf — Module ohne
  `aktualisieren` (z. B. Profil) tun dann einfach nichts.
- In `finanzen/index.js`, `todos/index.js`, `ernaehrung/index.js`,
  `sendungen/index.js`, `berichtsheft/index.js`: die
  `.modul-kopf`-Zeile mit dem `.neu-laden`-Button wird komplett
  entfernt (nicht nur der Button — die ganze jetzt leere Zeile),
  `registriere({...})` bekommt das neue `aktualisieren`-Feld.
- Resultat: Inhalt (Tab-Leiste, Kacheln) rückt direkt unter den
  globalen Header, kein doppelter Kopfbereich mehr.

### 5.2 Zurück-Buttons: schlankerer Stil

Verbleibende Zurück-Buttons (Einstellungen "‹ Profil", Rechnungen
"‹ Zurück", alle `*-detail.js`-Screens) verlieren Rahmen und
Hintergrund, werden zu reinem Text/Link-Stil:

```css
.modul-kopf button, .zurueck-link {
  background: none; border: none; color: var(--gedaempft);
  padding: 4px 0; font-weight: 600;
}
```

(Ersetzt die bisherige `.modul-kopf button { background: transparent;
color: var(--gedaempft); border: 1px solid var(--rand); padding: 8px
12px; }`-Regel für Zurück-Buttons. Der `⟳`-Button existiert dort ab
5.1 nicht mehr, betrifft also nur noch echte Zurück-Buttons.)

## 6. Design-Sprache: Icons, Status, Tab-Stil

Referenz: fünf vom Nutzer gezeigte Mockup-Screenshots (Einstellungen,
Rechnungen, Sendungen, Finanzen-Tableiste, Transaktionen) — nicht als
Datei im Repo abgelegt (nur Chat-Anhänge), hier textlich festgehalten:

### 6.1 Tab-Leisten-Stil (gilt für alle `.tab-leiste`-Vorkommen)

Aktuell: `.tab-leiste` hat einen grauen Hintergrund-Kasten
(`background: var(--icon-bg)`) um alle Tabs, aktive Pille sitzt darin.
Neu: kein Kasten mehr um die ganze Leiste — nur die aktive Pille selbst
hat Hintergrund/Schatten, der Rest liegt direkt auf dem Seiten-
Hintergrund (matches Mockup-Bild 4). `app.css`s `.tab-leiste`-Regel
verliert `background`/`padding`, `.tab-leiste button.aktiv` behält
ihren Pillen-Look.

### 6.2 Sendungen: individuelle Icons + Status als Punkt

`js/module/sendungen/pakete.js` (und `sendung-detail.js` für den
Status-Verlauf) nutzen aktuell immer `BOX_ICON` und einen separaten
`status-badge status-${status}`-Button rechts. Neu:

- Icon je nach `haendler`/`beschreibung`-Freitext heuristisch wählen
  (einfache Stichwort-Zuordnung, analog zu
  `kategorisiereIconTyp()`/`kategorisiereStatus()` in
  `automatisierung/klassifizieren.js` — reine Funktion, testbar):
  z. B. "iphone"/"handy" → Smartphone-Icon, "airpods"/"kopfhörer" →
  Kopfhörer-Icon, "shirt"/"hose"/"kleidung" → Kleidungs-Icon,
  "grafikkarte"/"ram"/"ssd" → Elektronik-Icon, sonst weiterhin
  `BOX_ICON` als Fallback.
- Status nicht mehr als eigener Button/Pille rechts, sondern als
  kleiner farbiger Punkt (`.status-punkt`, analog zur bereits
  bestehenden `.dot`-Klasse aus der Design-Nacharbeit, aber mit
  Statusfarbe statt `var(--text)`: grün für `zugestellt`, blau/gelb
  für `unterwegs`/`abholbereit`) direkt vor dem Statustext, inline in
  der zweiten Zeile (`<span class="status-punkt gruen"></span>
  Zugestellt`) statt als separates rechtsbündiges Element. Der
  Klick-zum-Status-weiterschalten-Mechanismus (`STATUS_ZYKLUS`) bleibt
  technisch erhalten, nur die Optik ändert sich.

### 6.3 Transaktionen: Icons je Händler/Kategorie

`js/module/finanzen/transaktionen.js` nutzt aktuell nur zwei Icons
(Einnahme-Pfeil, Ausgabe-Beleg). Neu: kleine Zuordnungstabelle
Kategorie/Freitext → spezifisches Icon (Tankstelle, Streaming,
Miete/Haus, Kleidung, Handyvertrag, Gehalt/Download-Pfeil als
Rückfall für Einnahmen ohne Treffer, Einkaufswagen als Rückfall für
Ausgaben ohne Treffer) — selbe Technik wie 6.2, eigene kleine reine
Zuordnungsfunktion in `js/module/finanzen/berechnung.js` (testbar,
projekteigene Konvention).

### 6.4 Einstellungen: Reihenfolge/Gruppierung

`js/module/einstellungen/index.js` behält seine fünf Abschnitte
(Darstellung, Benachrichtigungen, Verbundene Dienste, Sicherheit, App)
— das entspricht bereits dem Mockup. Keine inhaltliche Änderung nötig
außer der allgemeinen visuellen Politur (Abschnitt 6.1/6.5). Die
"Sicherheit"-Zeile bleibt **"Passkey"** benannt (Nutzer-Entscheidung:
"erstmal nur Passkey", kein Umbenennen zu "Face ID/Touch ID", kein
zusätzlicher "Passcode"-Deko-Platzhalter).

### 6.5 Allgemein: weniger Grau

`--rand`/`--gedaempft`-lastige Bereiche (Rahmen um Karten, gedämpfte
Sekundärtexte) werden nicht komplett entfernt (Struktur muss erkennbar
bleiben), aber wo aktuell zusätzlich noch Rahmen **und** Schatten
**und** Hintergrund kombiniert werden, wird auf das jeweils
notwendige Minimum reduziert — konkrete Einzelfälle werden beim
Schreiben des Implementierungsplans anhand der tatsächlichen
`app.css`-Regeln identifiziert, kein pauschaler Blindumbau.

## 7. Finanzen-Übersicht: Neustruktur

### 7.1 Tab-Leiste

Von aktuell 11 auf 6 Tabs, in dieser Reihenfolge: **Übersicht,
Transaktionen, Analyse, Regelmäßige Ausgaben, Teile, Bestellen.**
`Ausgaben`, `Einnahmen`, `Kontostand`, `Konten`, `Schulden` verschwinden
als eigene Tabs — ihre Funktionalität wandert in die Übersicht (7.2).
`js/module/finanzen/index.js`s `TABS`-Array und `LADER`-Objekt werden
entsprechend gekürzt; die fünf verschwindenden `zeige*`-Dateien
(`ausgaben.js`, `einnahmen.js`, `kontostand.js`, `konten.js`,
`schulden.js`) werden **nicht gelöscht**, sondern zu Detail-Ansichten
umgewidmet, die von den drei neuen Kacheln (7.2) aus per Hash-Route
erreichbar bleiben (z. B. `#/finanzen/uebersicht/einnahmen-ausgaben`,
`#/finanzen/uebersicht/konten`, `#/finanzen/uebersicht/schulden`) —
spart Implementierungsaufwand, die bestehenden Formulare/Listen bleiben
funktional erhalten, nur die Erreichbarkeit ändert sich.

### 7.2 Neuer Aufbau von `zeigeUebersicht`

Von oben nach unten:

1. **Kontostand-Karte** (bestehende `.stat-karte.gross`, Klick führt
   weiterhin zum bereits existierenden Kontostand-Detail-Screen unter
   `#/home/kontostand`): zeigt zwei getrennte Zahlen statt einer
   Zahl mit "inkl. Warenwert"-Unterzeile:
   - **"Kontostand"** — `gesamtKontostand()` (reines Bankguthaben,
     unverändert).
   - **"Warenwert"** — `warenwert(zustand.teile)` (aus
     `finanzen/berechnung.js`, bereits vorhanden, bisher nur indirekt
     über `unechterGesamtKontostand` eingerechnet — jetzt als eigene,
     zweite Zahl direkt sichtbar statt versteckt in einer
     Kombi-Summe).
   - Die bisherigen Labels "echt"/"unecht" fallen komplett weg.
2. **Kreisdiagramm** "Ausgaben nach Kategorie" — neue, reine
   Berechnungsfunktion in `berechnung.js` (liefert Kategorie + Prozent
   + Farbe, aufbauend auf dem bereits vorhandenen `prozent`-Feld aus
   `summenProKategorieZeitraum`), gerendert als SVG-`<circle>`-
   `stroke-dasharray`-Ringdiagramm (kein Chart-Framework, Projekt bleibt
   abhängigkeitsfrei — dasselbe Prinzip wie der bestehende
   `.fortschritt-ring`, nur mit mehreren farbigen Segmenten statt
   einem).
3. **3 Kacheln** (statt der bisherigen einzelnen Einnahmen/Ausgaben/
   Kontostand/Konten/Schulden-Listenzeilen):
   - **Einnahmen & Ausgaben** — kombinierte Kachel, zeigt
     Gesamt-Einnahmen/-Ausgaben des aktuellen Zeitraums, Klick öffnet
     Detailansicht mit beidem (ersetzt die bisher getrennten
     `einnahmen.js`/`ausgaben.js`-Tabs als eine gemeinsame
     Detailansicht — die dort vorhandenen Formulare/Vorlagen bleiben
     erhalten).
   - **Konten** — zeigt Anzahl Konten + Gesamtsumme, Klick öffnet die
     bestehende Konten-Detailansicht (Einzelkontostände,
     Anlegen-Formular — Funktionalität aus `konten.js` unverändert,
     nur andere Erreichbarkeit).
   - **Schulden** — zeigt offene Schulden-Summe, Klick öffnet die
     bestehende Schulden-Detailansicht (`schulden.js`-Funktionalität
     unverändert).

### 7.3 Bugfix: 7T-Range-Button-Navigation

Verifizierter Bug: die Zeitraum-Buttons (`data-range`) liegen aktuell
innerhalb der Kontostand-Karte, die selbst einen
Klick-Handler zu `#/home/kontostand` hat — ein Klick auf z. B. "7T"
bubbelt hoch und löst zusätzlich die Navigation aus. Fix:
`event.stopPropagation()` im Range-Button-Click-Handler (gleiches
Grundmuster wie der Checkbox-Fix aus Sub-Etappe E+F). Gilt für die
neue wie auch jede zukünftige Karte mit verschachtelten klickbaren
Elementen.

## 8. Nicht-Ziele / Abgrenzung

- Keine Wisch-Geste zum Zurücknavigieren (erwogen, verworfen).
- Kein Chart-Framework/keine neue Abhängigkeit — alle Diagramme
  (Kreisdiagramm, bestehender 6-Monats-Balken) bleiben handgebautes
  SVG/CSS, projekteigene Konvention (kein Framework, kein Build-
  Schritt).
- Face-ID/Touch-ID-Umbenennung und Passcode-Deko-Platzhalter: nicht
  Teil dieser Etappe (Nutzer-Entscheidung, s. 6.4).
- Rechnungen- und Einstellungen-Screens bekommen nur die allgemeine
  visuelle Politur (Abschnitt 6.1/6.5), keine Struktur-Änderung — sie
  entsprechen inhaltlich schon weitgehend den Mockups.

## 9. Offene technische Entscheidungen für den Implementierungsplan

(Bewusst hier nicht final festgelegt, da Detailarbeit für die
Plan-Phase — Spec beschreibt das Was/Warum, nicht jede Codezeile:)

- Exakte Stichwortliste für die Icon-Heuristiken (6.2/6.3).
- Exakte Kreisdiagramm-Farbpalette pro Kategorie (freizeit/essen/auto/
  sonstiges — vermutlich Wiederverwendung der bereits bestehenden
  `--hm-*`-Farbvariablen plus 1-2 neuen Tönen, falls mehr als 4
  Kategorien gleichzeitig sichtbar sein müssen).
- Ob `aktualisieren()` (5.1) als eigenes Registry-Feld oder als
  Konvention (`modul.aktualisieren` optional) sauberer ins bestehende
  `js/module/README.md`-Interface-Dokument passt.
