# F1 – Modul „KI“ im Dashboard: Agenten ansehen, mit ihnen chatten, Aufgabenverteilung live (Plan des Chefs)

Hintergrund: AURORA (Multi-Agenten-System auf dem Laptop des Nutzers) spiegelt Status, Aufgaben und Ereignisse in Supabase-Tabellen `aurora_*` (Schema und Rechte: `supabase/migrations/2026-11-21-aurora.sql`, bereits angewendet). Dieses Modul zeigt sie an. Der Nutzer will **auf dem Handy** im Dashboard: einzelne KIs anklicken, deren Status und Aufgaben sehen, mit ihnen chatten und live sehen, wie Aufgaben verteilt werden.

Grenzen: Branch `aurora-modul` (Worktree `mein-dashboard-aurora`) – **nicht** auf `main`/`redesign` wechseln, **kein** Push/Merge, **keine** Verbindung zu Supabase (Entwicklung nur mit Mock-Daten), `.env*` tabu, keine neuen Pakete (reines ES-Modul wie die anderen Module, `node --test`), `supabase/`-Ordner nicht anfassen. Bestehende Tests dürfen nicht abgeschwächt werden; `npm test` muss grün bleiben.

## Konventionen dieses Projekts (siehe `js/module/README.md`, Beispiel `js/module/flipping/`, `js/module/todos/`)
- Modul = Ordner `js/module/ki/` mit `index.js`, die `registriere({id:'ki', titel:'KI', icon, init, aktualisieren})` aufruft. Routing per Hash `#/ki/<unterseite>/<detail>` (`js/router.js`, Detail erlaubt `[a-z0-9-]+`; Agentennamen und UUIDs passen).
- Supabase-Zugriff nur in `daten.js` (`import { supabase } from '../../supabase.js'`), reine Logik in eigenen Dateien mit `node:test`-Tests unter `test/`.
- Aktivieren: eine Importzeile in `js/app.js`; Navigation: `NAV_MODULE` in `js/app.js` (aktuell 5 Einträge `home, finanzen, flipping, suche, profil`) um `'ki'` als 6. Tab ergänzen und am schmalen Handy-Layout prüfen (`#tab-leiste-unten` in `app.css`); passt es nicht, Tabs enger setzen statt einen zu entfernen.
- Alles Nutzer-/Agenteninhalt wird **nur über `textContent`/`createElement`** eingefügt (nie `innerHTML` mit Daten, kein Markdown-Rendering mit HTML). Agentenantworten sind untrusted.
- Stil: bestehende Klassen/CSS-Variablen aus `app.css` nutzen (Theme hell/dunkel), eigene Regeln in `js/module/ki/ki.css` oder – wenn dort sonst nirgends separate CSS-Dateien üblich sind – in `app.css` unter eigenem Präfix `ki-`. Mindestens 44 px große Tippflächen, Tabellen vermeiden (Karten und Listen), kein horizontales Scrollen.

## Datenmodell (nur lesen; Chat/Aufträge anlegen)
- `aurora_status` (1 Zeile): `budget_limit_eur, budget_verbraucht_eur, budget_reserviert_eur, budget_stufe, kill_switch, gesundheit (jsonb), agenten_aktiv, aktualisiert_am`.
- `aurora_agenten`: `agent, titel, beschreibung, status (bereit|arbeitet|wartet|fehler|aus), aufgabenklasse, aktuelle_aufgabe_id, aktuelle_aufgabe, offene_aufgaben, heute_aufrufe, heute_kosten_eur, zuletzt_aktiv, aktualisiert_am`.
- `aurora_aufgaben`: `id, eltern_id, agent, status (CREATED QUEUED ASSIGNED RUNNING REVIEW COMPLETED FAILED RETRY_PENDING BLOCKED CANCELLED), quelle, eingabe, erfolgskriterium, ergebnis, kosten_eur, erstellt_am, aktualisiert_am`.
- `aurora_ereignisse`: `aurora_id, aufgabe_id, zeitpunkt, akteur, art, von_status, nach_status, detail`.
- `aurora_chat`: `id, agent, rolle (nutzer|agent|system), text, status (neu|angenommen|in_arbeit|fertig|fehler), aufgabe_id, erstellt_am`. **Anlegen** vom Dashboard: `insert({agent, rolle:'nutzer', text, status:'neu'})` (genau diese Felder, sonst lehnt die Datenbank ab). Text 1–4000 Zeichen.
- `aurora_auftraege`: `id, agent (Standard orchestrator), ziel, erfolgskriterium, status (neu|angenommen|abgelehnt|fehler), aufgabe_id, fehler, erstellt_am`. Anlegen: `insert({agent, ziel, erfolgskriterium})`.
- Gültige Agenten für Chat/Aufträge: `ceo, orchestrator, research, developer, qa, visual, memory, security` (der `monitor` ist reiner Beobachter ohne Chat: Karte zeigen, Chat deaktivieren).

