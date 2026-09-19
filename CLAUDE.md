# Mein Dashboard

**Ablage:** `C:\Users\PC\Projekte\mein-dashboard` (alle Projekte liegen unter
`C:\Users\PC\Projekte\<projektname>` – siehe Skill `projekt-workflow`).

## Zweck

Private Web-App für Mark, aufrufbar auf jedem Gerät im Browser (iPhone: "Zum
Home-Bildschirm"). Bündelt Lebensbereiche als Module: Ernährung (zuerst), dann
To-dos, Finanzen, Lager/Ersatzteile. Daten in Supabase. Mark trägt selbst ein
oder bittet Claude, Einträge in Supabase zu machen; das Dashboard zeigt sie an.
**Navigation seit Etappe 8 v2:** feste Bottom-Nav Home/Finanzen/Ausbildung/
Suche/Profil statt einem Icon pro Modul – siehe Abschnitt "Aufbau" und "Nav"
unten für Details.

## Wo weiterlesen

- **Verlauf / warum was so ist:** `docs/PROJEKT-LOG.md` (neueste Einträge oben).
- **Gesamtkonzept:** `docs/specs/2026-09-08-dashboard-konzept.md`.
- **Feinpläne pro Etappe:** weitere Dateien in `docs/specs/`.

## Aktueller Stand (2026-09-19) / Nächste Schritte

**Etappe 4 Teil A (Icon-Audit) ist fertig** (Commit `57b623f`). Teil B
("Finanzen-Ausbau") ist beim Brainstorming zu einem **deutlich größeren,
mehrteiligen Vorhaben angewachsen** (Nutzerwunsch: echte
Einnahmen-Erfassung, Detail-Klicks überall, neues Rechnungen-Modul,
Design-Angleichung weiterer Screens, mehr Einstellungen). Zu groß für
einen Spec — deshalb in **Sub-Etappen A–G** zerlegt (Reihenfolge vom
Nutzer am 2026-09-19 bestätigt, **noch keine einzige davon spezifiziert
oder gebaut**):

- **A) Konten-, Einnahmen- & Schulden-Grundlage** (Fundament, als
  Nächstes dran — Umfang am 2026-09-19 gegenüber der ursprünglichen
  Idee "nur Einnahmen" nochmal deutlich gewachsen):
  - **Einnahmen:** neue Tabelle `einnahmen` + `einnahmen_vorlagen`
    (wiederkehrende Beträge, Nutzer nannte 380 €/750 € als Beispiele,
    z. B. Ausbildungsvergütung), Erfassung per App-Formular **und** per
    Chat-Diktat (wie bei Ausgaben/Berichtsheft). Datenmodell-Ansatz vom
    Nutzer bestätigt: **eigene Tabelle** (nicht die bestehende
    `expenses`-Tabelle um ein `art`-Feld erweitern), um den bestehenden
    Ausgaben-Code nicht anzufassen.
  - **Mehrkonten (neu, 2026-09-19):** statt einem einzelnen
    `kontostand_start`/`stand_datum` in `finance_settings` gibt es eine
    neue Tabelle `konten` (z. B. "Hauptkonto"/Girokonto, "Trade
    Republic", "Volksbank", je eigener `kontostand_start` +
    `stand_datum`). `expenses` und `einnahmen` bekommen ein optionales
    `konto_id`-Feld (Default = Hauptkonto) — die meisten Buchungen
    laufen laut Nutzer sowieso nur über das eine Hauptkonto, Nebenkonten
    (z. B. Trade Republic) können entweder auch Buchungen zugeordnet
    bekommen oder einfach nur gelegentlich manuell auf einen neuen Stand
    gesetzt werden (wie bisher `setzeKontostandStart`, nur pro Konto).
    Drei Kontostand-Sichten gewünscht: **Gesamt-Kontostand** (Summe
    aller Konten), **"echter"/unechter Kontostand inkl. Gerätewert**
    (bestehendes `unechterKontostand`-Konzept, jetzt auf die
    Konten-Summe angewendet), **einzelne Konten** mit ihren jeweiligen
    Transaktionen (neuer "Konten"-Tab/Screen in Finanzen). Die
    Übersicht in Finanzen zeigt weiterhin nur den einen
    Gesamt-Kontostand, Detail-Aufschlüsselung nach Konto gibt es dann
    im neuen Konten-Bereich.
  - **Schulden (neu, 2026-09-19):** neue Tabelle `schulden` (Person,
    Gesamtbetrag, Richtung: ich-schulde/mir-wird-geschuldet, Notiz,
    Status) **plus Teilzahlungen/Verlauf** (eigene Tabelle
    `schulden_zahlungen`: schuld_id, Betrag, Datum) — Restbetrag =
    Gesamtbetrag minus Summe der Zahlungen, nicht nur offen/beglichen.
  - `kontostand()`-Formeln werden entsprechend erweitert (bisher nur
    `start − Ausgaben` für ein Konto).
