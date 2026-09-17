# Projekt-Log: Mein Dashboard

Chronologisches Logbuch, neueste Einträge oben. Prosa, kein Code-Dump.

---

## 2026-09-17 – Visuelles Redesign gestartet: Finanzen als erstes Referenz-Modul

**Was:** Erste Etappe des großen Redesigns (Icon-Karten-Optik aus Marks
Mockup). Neue geteilte CSS-Bausteine in `app.css`: `.icon-badge`
(runde Icon-Kachel), `.betrag-minus`/`.betrag-plus` (farbige Beträge),
`.stat-karte.gross` (große, linksbündige Stat-Karte mit Icon-Kopf),
`.quote-zeile.betrag`-Modifier (breitere letzte Spalte für Euro- statt
Prozentwerte, damit die geteilte `.quote-zeile`-Komponente aus dem
Ernährungs-Modul unverändert bleibt). Finanzen-Modul komplett umgebaut:
Ausgaben-Liste mit Icon + rotem Betrag, Kontostand als große Karte mit
Wallet-Icon + "Ausgaben diesen Monat" als Zusatzinfo, Monats-Kategorien
mit Tag-Icon je Zeile.

**Warum:** Mark wollte nach dem Farbsystem jetzt auch das große visuelle
Redesign aus dem Referenz-Mockup (Fintech-App-Screenshot) – explizit "die
restlichen Seiten jetzt auch machen". Finanzen zuerst, weil es inhaltlich
am nächsten am Mockup dran ist und die Kategorie-Balken-Logik (`summenPro
Kategorie`) schon vorhanden war.

**Bewusste Abgrenzung von Marks Mockup:** Kein erfundenes
"Einnahmen"-Feld – unser Datenmodell trackt nur Ausgaben + einen
gesetzten Kontostand-Startwert, keine Einnahmen-Einträge. Die "Ausgaben
diesen Monat"-Zeile unter dem Kontostand ersetzt die Einnahmen/Differenz-
Zeilen aus dem Mockup mit echten, vorhandenen Daten statt Fantasiewerten.
Auch keine Icons pro Händler/Kategorie (Netflix-Logo o. Ä.) – Kategorien
sind bei uns Freitext, ein generisches Beleg-Icon für alle Ausgaben-Zeilen
ist ehrlicher als geratene Zuordnungen.

**Stand danach:** Alle 45 Tests grün (reine UI-Änderung, keine
Berechnungslogik angefasst). Mit Beispieldaten als statische
Vorschauseite pro Theme (hell/dunkel) per Playwright geprüft, echter
App-Durchlauf mit Live-Daten steht noch aus (Sandbox kann Supabase-CDN
nicht laden, s. o.).

**Offene Punkte / Nächste Schritte:** Todos, Lager, Ernährung,
Berichtsheft im selben Stil (Icon-Badges, farbige Beträge wo sinnvoll,
`.stat-karte.gross` für Übersichtszahlen) nachziehen – auf Marks
ausdrücklichen Wunsch als direkte Fortsetzung, nicht mehr einzeln
freigegeben.

---

## 2026-09-17 – Echtes Hell/Dunkel-Umschalten (statt nur festes Schwarz)

**Was:** Neues `js/theme.js`: liest/schreibt die Theme-Wahl in
`localStorage`, setzt `data-theme="dark"|"light"` auf `<html>`. Ohne
gespeicherte Wahl folgt die App der Systemeinstellung
(`prefers-color-scheme`). Ein Icon-Button (Sonne/Mond) auf dem Login-Screen
und im Dashboard-Header schaltet manuell um. Dunkel = echtes Schwarz
(`#000000`), Hell = echtes Weiß (`#ffffff`) – beide mit hohem Kontrast
(Text nahezu Schwarz/Weiß), passend zu Marks Wunsch nach "LEDs auf dem
OLED-Panel wirklich aus" im Dunkel-Modus.

**Warum:** Mark hat ein Referenz-Mockup geschickt (generisches
Finanz-App-Design, Licht- und Dunkelversion) und wollte echtes Schwarz/Weiß
statt Grautönen, plus die Möglichkeit umzuschalten.

**Bewusst nicht mitgemacht (siehe Abgrenzung mit Mark):** Das komplette
visuelle Redesign aus dem Mockup (Icon-Karten pro Zeile, farbige Beträge,
Kategorie-Balken, eigener Profil/Einstellungen-Screen) ist **nicht** Teil
dieser Änderung – nur das Farbsystem. Mark hat sich explizit dafür
entschieden, das große Redesign als eigenen, späteren Schritt Modul für
Modul anzugehen statt alles auf einmal zu riskieren.

**Stand danach:** Alle 45 Tests weiterhin grün (kein Test für `theme.js` –
reine DOM-/`localStorage`-Logik, gleiches Muster wie bei `auth.js`). Verhalten
isoliert per Playwright geprüft (Icon wechselt korrekt Sonne↔Mond, Hell/
Dunkel-Hintergrund korrekt), der volle App-Durchlauf ließ sich in der
Sandbox nicht testen (Supabase-CDN-Import schlägt dort an einem
Proxy-Zertifikat fehl – Sandbox-Eigenheit, kein Produktionsproblem).
**Echter Test im Browser auf einem Gerät steht noch aus.**