## Ansichten
1. **`#/ki` Übersicht:** Kopf mit Budget (verbraucht/Limit, Balken, Stufe, **Kill-Switch deutlich als Warnband wenn aktiv**), Gesundheit (Worker/Sandbox/Modell als Punkte), Hinweis „AURORA offline“, wenn `aktualisiert_am` älter als 90 s ist (mit „zuletzt gesehen vor …“). Darunter **Agentenkarten** (alle 9): Name, Titel, Statuspunkt mit Farbe + Text (nie nur Farbe), aktuelle Aufgabe (gekürzt) oder „Leerlauf“, offene Aufgaben, Kosten heute. Tippen ⇒ `#/ki/agent/<name>`. Darunter „Neuer Auftrag“ (Textfeld, Agent-Auswahl, Standard Orchestrator, optional Erfolgskriterium) und Link „Verteilung live ansehen“ ⇒ `#/ki/verteilung`.
2. **`#/ki/agent/<name>`:** Kopf wie die Karte; Abschnitt **Chat** (Verlauf `aurora_chat` dieses Agenten, ältere oben, Nutzer rechts / Agent links / System mittig klein; Statusanzeige an der letzten Nutzernachricht: „gesendet“ (neu), „angenommen“, „arbeitet …“ (in_arbeit), „Fehler“; während auf Antwort gewartet wird ein dezenter Lade-Hinweis; Eingabefeld unten, Senden per Knopf, Enter sendet, Shift+Enter Zeilenumbruch, Doppelsenden verhindern, Feld leeren nach Erfolg, Fehler sichtbar zeigen); Abschnitt **Aufgaben** dieses Agenten (letzte 20, Status-Pille, gekürzte Eingabe, Kosten; Tippen klappt Details inkl. Ergebnis auf, Ergebnis als reiner Text mit Zeilenumbrüchen).
3. **`#/ki/verteilung`:** **Aufgabenbäume**: oberste Aufgaben (ohne `eltern_id`) der letzten 24 h, neueste zuerst; darunter eingerückt ihre Schritte (Kinder per `eltern_id`) mit Agent, Status-Pille, Kosten; offene/laufende zuerst; Tippen klappt Eingabe/Ergebnis auf. Darüber **Live-Zeitleiste** der letzten 40 Ereignisse (Zeit, Akteur, „Aufgabe X: QUEUED → ASSIGNED“ o. ä., Aufgabentitel gekürzt). Neue Zeilen kurz hervorheben (CSS-Animation, `prefers-reduced-motion` respektieren).
4. Leere Zustände sauber („Noch keine Aufgaben“, „AURORA ist nicht verbunden“), Ladezustand, Fehlerzustand mit Neu-laden-Knopf (`aktualisieren` des Moduls für den globalen Reload-Knopf).