- **B) Finanzen-Redesign** — Tabs Übersicht/Transaktionen/Analyse nach
  Prototyp (`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`),
  jetzt mit **echten Einnahmen UND Ausgaben** (nicht nur Ausgaben wie
  ursprünglich angenommen). Zeitraum-Filter (7T/30T/3M/6M/1J) wirken
  **gemeinsam** auf Übersicht- und Transaktionen-Tab (echte Filterung,
  keine neue Tabelle). Analyse-Tab: Balkendiagramm Einnahmen/Ausgaben
  über mehrere Monate + Kategorien-Aufschlüsselung (inkl.
  Einnahmequellen wie "Handyreparaturen") + Jahresübersicht/Sparquote
  (neuer Vorschlag, vom Nutzer angenommen). Bestehender Kontostand-Tab
  **bleibt zusätzlich** in der Tab-Leiste (nicht ersetzt). Separater
  **Kontostand-Detail-Screen** von Home aus (Klick auf Kontostand-Karte):
  Prototyp-Balance-Karte (Augen-Icon zum Ausblenden, Sparkline) **plus**
  Warenwert-Zeile. "Abos"-Tab wird zu **"Regelmäßige Ausgaben"**: echte
  `ausgaben_vorlagen`-Tabelle (analog zu `einnahmen_vorlagen`) zusätzlich
  zur bisherigen automatischen Muster-Erkennung (`erkenneAbos` bleibt
  als Vorschlag). Dazu: CSV-Export für Einnahmen/Ausgaben.
- **C) Detail-Klicks überall** — Sendungen (inkl. `abholcode`/
  `abholadresse`/`abholzeiten`, die die E-Mail-Automatisierung seit
  Etappe 3 schon erfasst, aber bisher nirgends anzeigt), Termine,
  To-dos, Transaktionen (Einnahmen/Ausgaben) werden anklickbar und
  zeigen eine Detailansicht. Nutzer-Motivation: **Zeitersparnis**, z. B.
  Abholcode sehen ohne die E-Mail selbst suchen zu müssen. Deckt auch
  das alte "Teil D" (Sendungen-Detail) mit ab.
- **D) Neues Rechnungen-Modul** — komplett neu (kein bisheriges
  Datenmodell): offen/bezahlt/überfällig mit Filter-Chips (Vorbild:
  Prototyp-Screen "Rechnungen"), plus Fälligkeits-Erinnerungen auf dem
  Home-Screen.
- **E) Design-Angleichung an Prototyp** — Profil-, Suche- (inkl.
  Schnelleinstiege + Letzte Suchen) und Ausbildung-Screen sollen 1:1 wie
  im Prototyp aussehen/funktionieren (deckt auch das alte "Teil C"
  Suche-Ausbau ab).
- **F) Einstellungen ausbauen** — bisher gibt es nur Theme-Umschalter +
  Profil-Menü, kein echter Einstellungen-Screen. Neu: Schriftgröße
  (CSS-Skalierungsfaktor), "Alle Daten exportieren"-Button (JSON-Backup
  aller Module) — Annahme, mit Nutzer beim Start dieser Sub-Etappe kurz
  gegenchecken, da nicht 100 % explizit bestätigt.
- **G) Google Drive** — erst ein **Spike** (Machbarkeits-Check: Supabase
  unterstützt Google als Auth-Provider, aber Datei-Zugriff auf Drive ist
  ein eigenes Google-API-Thema mit eigenen Zugangsdaten), bevor fest
  eingeplant wird.
- **H) KI-Fortschritts-Anzeige + Wächter-System** (ganz ans Ende gestellt,
  2026-09-19) — technisch anders als der Rest (braucht eine Brücke
  zwischen Claude-Code-Sessions auf dem Rechner und der Browser-App,
  z. B. per Hook, der Status nach Supabase schreibt): Live-Fortschritt
  in 5%-Schritten + Zeitschätzung für laufende Claude-Aufgaben, Erkennung
  "arbeitet KI gerade", Projekt-Übersicht im Dashboard. **Wächter**: (1)
  während größerer Bauvorhaben laufend nach Bugs/Fehlern suchen und
  schnell beheben, (2) erkennen, wenn eine **Cloud-Claude-Session**
  (claude.ai/code) hängt/abbricht, kurzen Status-Text schreiben und die
  Session fortsetzen. Erst eigener Spike nötig, bevor Design.
- **I) Wetter-Widget** — öffentliche Wetter-API (kein Konto nötig),
  einfach, auf Home.
- **J) eBay-Nachrichten sehen + beantworten** — braucht eBay-
  Entwicklerkonto + OAuth + Messaging-API, eigener Spike wie bei G.
- **K) Geräte-übergreifender Datei-Austausch via Supabase Storage** —
  Hochladen auf einem Gerät, Abrufen auf dem anderen. **Wichtig:**
  Bluetooth/Offline-Übertragung ist mit einer Web-App technisch nicht
  möglich (Web Bluetooth fehlt in iOS Safari komplett) — für echtes
  Offline-Teilen bleibt AirDrop/Nearby Share (bereits vorhanden, nichts
  zu bauen), Supabase Storage deckt den Fall "beide Geräte haben
  irgendeine Internetverbindung" ab.