---

## 2026-09-17 – Passkey-Login (WebAuthn) als Ergänzung zum Magic-Link

**Was:** Supabase Auth unterstützt seit Kurzem Passkeys nativ (als
"Experimental" markiert). Client-Seite gebaut: `js/supabase.js` opted mit
`experimental: { passkey: true }` ein, `js/auth.js` bekommt
`registrierePasskey()` und `meldeAnMitPasskey()`. Im UI: Login-Screen hat
jetzt zusätzlich einen Button „Mit Passkey anmelden" (kein
E-Mail/Nutzername nötig, discoverable credential), im Dashboard-Header ein
Button „Passkey einrichten" zum Registrieren auf dem aktuellen Gerät.
Magic-Link bleibt vollständig erhalten als Fallback.

**Warum:** Marks Wunsch nach Passkey-Login.

**Wichtige Einschränkungen (bewusst so gelassen, nicht Claudes
Entscheidungsspielraum):**
- Die Server-Konfiguration (Relying-Party-ID/Origins) kann Claude nicht
  setzen – das geht nur über Supabase-Dashboard oder Management-API mit
  einem Access-Token, den Claude nicht hat. **Offener Schritt für Mark**,
  siehe `CLAUDE.md` → Abschnitt Supabase-Projekt für die genauen Werte.
- Relying-Party-ID ist fest auf `mkunau-ctrl.github.io` geplant → Passkey
  funktioniert **nicht** auf `localhost` beim lokalen Testen (WebAuthn
  verlangt, dass der Origin-Hostname zur RP-ID passt). Nur auf der echten
  Live-Seite nutzbar/testbar.
- Ein Passkey kann erst registriert werden, wenn man schon eingeloggt ist
  (Supabase-Vorgabe) – Ersteinrichtung läuft also immer über Magic-Link,
  Passkey ist danach der schnellere Weg für weitere Logins auf diesem Gerät.
- Supabase markiert die API selbst als experimentell (kann sich ändern).
  Deshalb bewusst kein Ersatz für Magic-Link, sondern zusätzliche Option.

**Stand danach:** Alle 45 Tests weiterhin grün (kein Test für `auth.js`,
wie schon vorher – reiner Supabase-Wrapper). Noch nicht live testbar, bis
Mark die Dashboard-Einstellung gemacht hat.

---

## 2026-09-17 – Dunkles Redesign: tiefes Schwarz + feste Tab-Leiste unten

**Was:** Visuelle Überarbeitung, quer zu allen Modulen. Das Farbschema ist
jetzt fest ein sehr dunkles Theme (`--bg: #000000`, Karten `#121212`), nicht
mehr abhängig von `prefers-color-scheme`. Die bisherige Start-Kachel-Raster-
Ansicht ist ersetzt durch eine feste Tab-Leiste unten am Bildschirmrand
("app-klassisch", iPhone-Home-Indicator-sicher via `env(safe-area-inset-
bottom)`) mit einem Icon je Modul (Ernährung, To-dos, Finanzen, Lager,
Berichtsheft). Ein Klick wechselt direkt in den jeweiligen Bereich, das
aktive Icon ist in der Akzentfarbe hervorgehoben. Ohne Hash öffnet die App
jetzt direkt das erste Modul statt eines leeren Rasters.

**Warum:** Marks Wunsch nach einem klassischen App-Layout (Referenz:
Screenshot einer Fintech-Dashboard-Mockup-Werbung – nur als Stilvorlage für
Dunkel-Theme + Bottom-Tab-Bar übernommen, keine Marken-/Logo-Übernahme).

**Entscheidungen:**
- Modul-Schnittstelle um optionales Feld `icon` (Inline-SVG-String) ergänzt,
  siehe `js/module/README.md`. Alle fünf Module liefern jetzt ein Icon.
- `renderKachel` bleibt in den Modulen bestehen (Interface weiterhin
  "optional"), wird aber aktuell nirgends mehr aufgerufen – die
  Tagesstand-Kurzinfo (z. B. "3/5 erledigt", "2 überfällig"), die früher auf
  der Start-Kachel stand, ist damit vorerst nicht mehr sichtbar. Bewusst
  zurückgestellt statt in die Tab-Leiste gequetscht (zu wenig Platz für
  Badges in dieser Runde) – falls gewünscht, später als kleines Badge auf
  dem Tab-Icon nachrüsten.
- `manifest.webmanifest` (`background_color`/`theme_color`) und
  `<meta name="theme-color">` auf `#000000` gezogen, damit iOS-Statusleiste/
  Safe-Areas beim "Zum Home-Bildschirm" zum neuen Theme passen.