## Live-Aktualisierung
- Supabase Realtime (`supabase.channel(...).on('postgres_changes', {event:'*', schema:'public', table:'aurora_…'}, …)`) für `aurora_agenten, aurora_aufgaben, aurora_ereignisse, aurora_status, aurora_chat`; bei Änderungen **nicht komplexe Deltas rechnen**, sondern gedrosselt (höchstens 1× pro 500 ms) die betroffenen Daten neu laden und neu zeichnen, ohne Eingabefeld/Scrollposition/aufgeklappte Karten zu verlieren.
- **Fallback Polling** alle 10 s (nur solange die KI-Ansicht sichtbar ist und der Tab im Vordergrund: `document.visibilityState`), falls Realtime nicht verbindet/abbricht. Beim Verlassen des Moduls Kanal entfernen (`supabase.removeChannel`) und Timer stoppen; kein doppeltes Abonnieren bei erneutem Betreten.
- Das Modul darf keinen Fehler in andere Module tragen; ein Fehlschlag beim Laden zeigt eine Fehlermeldung im Modul.

## Reine Logik (mit `node:test`, Dateien in `js/module/ki/`, Tests in `test/ki-*.test.js`)
- `baum.js`: `baueBaeume(aufgaben)` ⇒ Wurzeln mit Kindern (sortiert: laufend/offen zuerst, dann neueste), verwaiste Kinder (Elternaufgabe fehlt im Datensatz) werden als eigene Wurzel gezeigt; keine Endlosschleifen bei kaputten Zyklen.
- `chat.js`: `chatZustand(zeilen)` ⇒ Verlauf sortiert, Status der letzten Nutzernachricht, `wartetAufAntwort`; `pruefeEingabe(text)` (trim, 1–4000, sonst Fehlertext).
- `status.js`: Status ⇒ {Text deutsch, Farbklasse, Symbol} für Agent- und Aufgabenstatus; `istOffline(aktualisiertAm, jetzt)` (> 90 s); `vorZeit(iso, jetzt)` („vor 5 s / 3 min / 2 h“); `kuerze(text, n)`.
- `ereignisse.js`: Ereigniszeile in lesbaren deutschen Satz umwandeln (Statuswechsel, Plan, Antwort), mit Aufgaben-Lookup.
- `budget.js`: Prozent/Restbetrag, Stufenfarbe, Kill-Switch-Hinweis.
Jede Datei mindestens 5 Tests inkl. Randfälle (leere Listen, `null`-Felder, Zyklen, extrem lange Texte, `<script>`-Text bleibt Text).

## Tasks
- [x] **T1 Logik + Tests:** die fünf reinen Logikdateien samt Tests. Commit `KI-Modul: Logik`.
- [x] **T2 Daten + Rahmen:** `daten.js` (alle Ladefunktionen, `sendeChat`, `sendeAuftrag`, `abonniere(onAenderung)` mit Realtime + Polling-Fallback, `beende()`), `index.js` (Registrierung, Rahmen, Router für die drei Ansichten, `aktualisieren`), Eintrag in `js/app.js` (Import + `NAV_MODULE`) und Icon. Test mit Mock-Supabase-Client (Einspritzung statt echtem Import: `daten.js` nimmt den Client über eine Funktion `setzeClient(c)` für Tests entgegen, Standard ist der echte). Commit `KI-Modul: Rahmen`.
- [x] **T3 Ansichten + Stil:** `uebersicht.js`, `agent.js`, `verteilung.js`, CSS. Mock-Harness `test/ki-harness.html` oder `scripts/ki-harness.mjs` (statische Seite, die das Modul mit Beispieldaten und einem Fake-Client lädt, damit der Chef es im Browser/Playwright ansehen kann; **darf kein Netz/keine echten Schlüssel nutzen**). Commit `KI-Modul: Ansichten`.
- [x] **T4 Doku:** `docs/PROJEKT-LOG.md` (Eintrag, Fehler inklusive), kurzer Abschnitt in `CLAUDE.md` des Dashboards (Modul-Liste), `js/module/README.md` falls nötig. Abschlussbericht in `docs/F1-BERICHT.md` mit Testzahlen und offenen Punkten.

## Abnahme (macht der Chef)
`npm test`; Mock-Harness im Browser bei 390 px und 820 px (iPad) Breite ansehen; Realtime-Test gegen echte Supabase mit AURORA-Sync; dann `main` mergen und pushen.