- **L) Geräte-Verwaltung/-Freigabe** — eigene Sicherheits-Logik (Supabase
  liefert das nicht von Haus aus): angemeldete Geräte sehen, neue Geräte
  erst nach Bestätigung auf einem bereits eingeloggten Gerät freischalten.
- **M) Eigener Kalender & Notizen** (ersetzt "Ausbildung" als Bottom-Nav-
  Punkt; Ausbildung bleibt als Modul normal bestehen, nur nicht mehr in
  der festen Nav-Leiste — analog dazu, wie Ernährung/To-dos/Sendungen
  seit Etappe 8 v2 schon nur per Hash erreichbar sind): eigener
  Kalender-Bereich mit Erinnerungen im Home-Bereich. Datenquellen:
  E-Mails (Termine-Erkennung existiert in der Automatisierung schon
  teilweise seit Etappe 6, hier ausbauen), **Apple-Kalender** und
  **Apple-Erinnerungen** aus iCloud — technisch machbar über **CalDAV**
  (Apple unterstützt das mit App-spezifischem Passwort, ähnliches Muster
  wie der bestehende GMX-IMAP-Zugriff in `automatisierung/`; Erinnerungen
  laufen über dieselbe CalDAV-Verbindung als VTODO-Objekte) — realistisch
  machbar, aber eigene Spec/Spike wert, da neue Technologie fürs Projekt.
  Dazu **Notizen**: eigenes Notiz-Feature, auffindbar auch über Suche
  ("auf Notizen klicken → Erinnerungen/Notizen einspeichern").
- **N) Handyreparatur-Aufträge** — Kunde/Gerät/Problem/Preis/Status
  (offen/fertig/abgeholt), erzeugt bei "abgeholt" automatisch eine
  Einnahme (Tabelle `einnahmen`, Item A). Ideen-Ergänzung 2026-09-19:
  Abholdatum eines Auftrags könnte automatisch einen Kalender-Termin/
  Erinnerung erzeugen (Verknüpfung mit Item M).
- **O) Teile-Bestellen ↔ Sendungen verknüpfen** — Sendung "zugestellt" →
  Vorschlag, zugehöriges Teil im Lager auf Status "da" zu setzen.
- **P) Kalender-Export (ICS)** für Termine/Ausbildung, damit sie auch im
  iPhone-/Google-Kalender auftauchen — Gegenrichtung zu Item M (M holt
  externe Termine rein, P schickt interne Termine raus).
- **Q) Projekte-Übersicht** (neu, 2026-09-19) — eigener Bereich im
  Dashboard, der alle Projekte unter `C:\Users\PC\Projekte\<name>`
  auflistet und pro Projekt den Inhalt von dessen `CLAUDE.md` anzeigt
  (damit sowohl Mark als auch Claude jederzeit den Stand jedes Projekts
  sehen können). Technisch nötig: GitHub Pages kann nicht lokal auf die
  Festplatte zugreifen — braucht einen lokalen Sync-Schritt (Skript,
  ähnliches Muster wie `automatisierung/postfach-scan.mjs`), der die
  `CLAUDE.md`-Inhalte aller Projekte periodisch nach Supabase schreibt,
  von dort zeigt die App sie an. War schon mal als "Projekte"-Kachel in
  einem früheren Plan einer anderen Session angedacht (siehe
  `docs/superpowers/specs/2026-09-16-etappe-6-8-automatisierung-auth-redesign-design.md`),
  aber nie gebaut — jetzt explizit erneut bestätigt.

**Wichtige Arbeitsweise-Regel ab 2026-09-19 (Prototyp-Phase):** Diese
gesamte Backlog-Abarbeitung (A–Q) wird bewusst als **Prototyp**
behandelt, kein sauberer Endzustand. Jeden Coding-Schritt beim Umsetzen
dokumentieren — **auch Fehler im Code und Ansätze, die nicht
funktioniert haben**, nicht nur das Endergebnis. Grund: Mark erwartet,
danach vieles zu ändern/Fehler zu finden, und will die Doku (inkl.
Fehler-Historie) später nutzen, um mit einem einzigen guten Plan einen
sauberen Neuaufbau zu machen.

**Weiterhin unverändert offen** (nicht Teil dieser Sub-Etappen-Liste):
echte PNG-Icons (192/512, `apple-touch-icon`, seit Etappe 0), kompletter
manueller Testlauf am echten Gerät (seit Etappe 2–5).

**Nächster Schritt beim Fortsetzen:** Sub-Etappe A ist fertig
durchgeplant, Spec geschrieben:
`docs/superpowers/specs/2026-09-19-etappe-4-sub-a-konten-einnahmen-schulden-design.md`.
**Steht noch aus:** Nutzer-Review dieses Spec-Files, danach
`writing-plans` nur für Sub-Etappe A, dann Umsetzung. Jede weitere
Sub-Etappe (B–Q) bekommt danach ihren eigenen
Brainstorming→Spec→Plan→Umsetzung-Zyklus, nicht alles auf einmal.