**Stand danach:** Alle 45 Tests weiterhin grün (Logik unverändert, nur UI).
Visuell per Playwright-Screenshot einer statischen Vorschauseite geprüft
(iPhone-Breite 390px). Noch **nicht** live auf einem echten Gerät getestet.
Offene PNG-Icons (192/512, `apple-touch-icon`) weiterhin offen aus Etappe 0
– jetzt zusätzlich relevant, weil sie zum neuen Schwarz-Theme passen sollten.

---

## 2026-09-16 – Vorbereitung Beleg-Tracking: `quelle`-Feld + Architektur-Vorschlag

**Was:** Kleine Vorbereitung fürs automatische Beleg-Tracking (Wunsch s.
Eintrag weiter unten), ohne schon den vollen Automatisierungs-Teil zu bauen:
`expenses` hat jetzt eine Spalte `quelle` (`manuell` \| `email` \| `foto`,
Default `manuell`, Migration `expenses_quelle`). Der **Foto-Weg funktioniert
damit ab sofort**: Mark schickt Claude im Chat ein Beleg-Foto, Claude trägt
die Ausgabe mit `quelle:'foto'` ein – kein weiterer Bau nötig.

**Warum:** Der Foto-Weg war laut Marks Antwort vom 2026-09-16 sowieso schon
per Chat gewünscht ("Recommended"-Option) und brauchte nur dieses eine Feld,
um nachvollziehbar zu bleiben. Der E-Mail-Weg braucht dagegen echte
Automatisierung und Marks Postfach-Zugangsdaten – das ist ein eigener,
größerer Schritt (s. u.), den Claude nicht ungefragt anstößt.

**Architektur-Vorschlag für den E-Mail-Weg (noch nicht gebaut):**
Ein taeglich laufender **Windows-Scheduled-Task** (Muster wie bei den
Projekten `energiesparer-modus`/`auto-weiter`) startet ein kleines Skript,
das (1) sich per **IMAP** bei `m.kunau@gmx.de` anmeldet und neue Mails seit
dem letzten Lauf holt, (2) Beleg-Mails per `claude -p` (Claude liest die
Mail und liefert Betrag/Händler/Datum als JSON) erkennen und auslesen lässt,
(3) die erkannten Ausgaben mit `quelle:'email'` in Supabase einträgt.

**Offene Voraussetzungen, bevor das gebaut werden kann:**
- Mark muss in den GMX-Kontoeinstellungen den **IMAP-Fremdzugriff aktivieren**
  und ein **App-Passwort** erzeugen (nicht das normale GMX-Passwort).
- Für den Supabase-Insert ohne eingeloggte Session braucht das Skript einen
  mächtigeren Zugriff als der öffentliche Anon-Key (z. B. den
  **Service-Role-Key**) – der ist sehr sensibel (umgeht RLS komplett) und
  darf **nur lokal** liegen (`.env`, per `.gitignore` ausgeschlossen), nie im
  Repo. Das ist bewusst eine höhere Hürde als alles bisher im Projekt und
  sollte Mark klar sein, bevor er zustimmt.
- Beide Zugangsdaten (IMAP-App-Passwort, Service-Role-Key) legt Mark selbst
  lokal ab (z. B. `.env`-Datei), nicht über den Chat einfügen.

**Stand danach:** `quelle`-Feld live, Foto-Weg nutzbar. E-Mail-Automatisierung
ist ein Vorschlag, noch nicht umgesetzt.

**Offene Punkte / Nächste Schritte:**
- Mark: GMX-IMAP aktivieren + App-Passwort erzeugen, wenn er den E-Mail-Weg
  will.
- Danach: eigener Feinplan + Bau für das Automatisierungs-Skript
  ("Etappe 6").

---

## 2026-09-16 – Etappe 5 (Modul Berichtsheft) gebaut

**Was:** Fünftes Fachmodul, der Ausbildungsnachweis: Tab „Einträge" (ein
Eintrag pro Tag – Datum, Art [Betrieb/Berufsschule/Sonstiges], Tätigkeiten/
Themen, Stunden; anlegen/bearbeiten/löschen) und Tab „Drucken" (Kopfdaten
Name/Ausbildungsberuf/Ausbildungsbeginn, wochenweise Ansicht im
IHK-typischen Layout mit Stunden-Summe und zwei Unterschriftfeldern,
druckbar über den Browser-Druckdialog). Kachel zeigt Anzahl Einträge diese
Woche. Format orientiert sich an recherchierten IHK/HWK-Vorlagen (Quellen in
`docs/superpowers/specs/2026-09-16-etappe-5-berichtsheft-design.md`).

**Warum:** Neu hinzugekommene Etappe (Wunsch vom 2026-09-16) – Mark will sein
Berichtsheft für die Berufsschule per Diktat an Claude oder per Formular
führen und am Ende ausdrucken.

**Entscheidungen:** Kein PDF-Paket eingebaut – eine `@media print`-Ansicht
pro Woche reicht für „druckfertig" (Browser-Druckdialog → „Als PDF
speichern"), passt zum Projekt-Grundsatz "kein Framework, kein Build".
Diktat-Weg: Mark erzählt im Chat, Claude fragt fehlende Pflichtfelder
(Datum, Stunden, Tätigkeiten) aktiv nach und schreibt dann per Supabase-MCP
direkt in `berichtsheft_eintraege` (wie im Gesamtkonzept vorgesehen).

