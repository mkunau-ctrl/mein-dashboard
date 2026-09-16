# Projekt-Log: Mein Dashboard

Chronologisches Logbuch, neueste Einträge oben. Prosa, kein Code-Dump.

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