**Muster für alle Etappen dieser Session** (bei Fortsetzung beibehalten,
falls nicht anders gesagt): `superpowers:brainstorming` →
`superpowers:writing-plans` → `superpowers:subagent-driven-development`,
direkt auf `main` (kein Feature-Branch, Nutzer-Entscheidung), nach jeder
Task/jedem Meilenstein `git push origin main` (Controller pusht selbst,
nicht der Nutzer). Nach jeder fertigen (Sub-)Etappe: `docs/PROJEKT-LOG.md`
+ `CLAUDE.md` aktualisieren.

## Aufbau (Stand Etappe 8 v2 – Navigations-Redesign + Optik-Addendum nach Marks Prototyp)

- `index.html` – App-Hülle: Login-Ansicht + Dashboard-Ansicht mit fester
  Tab-Leiste unten. **Kein globaler Logout-Button mehr** (`#logout` entfernt
  seit Etappe 8 v2) – Abmelden läuft nur noch über den Profil-Screen.
- `app.css` – gemeinsames Design-Token-System (`:root`-CSS-Variablen, hell +
  dunkel), Quelle seit Etappe 8 v2: **Marks eigener Prototyp**
  (`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`), 1:1
  übernommen (nicht mehr das ältere Pixelanalyse-Redesign). Dunkel:
  `--bg:#000000`, `--karte:#0A0A0B`, `--karte-getoent:#0D0D0F`,
  `--text:#fff`, `--akzent:#0A84FF` (iOS-Blau). Hell: `--bg:#F7F8FA`,
  `--karte:#fff`, `--text:#14161A`. Gemeinsam für beide Themes:
  `--radius:16px`, `--schatten` (Box-Shadow-Token), `--nav-bg`
  (halbtransparent + `backdrop-filter: blur(10px)` für die Bottom-Nav),
  getönte Hintergründe `--hm-rot-bg`/`--hm-gruen-bg`/`--akzent-bg`. Default
  folgt Systemeinstellung (`prefers-color-scheme`), überschreibbar über
  `js/theme.js` (`data-theme`-Attribut auf `<html>`, Wahl landet in
  `localStorage`) – **kein** erzwungenes Dunkel-Theme, obwohl der Prototyp
  selbst dunkel als Standard hat. Icon-Karten-Designsprache (gilt für alle
  Module automatisch, da alle dieselben Klassen nutzen): `.icon-badge`
  (rund, neutral, `--icon-bg`/`--icon-farbe`), `.stat-karte`/`.stat-karte.gross`
  (große Übersichtskarten, `.gross` nutzt `--karte-getoent`),
  `.stat-grid`/`.stat` (3er-Raster für Mini-Kennzahlen, Home), `.tab-leiste`
  als Pillen-Segmented-Control (aktiv = dunkle Pille `--pille-bg`),
  `.avatar` (Kreis mit Anfangsbuchstabe, Profil).
- `js/app.js` – Einstieg: verdrahtet Auth, Routing, Registry, Tab-Leiste unten
  und Detail-Routing (`#/modul/unterseite`) mit dem DOM. **Seit Etappe 8 v2:**
  feste Nav-Liste `NAV_MODULE = ['home', 'finanzen', 'berichtsheft', 'suche',
  'profil']` – die Bottom-Nav wird aus dieser Liste gerendert, **nicht** mehr
  automatisch aus allen registrierten Modulen (`alleModule()`). Ohne Hash
  öffnet die App `holeModul('home')`. Ernährung/To-dos/Sendungen sind
  weiterhin über `registriere()` registriert und per Hash erreichbar
  (`#/ernaehrung`, `#/todos`, `#/sendungen`), tauchen aber nicht in
  `NAV_MODULE` auf, haben also keinen eigenen Bottom-Nav-Punkt mehr.
- `js/router.js` – `parseHash('#/modul/unterseite')` → `{ modul, unterseite }`.
- `js/view.js` – `entscheideAnsicht(session)` → `'login'` | `'dashboard'`.
- `js/auth.js` – Auth-Wrapper: `sendeMagicLink`, `holeSession`, `meldeAb`,
  `beiAuthWechsel` (Magic-Link) sowie `registrierePasskey`, `meldeAnMitPasskey`
  (Passkey/WebAuthn, seit 2026-09-17 – Supabase-Feature ist "Experimental",
  Magic-Link bleibt als Fallback). Passkey funktioniert nur auf der echten
  Live-Domain, nicht auf `localhost` (Relying-Party-ID ist fest auf
  `mkunau-ctrl.github.io`).