**Stand danach:** Branch `etappe-5` gebaut, 3 neue Unit-Tests für
`berechnung.js` (`wochenStart`, `gruppiereNachWoche`, `ausbildungsjahr`),
insgesamt 45 Tests grün. Zwei neue Supabase-Tabellen
(`berichtsheft_eintraege`, `berichtsheft_settings`) mit RLS (Migration
`etappe5_berichtsheft`), keine neuen Security-Advisor-Befunde. Noch nicht
manuell im Browser getestet, insbesondere der Druckdialog nicht.

**Offene Punkte / Nächste Schritte:**
- Manueller Testlauf: Eintrag anlegen, Kopfdaten setzen, Druckansicht +
  „Als PDF speichern" im echten Browser prüfen (Layout, Seitenumbruch).
- **Kompletter manueller Testlauf für Etappe 2–5 steht weiterhin aus.**
- Ursprüngliche Roadmap (Ernährung → To-dos → Finanzen → Lager →
  Berichtsheft) ist damit **komplett gebaut**. Als Nächstes: der neue Wunsch
  „automatisches Beleg-Tracking" (s. Eintrag unten) – wartet noch auf
  technische Klärung (GMX-IMAP-Zugang).

---

## 2026-09-16 – Etappe-5-Design-Entscheidungen + neuer Wunsch: automatisches Beleg-Tracking

**Was:** Für Etappe 5 (Berichtsheft) hat Mark drei offene Fragen beantwortet.
Zusätzlich kam ein neuer, großer Wunsch dazu: Ausgaben sollen automatisch aus
Beleg-E-Mails im Postfach eingetragen werden, dazu soll er auch selbst
fotografierte Belege einreichen können.

**Entscheidungen (Berichtsheft):**
- **Vorlage:** keine eigene Datei von Mark – Claude recherchiert ein
  typisches deutsches Berichtsheft-/Ausbildungsnachweis-Format (z. B.
  IHK-Standard) und orientiert sich daran.
- **Rhythmus:** ein Eintrag **pro Tag** (Datum, Tätigkeiten, Stunden), aber
  Mark diktiert unregelmäßig (mal täglich, mal im Nachhinein mehrere Tage auf
  einmal). Das Datenmodell muss das abbilden können, unabhängig davon, wann
  er tatsächlich mit Claude spricht.
- **Diktat:** Mark erzählt frei, Claude fragt aktiv nach, wenn Pflichtfelder
  (Datum, Stunden, Tätigkeiten) fehlen, bevor gespeichert wird.

**Neuer Wunsch (noch nicht geplant, offene Fragen s. u.):** Automatisches
Beleg-Tracking fürs Finanzen-Modul. Mark bekommt Kaufbelege oft per E-Mail;
er möchte, dass Claude regelmäßig (in seiner Formulierung: "jede Stunde") ins
Postfach schaut, Belege einsammelt und als Ausgaben einträgt. Zusätzlich will
er selbst fotografierte Belege einreichen können.

**Warum wichtig, bevor gebaut wird:** Das ist die bisher sensibelste
Erweiterung im Projekt – dauerhafter, automatisierter Zugriff auf ein
E-Mail-Postfach plus Geldbeträge, die ohne Marks Blick automatisch in seine
Finanzen eingetragen würden. Datenschutz/Sorgfalt hat hier Vorrang vor
Tempo (siehe Gedächtnis „Nutzer: Berufsschule-Kontext" – Datenschutz wichtig).
Claude hat deshalb Rückfragen gestellt, statt direkt zu bauen (s. u.).

**Offene Punkte / Nächste Schritte:**
- Etappe 5 (Berichtsheft): Recherche + Design, dann bauen – kann mit den
  vorliegenden Antworten direkt weitergehen.
- Beleg-Automatisierung: wartet auf Marks Antworten zu Postfach, echtem
  Rhythmus (stündlich vs. seltener), Automatik vs. Gegenprüfung vor dem
  Eintragen, und wie fotografierte Belege technisch reinkommen sollen.

---

## 2026-09-16 – Etappe 4 (Modul Lager/Ersatzteile) gebaut

**Was:** Viertes und letztes Fachmodul der ursprünglichen Roadmap: Tab
„Teile" (Bezeichnung, Bestand, Soll-Bestand, Einzelwert, Status
fehlt/bestellt/da; anlegen/bearbeiten/entfernen; Warenwert-Summe oben) und
Tab „Bestellen" (Merkliste = alle Teile mit Status ≠ „da", Status per Klick
weiterschalten). Kachel zeigt Anzahl offener Bestellungen. Details:
`docs/superpowers/specs/2026-09-16-etappe-4-lager-design.md`.

**Warum:** Letzte Etappe der ursprünglichen Roadmap (Ernährung → To-dos →
Finanzen → Lager); danach folgt die neu hinzugekommene Etappe 5 (Berichtsheft).

**Entscheidungen:** Bestell-Merkliste bekommt **kein eigenes Datenmodell**,
sondern ist nur eine gefilterte Sicht auf `parts` (Status ≠ `da`) – vermeidet
doppelte Datenhaltung. Löschen von Teilen ist eine harte Löschung, wie bei
Todos/Finanzen.

**Stand danach:** Branch `etappe-4` gebaut, 4 neue Unit-Tests für
`berechnung.js` (`warenwert`, `sortiereTeile`, `merkliste`,
`naechsterStatus`), insgesamt 42 Tests grün. Neue Supabase-Tabelle `parts`
mit RLS (Migration `etappe4_lager`), keine neuen Security-Advisor-Befunde.
Noch nicht manuell im Browser getestet.

**Offene Punkte / Nächste Schritte:**
- Manueller Testlauf: Teil anlegen, Status durchklicken, Warenwert prüfen,
  Merkliste-Filter prüfen.
- **Gesamter manueller Testlauf für Etappe 2–4 steht noch aus** (kein
  Chrome-Zugriff während des Bauens) – vor dem nächsten größeren Schritt
  einmal am echten Gerät durchklicken.
- Danach: Etappe 5 (Berichtsheft) – braucht vorher einen eigenen Feinplan
  (offene Fragen: Pflichtfelder, PDF-Layout/Vorlage).

---

## 2026-09-16 – Etappe 3 (Modul Finanzen) gebaut

**Was:** Drittes Fachmodul: Tab „Ausgaben" (Betrag, freie Kategorie, Notiz,
Datum erfassen; Liste neueste zuerst; löschen), Tab „Kontostand" (aktueller
Stand = gesetzter Ausgangswert minus aller Ausgaben seither; Ausgangswert
jederzeit neu setzbar) und Tab „Monat" (Monats-Navigation, Summe gesamt +
Balken pro Kategorie). Kachel zeigt die heutigen Ausgaben in Euro. Details:
`docs/superpowers/specs/2026-09-16-etappe-3-finanzen-design.md`.

**Warum:** Nächste Etappe laut Roadmap.

**Entscheidungen:** Kategorie ist freies Textfeld statt festem Enum (Konzept
gibt keine feste Liste vor, Mark/Claude tippen frei). Löschen von Ausgaben ist
eine harte Löschung (keine Statistik-Historie wie bei Ernährung, die dadurch
verfälscht würde). Keine Bank-Anbindung (Grundsatzentscheidung Gesamtkonzept).

**Stand danach:** Branch `etappe-3` gebaut, 4 neue Unit-Tests für
`berechnung.js` (`kontostand`, `summeProMonat`, `summenProKategorie`),
insgesamt 38 Tests grün. Zwei neue Supabase-Tabellen (`expenses`,
`finance_settings`) mit RLS (Migration `etappe3_finanzen`), keine neuen
Security-Advisor-Befunde. Noch nicht manuell im Browser getestet.

**Offene Punkte / Nächste Schritte:**
- Manueller Testlauf: Ausgabe anlegen, Kontostand setzen und prüfen,
  Monatsübersicht über Monatsgrenze testen.
- Danach: Etappe 4 (Lager/Ersatzteile).

---

## 2026-09-16 – Etappe 2 (Modul To-dos) gebaut

**Was:** Zweites Fachmodul: Tab „Offen" (einmalige und wiederkehrende Todos
anlegen, abhaken, entfernen; überfällige rot markiert) und Tab „Erledigt"
(Historie der letzten 60 Tage). Wiederkehrende Todos (täglich, bestimmte
Wochentage, monatlich am X.) laufen über eine eigene Vorlagen-Tabelle; jedes
Abhaken legt eine neue erledigte Zeile an und erzeugt automatisch die nächste
offene Instanz. Kachel zeigt Anzahl offener Todos + überfällige. Datenmodell
und Entscheidungen: `docs/superpowers/specs/2026-09-16-etappe-2-todos-design.md`.

**Warum:** Nächste Etappe laut Roadmap (Reihenfolge s. Eintrag unten).

**Stand danach:** Branch `etappe-2` gebaut, 6 neue Unit-Tests für
`planung.js` (`naechsteFaelligkeit`, `sortiereOffeneTodos`, `istUeberfaellig`),
insgesamt 34 Tests grün. Zwei neue Supabase-Tabellen (`todo_vorlagen`,
`todos`) mit RLS angelegt (Migration `etappe2_todos`), Security-Advisor zeigt
keine neuen Befunde. Noch **nicht** manuell im Browser getestet (kein
Chrome-Zugriff in dieser Session) – wie bei Etappe 1 offen.

**Offene Punkte / Nächste Schritte:**
- Manueller Testlauf (Desktop + iPhone-Safari): Todo anlegen, abhaken,
  wiederkehrendes Todo über mehrere Zyklen prüfen.
- Danach: Etappe 3 (Finanzen).

---

## 2026-09-16 – Planungsentscheidungen: Etappe 2–4 am Stück, neues Modul Berichtsheft