- `js/supabase.js` – Supabase-Client (Projekt-URL + Publishable-Key, öffentlich ok); `supabase-js@2.116.0` per jsDelivr-ESM.
- `js/theme.js` – Hell/Dunkel-Umschalter: `wendeThemeAn` (beim Start), `wechsleTheme`, `aufgeloestesTheme`.
- `js/registry.js` – Modul-Registry: `registriere`, `alleModule`, `holeModul`, `leereRegistry`.
- `js/module/README.md` – Modul-Schnittstelle (`id`, `titel`, `renderKachel`, `init`).
- `js/module/ernaehrung/` – erstes Fachmodul:
  - `index.js` – Registrierung, Tab-Leiste, Unter-Routing, Kachel-Text.
  - `daten.js` – einzige Datei mit Supabase-Netzwerkzugriff (Items, Log, Gewicht, Settings).
  - `zeitplan.js` – `istFaellig` (täglich/wochentage/intervall).
  - `berechnung.js` – `tagesStatus`, `streak`, `quoteProPunkt`, `prognose`, `heatmapDaten`.
  - `heute.js`, `liste.js`, `gewicht.js`, `statistik.js`, `infos.js` – die fünf Tabs.
  Details/Entscheidungen: `docs/superpowers/specs/2026-09-09-etappe-1-ernaehrung-design.md`.
- `js/module/todos/` – zweites Fachmodul (Aufgaben):
  - `index.js` – Registrierung, Tabs „Offen"/„Erledigt", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `todos` + `todo_vorlagen`.
  - `planung.js` – `naechsteFaelligkeit`, `sortiereOffeneTodos`, `istUeberfaellig`.
  - `offen.js`, `erledigt.js` – die zwei Tabs.
  Details: `docs/superpowers/specs/2026-09-16-etappe-2-todos-design.md`.
- `js/module/finanzen/` – drittes Fachmodul (Ausgaben/Kontostand), **seit
  Etappe 8 v2 inklusive des ehemaligen Lager-Moduls**:
  - `index.js` – Registrierung, Tabs „Ausgaben"/„Kontostand"/„Monat"/„Abos"/
    „Teile"/„Bestellen", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `expenses` + `finance_settings` +
    `parts` (Teile-Zugriff `speicherTeil`/`entferneTeil`/`setzeStatus` 1:1
    aus dem ehemaligen `lager/daten.js` übernommen).
  - `berechnung.js` – `kontostand`, `summeProMonat`, `summenProKategorie`,
    `erkenneAbos`, plus aus dem ehemaligen `lager/berechnung.js`
    übernommen: `warenwert`, `sortiereTeile`, `merkliste`,
    `naechsterStatus`; neu dazugekommen: `unechterKontostand(settings,
    expenses, teile, heute)` = `kontostand(...) + warenwert(teile)`.
  - `ausgaben.js`, `kontostand.js` (zeigt jetzt auch den unechten
    Kontostand), `monat.js`, `abos.js`, `teile.js`, `bestellen.js` – die
    sechs Tabs.
  Details Ursprungs-Modul: `docs/superpowers/specs/2026-09-16-etappe-3-finanzen-design.md`
  (Lager-Ursprung: `docs/superpowers/specs/2026-09-16-etappe-4-lager-design.md`).
  Absorption in Etappe 8 v2:
  `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`
  (Abschnitt 5). **`js/module/lager/` existiert nicht mehr** (Modul,
  Tests und Registrierung in `js/app.js` entfernt; die `parts`-Tabelle in
  Supabase ist unverändert, nur der Zugriff ist gewandert).
- `js/module/home/` – Home-Screen (Etappe 8 v2, kein eigenes `berechnung.js`,
  nur Zusammenstellung bestehender Logik):
  - `daten.js` – lädt parallel `finanzen/daten.js:ladeAlles()`,
    `todos/daten.js:ladeAlles()`, `sendungen/daten.js:ladeAlles()`.
  - `index.js` – Registrierung (`id:'home'`, Default-Startseite ohne Hash).
    Zeigt Kontostand-Karte (echt + unecht) sowie "Nächste Termine"/
    "Aktuelle Sendungen"/"Offene To-dos" mit "Alle anzeigen"-Links.
  Details: `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`
  (Abschnitt 4).
- `js/module/suche/` – Suche-Screen (Etappe 8 v2):
  - `berechnung.js` – `sucheAlles(zustand, suchtext)`: reine Volltextsuche
    über `expenses.notiz`, `todos.text`, `sendungen.haendler`/`beschreibung`,
    `termine.titel`, case-insensitiv, liefert `{ typ, titel, info, ziel }[]`
    (getestet, kein Netz/DOM).
  - `daten.js` – lädt dieselben drei Quellen wie Home.
  - `index.js` – Registrierung (`id:'suche'`), Eingabefeld mit Live-Filterung.
  Details: `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`
  (Abschnitt 7).
- `js/module/profil/` – Profil-Screen (Etappe 8 v2):
  - `index.js` – Registrierung (`id:'profil'`), kein eigenes `daten.js`
    (nutzt `holeSession()` aus `js/auth.js`). Zeigt Avatar-Kreis mit erstem
    Buchstaben der E-Mail-Adresse, E-Mail-Adresse, Abmelden-Button (ruft
    `meldeAb()`). Der frühere globale Header-Logout-Button ist entfernt –
    Abmelden geht nur noch hier.
  Details: `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`
  (Abschnitt 8).
- `js/module/berichtsheft/` – fünftes Fachmodul (Ausbildungsnachweis),
  **Anzeigename seit Etappe 8 v2 "Ausbildung"** (interne Modul-ID bleibt
  unverändert `berichtsheft`, keine Routen-/Datenbank-Änderung):
  - `index.js` – Registrierung, Tabs „Einträge"/„Drucken", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `berichtsheft_eintraege` + `berichtsheft_settings`.
  - `berechnung.js` – `wochenStart`, `gruppiereNachWoche`, `ausbildungsjahr`.
  - `eintraege.js` – Liste + Formular.
  - `drucken.js` – Wochenweise Druckansicht (`@media print`, `window.print()`).
  Details: `docs/superpowers/specs/2026-09-16-etappe-5-berichtsheft-design.md`.
  **Diktat-Weg:** Erzählt Mark im Chat einen oder mehrere Tage, fehlende
  Pflichtfelder (Datum, Stunden, Tätigkeiten) aktiv erfragen, dann direkt per
  Supabase-MCP in `berichtsheft_eintraege` schreiben (`user_id` s. u.).
- `js/module/sendungen/` – sechstes Fachmodul (Pakete/Termine, aus der
  E-Mail-Automatisierung befüllt, aber auch manuell nutzbar):
  - `index.js` – Registrierung, Tabs „Pakete"/„Termine", Kachel-Text.
  - `daten.js` – Supabase-Zugriff auf `sendungen` + `termine`.
  - `berechnung.js` – `sortiereSendungen`, `offeneSendungen`, `sortiereTermine`,
    `naechsterSendungStatus`. Vier Status-Kategorien: **`unterwegs`** →
    **`abholbereit`** (seit Etappe 3, 2026-09-19) → **`zugestellt`**, dazu
    der Sonderfall **`unbekannt`**. Zwei getrennte, exportierte Konstanten/
    Funktionen dafür (bewusst getrennt seit der Whole-Branch-Review von
    Etappe 3, da eine gemeinsame Zahl beide Zwecke nicht sauber abdeckte):
    `STATUS_PRIORITAET` (Sortierreihenfolge fürs UI, `unterwegs:0 <
    abholbereit:1 < unbekannt:2 < zugestellt:3`) und `STATUS_FORTSCHRITT` +
    `istStatusFortschritt(bestehenderStatus, neueKategorie)` (reine
    Vorwärts-Vergleichsfunktion für die Automatisierung, `unbekannt` im
    Bestand zählt dort als niedrigste Priorität `-1`). `STATUS_ZYKLUS`
    (unexportiert, nur fürs UI) definiert den Klick-Zyklus `unterwegs →
    abholbereit → zugestellt → unterwegs` (`unbekannt` klickt zu
    `unterwegs`).
  - `pakete.js`, `termine.js` – die zwei Tabs; Status-Pille für
    `abholbereit` gelb/orange getönt (`--hm-gelb-bg`).
  Details: `docs/superpowers/specs/2026-09-16-etappe-6-8-automatisierung-auth-redesign-design.md`
  (Abschnitt 3.4), `docs/superpowers/plans/2026-09-16-etappe-6-email-automatisierung.md`
  und (Dedup/Status-Historie/Abholdaten) `docs/superpowers/specs/2026-09-19-etappe-3-sendungen-automatisierung-design.md`.
- `manifest.webmanifest`, `icon.svg` – PWA. **Echte PNG-Icons (192/512) und
  `apple-touch-icon` fehlen weiterhin** (offener Punkt seit Etappe 0).
- `automatisierung/` – **lokales** Node-Skript, kein Teil der Browser-App:
  - `postfach-scan.mjs` – täglicher Scan von Marks GMX-Postfach per IMAP,
    Klassifikation jeder Mail per `claude -p` (Details/Warum siehe
    `docs/PROJEKT-LOG.md`, Eintrag 2026-09-17), schreibt Belege/Sendungen/
    Termine nach Supabase. **Seit Etappe 3 (2026-09-19):** erkennt
    bestehende Sendungen per Trackingnummer wieder
    (`findeBestehendeSendung`) und aktualisiert sie statt eine neue Zeile
    anzulegen (behebt den seit Etappe 6 bekannten Duplikat-Bug — jede
    Status-Mail einer Sendung erzeugte vorher eine eigene Zeile). Status
    bewegt sich dabei nur vorwärts (`istStatusFortschritt()` aus
    `js/module/sendungen/berechnung.js`). Legt bei jedem
    verarbeiteten Sendungs-Ereignis einen Eintrag in `sendungen_ereignisse`
    an (Status-Historie). Ohne bekannte Trackingnummer wird weiterhin neu
    angelegt (seltene Restlücke für Duplikate, siehe PROJEKT-LOG).
  - `klassifizieren.js` – `baustePrompt`, `parseKlassifikation`,
    seit Etappe 3 zusätzlich `kategorisiereStatus(statusText)` (bildet
    Freitext per Schlüsselwort-Muster auf eine der vier Status-Kategorien
    ab, Default `unbekannt`) — extrahiert dafür `statusText`/`ort`/
    `abholcode`/`abholadresse`/`abholzeiten` aus Sendungs-Mails (nur wenn
    wörtlich in der Mail vorhanden, sonst `null`) (reine Logik, getestet).
  - `letzter-lauf.js` – `leseLetztenLauf`, `schreibeLetztenLauf` (reine Logik, getestet).
  - `.env` (nicht im Repo, siehe Konventionen unten) – GMX- und Supabase-Zugangsdaten.
  - `letzter-lauf.json` (nicht im Repo) – Zeitstempel des letzten erfolgreichen Laufs.
  Läuft per Windows-Scheduled-Task täglich 7 Uhr, siehe unten.