**Was:** Mark hat entschieden, dass jetzt die nächsten Etappen (To-dos,
Finanzen, Lager/Ersatzteile) direkt nacheinander gebaut werden, statt nach
jeder Etappe anzuhalten. Zusätzlich kommt ein neues, bisher nicht geplantes
Modul dazu: **Berichtsheft** (Ausbildungsnachweis für die Berufsschule). Mark
will seine Einträge einfach per Sprache/Chat an Claude diktieren, Claude trägt
sie strukturiert in die Datenbank ein, am Ende soll sich daraus ein
druckfertiges PDF erzeugen lassen.

**Warum:** Spart Rückfragen zwischen den Etappen, da die Grundstruktur (Tabellen
+ Modul-Muster) aus Etappe 1 bereits steht und für To-dos/Finanzen/Lager im
Konzept grob vorskizziert ist. Das Berichtsheft ist ein eigenständiger,
wiederkehrender Bedarf aus Marks Berufsschul-Alltag (siehe Gedächtnis-Eintrag
„Nutzer: Berufsschule-Kontext").

**Entscheidungen:**
- **Wiederkehrende To-dos** (z. B. „Müll raus" jeden Montag): eigene Vorlage
  bleibt bestehen, **jedes Abhaken legt eine neue, abgeschlossene Zeile an**
  (mehr Historie statt ein Datum, das nur weiterspringt).
- Reihenfolge bleibt wie im Konzept festgelegt: To-dos → Finanzen → Lager.
  Danach neu: **Etappe 5 – Berichtsheft** (Roadmap in
  `docs/specs/2026-09-08-dashboard-konzept.md` ergänzt).
- Für Etappe 2–4 reicht ein kurzes Design im Log/als Datei (Muster aus
  Etappe 1 wiederverwendet), keine erneute große Rückfrage-Runde – nur bei
  echten offenen Fragen wird nachgefragt.
- Etappe 5 (Berichtsheft) bekommt vor dem Bau einen eigenen Feinplan, weil PDF-
  Export und Diktat-Format neue Fragen aufwerfen, die noch nicht geklärt sind
  (Pflichtfelder des Berichtshefts, PDF-Layout/Vorlage der Berufsschule).

**Offene Punkte / Nächste Schritte:** Etappe 2 (To-dos) beginnt jetzt.

---

## Ideen für später (keine chronologischen Einträge)

**Etappe 5 – Kalender + Benachrichtigungen (von Mark am 2026-09-09 gewünscht):**
Ein eigenes Modul, das Marks **iCloud-Kalender** (Apple) in die App holt: eigener
Kalender-View, alle Termine sichtbar. Dazu **Push-Benachrichtigungen** aufs
iPhone, die Mark pro Termin/Kategorie selbst an- und ausschalten kann – wichtig
ist ihm, dass er *nicht* in die App schauen muss.

Technischer Rahmen (grob, noch kein Feinkonzept): kein Raspberry Pi nötig.
Stattdessen **Supabase Edge Functions + `pg_cron`**: eine Funktion pollt den
iCloud-Kalender per **CalDAV** (App-spezifisches Passwort) und legt Termine in
einer Tabelle ab; eine zweite Funktion schickt zur Terminzeit die
**Web-Push-Nachricht** (VAPID-Schlüssel, Service Worker in der PWA – iOS ≥ 16.4
unterstützt Web-Push für Home-Bildschirm-PWAs). Das ist ein bewusster
Architektur-Zusatz gegenüber dem Ursprungskonzept ("kein Server, kein Push") und
bekommt ein eigenes Konzept, sobald Etappe 1–4 stehen.

---

## 2026-09-15 – Etappe 1 (Modul Ernährung) gebaut und nach `main` gemergt

**Was:** Das erste Fachmodul ist fertig: Heute-Ansicht mit Fortschrittsring,
Liste bearbeiten (Punkte anlegen/ändern/Zeitplan setzen/sortieren/deaktivieren),
Gewicht-Ansicht mit Chart.js-Kurve, Ziel-Linie und BMI, Statistik-Tab (Streak,
Quote pro Punkt, Kalender-Heatmap, Ziel-Prognose) und ein reiner Lese-Infos-Tab.
Dazu vier Supabase-Tabellen (`checklist_items`, `daily_log`, `weight_log`,
`settings`) mit RLS und 14 Startpunkten (Ernährung + Supplements) geseedet.
Alles auf Branch `etappe-1` in kleinen Commits gebaut, nach `main` gemergt und
gepusht; GitHub Pages liefert den neuen Stand aus.

**Warum:** Nächster Schritt laut Roadmap nach Etappe 0 – der
Ernährungstracker war der ursprüngliche Auslöser für das ganze Projekt.

**Entscheidungen (aus Design-Spec
`docs/superpowers/specs/2026-09-09-etappe-1-ernaehrung-design.md`):**
- Statistiken werden **im Browser** aus dem Roh-Log berechnet (reine
  JS-Funktionen, mit `node:test` prüfbar), nicht in Postgres/SQL-Views.
- Kalender-Heatmap als handgebautes CSS-Grid statt Chart.js-Plugin.
- Punkte vorerst nur als Häkchen (`typ = 'haken'`); Mengen stehen im
  Namen. Zähler-Typ (`zaehler`, `zielwert`, `einheit`) ist im Datenmodell
  vorbereitet, aber ungenutzt.
- Alle Punkte sind Pflicht (`pflicht = true`); Bonus-Punkte bewusst nicht
  gebaut, Spalte bleibt für später.
- Kein Realtime – Laden beim Öffnen + „Aktualisieren"-Knopf.
- Löschen von Punkten ist Soft-Delete (`aktiv = false`), Historie bleibt
  auswertbar.

**Stand danach:** `main` enthält Etappe 1, live unter
<https://mkunau-ctrl.github.io/mein-dashboard/>. 28 Unit-Tests grün
(`npm test`). Supabase-Projekt `mein-dashboard`: alle vier Tabellen mit RLS
aktiv, 14 Checklisten-Punkte, 3 Settings (`koerpergroesse_cm`,
`zielgewicht_kg`, `infos_markdown`), erste echte Nutzungsdaten vorhanden
(Gewicht 1 Eintrag, Tages-Log 6 Einträge).

**Offene Punkte / Nächste Schritte:**
- **Doku-Nachtrag:** Dieser Merge (15.09.) wurde nicht sofort dokumentiert –
  dieser Log-Eintrag und das `CLAUDE.md`-Update holen das nach.
- Echte PNG-Icons 192/512 + `apple-touch-icon` fehlen weiterhin (Punkt aus
  Etappe 0, in Etappe 1 nicht nachgeliefert).
- Manueller Testlauf auf iPhone-Safari (kompletter Ablauf aus der Design-Spec)
  ist nicht dokumentiert bestätigt – bei Gelegenheit nachprüfen.
- Hauptgerichte-Rotation, Zähler-Punkte-UI, Bonus-Punkte-Umschalter: bewusst
  zurückgestellte Ideen aus der Design-Spec, nicht vergessen.
- Danach: Etappe 2 (Modul To-dos) laut Roadmap.

---

## 2026-09-09 – Etappe 0 nach `main` gemergt, GitHub Pages live

**Was:** Nach dem PC-Absturz vom Vortag den Stand geprüft: der gesamte
Etappe-0-Code war in 6 Commits auf Branch `etappe-0` gesichert, nichts verloren,
Arbeitsverzeichnis sauber, 8 Tests grün. Branch `etappe-0` per `--no-ff` nach
`main` gemergt, `main` nach GitHub gepusht, GitHub Pages über die API auf
`main` / `/root` aktiviert. Build lief durch, Seite antwortet mit HTTP 200.

**Warum:** Etappe 0 war fertig gebaut, aber weder gemergt noch deployt – die
App war noch nicht live. Das waren die offenen Punkte aus dem vorigen
Log-Eintrag.

**Entscheidungen:** Merge mit `--no-ff`, damit die Etappe als zusammenhängender
Block in der Historie sichtbar bleibt. Pages-Aktivierung per `gh api` (Classifier
ließ Push und API-Call durch).

**Stand danach:** <https://mkunau-ctrl.github.io/mein-dashboard/> ist live. Der
Login-Screen lädt sauber (im Browser geprüft, keine Konsolenfehler,
`supabase-js` per jsDelivr-ESM wird ohne Fehler geladen). `index.html`, `js/*`,
`manifest.webmanifest`, `icon.svg` werden alle mit 200 ausgeliefert. Das
Supabase-Projekt `mein-dashboard` (Ref `vogztxoaqbnuciboughd`, Region
`eu-west-1`) ist `ACTIVE_HEALTHY`.

**Offene Punkte:**
- Mark macht einen echten Magic-Link-Login auf der Live-URL (Desktop + iPhone
  „Zum Home-Bildschirm"). Der eigentliche Mail-Versand wurde noch **nicht**
  ausgelöst – wartet auf Marks Okay.
- Danach `USER_ID` (Marks Auth-UID) per Supabase-MCP auslesen und in `CLAUDE.md`
  eintragen (`select id, email from auth.users;`).
- Echte PNG-Icons 192/512 + `apple-touch-icon` (Etappe 1).
- Evtl. eigenes SMTP für die Magic-Link-Mails (Supabase-Default hat Limits).
- Realtime-Aktualisierung des Dashboards (später).
- Danach: Feinplan Etappe 1 (Modul Ernährung) über `superpowers:writing-plans`.

---

## 2026-09-09 – Etappe 0: Grundgerüst gebaut (Branch `etappe-0`)

**Was:** Das komplette Grundgerüst der App wurde auf dem Branch `etappe-0`
gebaut: Test-Harness + Router (`parseHash`), Supabase-Client + Auth-Wrapper
(Magic-Link), Modul-Registry, HTML-Shell mit Login-Flow und leerem
Kachel-Raster, PWA-Manifest + SVG-Icon. Dazu die Modul-Schnittstellen-Doku
(`js/module/README.md`).

**Warum:** Bevor das erste Fachmodul (Ernährung) entsteht, braucht es ein
tragfähiges, getestetes Skelett: Auth, Routing, eine Stelle, an der sich Module
anmelden, und ein deploybares statisches Bundle.

**Entscheidungen:**
- Tests mit `node --test` (Bordmittel) statt eines Test-Frameworks – kein
  zusätzliches Dependency, kein Build.
- `supabase-js` exakt gepinnt auf `2.116.0` über jsDelivr-ESM nach einem
  kurzen Supply-Chain-Review (kein `@latest`, feste Version).
- Hosting weiterhin GitHub Pages, statisches Repo, kein Build-Schritt.

**Stand danach:** 8 Unit-Tests grün (`npm test`). Aller Code liegt auf Branch
`etappe-0`. **Deploy und Merge nach `main` stehen noch aus** – die App ist noch
nicht live.

**Offene Punkte:**
- Branch `etappe-0` nach `main` mergen.
- GitHub Pages aktivieren (Settings → Pages, Branch `main` / `/root`).
- End-to-End-Test des Magic-Link-Logins auf der Live-URL (Desktop + iPhone).
- `USER_ID` (Marks Auth-UID) nach dem ersten Login in `CLAUDE.md` eintragen.
- Echte PNG-Icons 192/512 + `apple-touch-icon` in Etappe 1 nachliefern
  (iOS nutzt sonst einen Screenshot für den Home-Bildschirm).
- Evtl. eigenes SMTP für die Magic-Link-Mails (Supabase-Default hat Limits).
- Realtime-Aktualisierung des Dashboards (später).

---

## 2026-09-08 – Zentrale Projekt-Ablage eingeführt

**Was:** Ab jetzt liegen alle Projekte unter `C:\Users\PC\Projekte\<name>`.
`mein-dashboard` wurde nach `C:\Users\PC\Projekte\mein-dashboard` verschoben.
Diese Konvention ist im Skill `projekt-workflow` und im Gedächtnis festgehalten.

**Warum:** Marks Projekte lagen verstreut (teils direkt im Benutzerordner, teils
auf dem Desktop). Er will einen festen großen Ordner mit einem Unterordner pro
Projekt, damit er auf jedem Rechner alles an derselben Stelle findet.

**Stand danach:** mein-dashboard, energiesparer-modus, monitor-focus-follow,
tischlerei-kosiek, malerbetrieb-heinze-website, tobis-hausmeister-redesign sind
umgezogen. Die geplante Aufgabe „MonitorFocusFollow" wurde auf den neuen Pfad
angepasst und läuft. fehlzeiten-portal, tipptrainer und
rechtschreibung-windows-verbessern konnten noch nicht umziehen (laufende
Dev-Server / andere Session) – stehen noch aus.

**Offene Punkte:** die drei verbliebenen Projekte umziehen, sobald ihre
Prozesse beendet sind.

---

## 2026-09-08 – Projekt gestartet, Gesamtkonzept geschrieben

**Was:** Das Projekt "Mein Dashboard" wurde angelegt (Repo, Doku-Gerüst). Das
Gesamtkonzept liegt in `docs/specs/2026-09-08-dashboard-konzept.md`. Noch kein
Code.

**Warum:** Mark wollte ursprünglich einen Ernährungstracker (feste Tagesliste
abhaken + Statistik). Im Gespräch wurde klar, dass er eigentlich eine zentrale
Oberfläche für mehrere Lebensbereiche will (Ernährung, To-dos, Finanzen,
Lager/Ersatzteile), die er auch per Claude füttern kann. Deshalb erst ein
Gesamtkonzept, dann Modul für Modul.

**Entscheidungen:**
- Web-App statt nativer iOS-App (App-Store-Aufwand zu hoch), läuft überall im
  Browser, iPhone per "Zum Home-Bildschirm".
- Hosting: GitHub Pages, öffentliches Repo. Kein eigener Server.
- Technik: reines HTML/CSS/JS ohne Framework/Build, `supabase-js` + `Chart.js`
  per CDN. Bewusst gegen React/Next.js entschieden (Overkill).
- Daten: Supabase (eine DB, pro Modul Tabellen). Login per Magic-Link,
  Row-Level-Security pro Zeile.
- Claude schreibt direkt in Supabase (MCP am PC, Connector in der App) – kein
  Backend nötig.
- Bewusst nicht: native App, Bank-API, Offline-Sync, Mehrbenutzer, Push.
- Modul-Reihenfolge: Ernährung → To-dos → Finanzen → Lager.

**Stand danach:** Konzept-Dokument steht. Repo wird auf GitHub gepusht. Kein
lauffähiger Code.

**Offene Punkte / Nächste Schritte:**
- Mark liest das Konzept gegen und gibt frei.
- Danach Feinplan für Etappe 0 (Grundgerüst: Repo, Supabase-Projekt, Auth,
  leeres Kachel-Raster, Deploy) über die Superpowers-Planungs-Skills.
- Supabase-Projekt "mein-dashboard" anlegen.