- `test/` – `node --test` Unit-Tests: `router`, `view`, `registry`,
  `ernaehrung-zeitplan`, `ernaehrung-berechnung`, `todos-planung`,
  `finanzen-berechnung` (seit Etappe 8 v2 inkl. der ehemaligen
  Lager-Fälle: `warenwert`/`sortiereTeile`/`merkliste`/`naechsterStatus`/
  `unechterKontostand`), `berichtsheft-berechnung`, `sendungen-berechnung`
  (seit Etappe 3, 2026-09-19, inkl. `abholbereit`-Sortierung/-Priorität/
  -Zyklus), `suche-berechnung` (Etappe 8 v2), `automatisierung-klassifizieren`
  (seit Etappe 3 inkl. `kategorisiereStatus`), `automatisierung-letzter-lauf`
  (71 grün; `lager-berechnung.test.js` existiert seit Etappe 8 v2 nicht mehr).
- `.nojekyll` – GitHub Pages soll das Repo unverändert ausliefern.
- `docs/` – Projekt-Doku.

## Nav (Bottom-Nav-Struktur, seit Etappe 8 v2)

Feste Reihenfolge, **nicht** mehr automatisch aus allen registrierten
Modulen erzeugt: **Home → Finanzen → Ausbildung → Suche → Profil**
(`NAV_MODULE` in `js/app.js`). Ernährung, To-dos und Sendungen sind
weiterhin vollständig registrierte Module mit Code und Daten, haben aber
**keinen** eigenen Bottom-Nav-Punkt mehr – erreichbar nur noch per Hash
(`#/ernaehrung`, `#/todos`, `#/sendungen`) oder über die "Alle
anzeigen"-Links auf dem Home-Screen. Ohne Hash öffnet die App den
Home-Screen. Details/Begründung: `docs/PROJEKT-LOG.md`, Eintrag
2026-09-18, und `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`
(Abschnitt 2–3).

## Starten / Testen / Bauen

- **Lokal ansehen:** kein Build. Im Repo-Wurzel
  (`C:\Users\PC\Projekte\mein-dashboard`) einen statischen Server starten,
  `python -m http.server 8000`, dann `http://localhost:8000` öffnen.
  (Datei direkt öffnen geht wegen Supabase-Auth-Redirect nicht zuverlässig.)
- **Tests:** `npm test` (läuft `node --test` über `test/`). Stand: 71 grün.
- **Deploy:** Push auf `main` → GitHub Pages veröffentlicht automatisch unter
  `https://mkunau-ctrl.github.io/mein-dashboard/`. Pages ist aktiv (Source:
  Branch `main`, Ordner `/root`). Seit 2026-09-09 live.
- **Postfach-Scan manuell testen:** `node automatisierung/postfach-scan.mjs`
  im Repo-Wurzel (braucht `automatisierung/.env`, siehe Konventionen unten).

## Arbeitsweise

Dieses Projekt folgt dem Skill `projekt-workflow`: erst planen, dann bauen,
danach `docs/PROJEKT-LOG.md` und diese Datei aktualisieren. Antworten und Doku
auf Deutsch. Datenschutz beachten.

## Konventionen / Fallstricke

- **Keine Geheimnisse ins Repo.** Supabase-**Anon**-Key ist unkritisch und darf
  im Quelltext stehen (Schutz kommt über Row-Level-Security + Magic-Link-Login).
  Service-Role-Key, Zugangsdaten o. Ä. niemals committen.
- **`automatisierung/.env`** enthält GMX-App-Passwort + Supabase-
  Service-Role-Key, liegt nur lokal (per `.gitignore` ausgeschlossen), niemals
  committen oder in den Chat einfügen. Vorlage: `automatisierung/.env.example`.
  GMX braucht dafür ein **Anwendungsspezifisches Passwort** (Login &
  Sicherheit → Anwendungsspezifische Passwörter verwalten) – das normale
  GMX-Passwort funktioniert für IMAP nicht.
- **Scheduled Task `MeinDashboard-PostfachScan`** startet
  `automatisierung/postfach-scan.mjs` täglich 7 Uhr. Entfernen:
  `Unregister-ScheduledTask -TaskName "MeinDashboard-PostfachScan" -Confirm:$false`.
- Alle Supabase-Tabellen haben `user_id` mit RLS `user_id = auth.uid()`.
- **Claude schreibt Daten:** Beim Insert über Supabase-MCP die `user_id` explizit
  auf Marks Auth-ID setzen: `USER_ID = df0b24a6-6a74-4830-995c-84015161dcc3`.
- GitHub-Account: `mkunau-ctrl`. Falls ein Push blockiert wird, pusht Mark selbst
  mit `!git push`.
- Datum im Log absolut schreiben (kein "heute").
- **Finanzen – Belege per Chat:** Schickt Mark im Chat ein Foto eines
  Kassenbons, trägt Claude die Ausgabe direkt in `expenses` ein
  (`quelle:'foto'`). Kommt eine Ausgabe später automatisiert aus E-Mails,
  `quelle:'email'` setzen. Manuell in der App eingetragene Ausgaben haben
  `quelle:'manuell'` (Default). Siehe auch offener Punkt „automatisches
  Beleg-Tracking" im Log.
- **Berichtsheft – Diktat per Chat:** Erzählt Mark Arbeitstage, fehlende
  Pflichtfelder (Datum, Stunden, Tätigkeiten) aktiv erfragen, dann in
  `berichtsheft_eintraege` schreiben (ein Eintrag pro Tag, `unique
  (user_id, datum)` – bei erneutem Diktat für denselben Tag überschreibt
  das den alten Eintrag, nicht duplizieren).
- **To-dos/Lager – auch per Chat diktierbar:** Wie bei Berichtsheft/Finanzen
  kann Mark auch Aufgaben (`todos`) oder Lagerbestände (`parts`) einfach im
  Chat erzählen; Claude fragt fehlende Pflichtfelder nach und trägt direkt
  per Supabase-MCP ein, statt dass Mark es selbst in der App eingeben muss.
- **E-Mail-Automatisierung – Dedup-Key nur in `sendungen`:** IMAP-`SINCE`
  liefert nur Tagesgenauigkeit; `postfach-scan.mjs` filtert deshalb
  zusätzlich selbst nach `internalDate` gegen den letzten Lauf-Zeitpunkt
  (`letzter-lauf.json`), damit nicht täglich derselbe Tag doppelt
  verarbeitet wird. Dedup-Key nur in `sendungen` (Trackingnummer, seit
  Etappe 3); `expenses`/`termine`/`sendungen_ereignisse` haben weiterhin
  keinen Dedup-Key. Wird `letzter-lauf.json` gelöscht/zurückgesetzt (z. B.
  für einen manuellen Test), verarbeitet der nächste Lauf denselben
  Zeitraum erneut – bei `expenses`/`termine` (und bei `sendungen` ohne
  bekannte Trackingnummer) ggf. Duplikate danach manuell in Supabase
  löschen.

### Supabase-Projekt

- Name `mein-dashboard`, Ref `vogztxoaqbnuciboughd`.
- URL `https://vogztxoaqbnuciboughd.supabase.co`; Publishable-Key steht in
  `js/supabase.js` (öffentlich, unkritisch).
- Auth: E-Mail-Provider an. Site URL
  `https://mkunau-ctrl.github.io/mein-dashboard/`. Redirect-Allowlist:
  `http://localhost:8000/**` und `https://mkunau-ctrl.github.io/mein-dashboard/**`.
- `USER_ID` (Marks Auth-UID) = `df0b24a6-6a74-4830-995c-84015161dcc3`
  (erster Login am 2026-09-09).
- **Passkeys (offener manueller Schritt für Mark):** Claude hat keinen
  Zugriff auf die Auth-Konfiguration (nur übers Dashboard/Management-API
  mit Access-Token einstellbar). Im Supabase-Dashboard unter
  **Authentication → Passkeys** einmalig aktivieren mit:
  - Relying Party Display Name: `Mein Dashboard`
  - Relying Party ID: `mkunau-ctrl.github.io`
  - Relying Party Origins: `https://mkunau-ctrl.github.io`
  Danach in der App einloggen (Magic-Link) und oben „Passkey einrichten"
  tippen – erst dann geht „Mit Passkey anmelden" auf dem Login-Screen.
- Tabellen (Stand Etappe 3, 2026-09-19): `checklist_items`, `daily_log`,
  `weight_log`, `settings` (Ernährung), `todos`, `todo_vorlagen`, `expenses`,
  `finance_settings`, `parts`, `berichtsheft_eintraege`,
  `berichtsheft_settings`, `sendungen` (seit Etappe 3 zusätzlich
  `abholcode`/`abholadresse`/`abholzeiten`), `termine`,
  **`sendungen_ereignisse`** (neu, Etappe 3: Status-Historie pro Sendung —
  `sendung_id`, `beschreibung`, `status_kategorie`, `ort`).
