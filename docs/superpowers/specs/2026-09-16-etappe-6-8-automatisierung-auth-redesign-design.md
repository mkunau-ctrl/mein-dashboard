# Etappe 6–8 – E-Mail-Automatisierung, Passkey-Login, Redesign: Design

**Datum:** 2026-09-16
**Status:** bereit zum Bauen
**Vorgänger:** `docs/PROJEKT-LOG.md` (Einträge vom 2026-09-16 zu Etappe 5 und
zum `quelle`-Feld), Muster aus Etappe 1–5.

## 1. Ziel

Mark will "eine App statt 10.000": möglichst viele Alltagsdinge in **Mein
Dashboard** zusammenführen, ohne dass er selbst Daten in zehn verschiedenen
Apps pflegen muss. Drei bisher getrennt besprochene Wünsche werden hier in
einem gemeinsamen Entwurf zusammengefasst, aber weiterhin in eigenen Etappen
gebaut und dokumentiert:

- **Etappe 6 – E-Mail-Automatisierung:** ein täglicher lokaler Scan von
  Marks GMX-Postfach erkennt Belege, Sendungen (DHL/Hermes), Amazon-Bestellungen
  und Termine/Fristen automatisch. Abo-Erkennung kommt ohne zusätzlichen
  E-Mail-Scan aus den bereits gespeicherten Ausgaben.
- **Etappe 7 – Login-Methoden:** Passkey als Haupt-Login zusätzlich zum
  bestehenden E-Mail-Magic-Link. Kein SMS-Login (Entscheidung vom 2026-09-16:
  laufende Kosten + Telefonnummer-Speicherung sind Mark das nicht wert).
- **Etappe 8 – Redesign:** dunkles Theme für die ganze App nach einem
  Referenz-Mockup (Banking-App-Look), inkl. neuer "Projekte"-Kachel mit
  Überblick über Marks andere GitHub-Projekte.

Zusätzlich eine kleine Doku-Ergänzung ohne eigenen Bau-Aufwand: das
bestehende Diktat-Muster ("Mark erzählt Claude im Chat, Claude trägt in
Supabase ein" – bisher nur für Berichtsheft und Finanzen-Belege in
`CLAUDE.md` festgehalten) wird in derselben `CLAUDE.md`-Aktualisierung auch
für die Module To-dos und Lager als gültiger Weg dokumentiert. Kein neues
Backend, keine neue API – nur die bestehende Konvention erweitert.

Reihenfolge beim Bauen (siehe Abschnitt 8): 6 vor 7 vor 8, weil 6 den
größten Nutzen bei überschaubarem Risiko bringt und die neuen Tabellen aus
Etappe 6 im Redesign (Etappe 8) direkt mit dargestellt werden sollen.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Ein Scan-Task statt vieler | Ein täglicher Windows-Scheduled-Task liest das GMX-Postfach einmal und klassifiziert jede Mail per `claude -p` in `beleg` \| `sendung` \| `amazon` \| `termin` \| `sonstiges` | Ein Task, ein Zugangsdaten-Satz, weniger laufende Teile zu pflegen als 4 getrennte Automatisierungen. |
| Abo-Erkennung ohne E-Mail-Scan | Abos werden aus bereits vorhandenen `expenses`-Einträgen berechnet (wiederkehrender Händler, ähnlicher Betrag, ~monatlicher Abstand) | Braucht keine neue Datenquelle – die Belege liegen durch Etappe 6 sowieso schon vor. Reine Anzeige-/Berechnungslogik im Finanzen-Modul. |
| Sendungsverfolgung – Status-Abruf | **Technische Unsicherheit, wird als Spike zu Buildbeginn geklärt:** ob DHL/Hermes einen einfachen, kostenlosen Status-Abruf per Trackingnummer bieten. Fallback, falls nicht: nur Trackingnummer + Link zur Trackingseite speichern, kein Live-Status. | Verhindert, dass der Plan auf einer ungeprüften Annahme aufbaut. |
| Passkey – Umfang | **Weiterer Spike zu Buildbeginn:** ob Supabase Auth Passkeys aktuell als vollwertige Erstanmeldung unterstützt oder nur als Zusatzfaktor (MFA). Fallback, falls nur MFA: einmalig per E-Mail-Link einloggen, danach Passkey hinterlegen, danach direkt per Passkey. | Gleicher Grund wie oben – Machbarkeit vor Festlegung prüfen. |
| Kein SMS-Login | Nur Passkey + E-Mail-Link | Von Mark am 2026-09-16 entschieden: SMS kostet laufend pro Nachricht (bezahlter Anbieter nötig) und würde seine Telefonnummer in der DB erfordern. |
| Projekte-Kachel – Datenquelle | Lokaler Scan von `PROJEKT-LOG.md` in jedem Unterordner von `C:\Users\PC\Projekte\*`, keine GitHub-API | Die Logs liegen bereits lokal vor und sind laut `projekt-workflow`-Skill die Wahrheitsquelle – kein zusätzlicher externer Zugriff nötig. |
| Secrets | GMX-App-Passwort, Supabase-Service-Role-Key (für Insert ohne Login-Session) liegen ausschließlich lokal in einer `.env`-Datei (per `.gitignore` ausgeschlossen), nie im Repo, nie im Chat | Wie im Log vom 2026-09-16 vorbereitet; Service-Role-Key umgeht RLS komplett. |

## 3. Etappe 6 – E-Mail-Automatisierung

### 3.1 Ablauf

Täglicher Windows-Scheduled-Task (Muster wie `energiesparer-modus`/
`auto-weiter`) startet ein lokales Skript:

1. Per IMAP (`imap.gmx.net:993`, TLS) neue Mails seit letztem Lauf abrufen.
2. Jede Mail per `claude -p` klassifizieren und strukturiert extrahieren
   lassen (ein Prompt, Ausgabe als JSON: `{typ, ...felder}`).
3. Je nach `typ` in die passende Supabase-Tabelle schreiben:
   - `beleg` → `expenses` (`quelle:'email'`, wie vorbereitet).
   - `sendung` / `amazon` → `sendungen` (neu, siehe 3.2).
   - `termin` → `termine` (neu, siehe 3.2).
   - `sonstiges` → verworfen, nichts wird geschrieben.
4. Für alle offenen (nicht "zugestellt") Einträge in `sendungen`: Status per
   Trackingnummer abrufen und aktualisieren (Umfang abhängig vom Spike-
   Ergebnis, siehe Abschnitt 2).
5. Letzten erfolgreichen Lauf-Zeitpunkt lokal merken (z. B. kleine JSON-Datei
   neben dem Skript), damit der nächste Lauf nur wirklich neue Mails holt.

### 3.2 Neues Datenmodell (Supabase, Schema `public`, RLS wie bestehende Module)

**`sendungen`**
| Spalte | Typ | Hinweis |
|---|---|---|
| `haendler` | `text not null` | z. B. "DHL", "Hermes", "Amazon" |
| `trackingnummer` | `text` | kann bei Amazon-Bestellungen ohne eigene Trackingnummer leer sein |
| `beschreibung` | `text` | z. B. Bestellinhalt, falls aus der Mail erkennbar |
| `status` | `text not null default 'unterwegs'` | `unterwegs` \| `zugestellt` \| `unbekannt` |
| `letzte_aktualisierung` | `timestamptz` | wann der Status zuletzt geprüft wurde |
| `quelle` | `text not null default 'email'` | für spätere manuelle Einträge erweiterbar |

**`termine`**
| Spalte | Typ | Hinweis |
|---|---|---|
| `titel` | `text not null` | z. B. "Prüfungsanmeldung IHK" |
| `faellig_am` | `date not null` | |
| `erledigt` | `boolean not null default false` | Soft-Delete-Muster wie bei den Checklisten-Punkten |
| `quelle` | `text not null default 'email'` | |

### 3.3 Abo-Erkennung (Finanzen-Modul, keine neue Tabelle)

Neue reine Funktion in `js/module/finanzen/berechnung.js`, z. B.
`erkenneAbos(expenses)`: gruppiert nach Händler, findet Gruppen mit ≥ 2
Einträgen in ähnlichem monatlichem Abstand (± ein paar Tage Toleranz) und
ähnlichem Betrag, gibt `{haendler, betrag, naechsteFaelligkeit}` zurück.
Anzeige als neuer Tab oder Abschnitt "Abos" im Finanzen-Modul.

### 3.4 Neues Modul "Sendungen" (Pakete + Termine)

`js/module/sendungen/` nach dem etablierten Muster (`index.js`, `daten.js`,
Tabs "Pakete" / "Termine"). Zeigt offene Sendungen mit Status und offene
Termine/Fristen, sortiert nach Dringlichkeit.

## 4. Etappe 7 – Login-Methoden

- Bestehender E-Mail-Magic-Link bleibt unverändert erhalten (Fallback).
- Passkey (WebAuthn) wird als zusätzliche, bevorzugte Anmeldeart ergänzt.
  Genauer Ablauf hängt vom Spike-Ergebnis ab (Abschnitt 2): entweder direkte
  Passkey-Erstanmeldung, oder Passkey als Zweitfaktor nach einmaligem
  E-Mail-Link-Login.
- Kein SMS-Code.
- `js/auth.js` bekommt die zusätzlichen Funktionen für Passkey-Registrierung
  und -Anmeldung; `entscheideAnsicht` (`js/view.js`) bleibt unverändert
  (weiterhin nur `'login'` vs. `'dashboard'` anhand der Session).

## 5. Etappe 8 – Redesign + Projekte-Kachel

### 5.1 Visuelles Redesign

Dunkles Theme für die ganze App, angelehnt an Marks Referenzbild
(Screenshot vom 2026-09-16):

- **Kopf-Kachel** im Stil der "Guthaben"-Karte: Gesamtstand (z. B.
  Finanzen-Kontostand) groß, farbiger Verlauf/Akzentfarbe auf dunklem Grund.
- **Balkendiagramm** für Statistiken (Chart.js per CDN – war schon im
  Gesamtkonzept vom 2026-09-08 vorgesehen, bisher nicht eingebunden).
- **Listen mit farbigen Icons** pro Kategorie/Händler (Ausgaben, Sendungen).
- **Feste Bottom-Nav** für die Module statt der bisherigen Kachel-Startseite
  als einzigem Einstieg – Kachel-Übersicht bleibt als "Home"-Ansicht in der
  Bottom-Nav erhalten.
- Betrifft `app.css` (Farbvariablen, Grundlayout) und die `renderKachel`/
  Render-Funktionen jedes Moduls – keine Änderung an `daten.js`/Berechnungs-
  Logik der bestehenden Module.

### 5.2 Projekte-Kachel

- Neue Tabelle `projekte`: `name`, `letzter_stand` (Kurztext aus dem
  neuesten `PROJEKT-LOG.md`-Eintrag), `offene_punkte` (Text/Liste),
  `aktualisiert_am`.
- Wird vom selben täglichen Scheduled-Task aus Etappe 6 mitgepflegt (oder
  einem zweiten, kurzen Task) – liest `PROJEKT-LOG.md` in jedem Unterordner
  von `C:\Users\PC\Projekte\*`, nimmt den obersten (neuesten) Abschnitt.
- Neues, einfaches Modul `js/module/projekte/` (nur Anzeige, kein
  Formular – Mark pflegt seine Projekte über die Projekt-Logs, nicht über
  das Dashboard).

## 6. Reihenfolge / Abhängigkeiten

```
Etappe 6 (E-Mail-Automatisierung)
   → liefert sendungen/termine/expenses-Daten
Etappe 7 (Passkey-Login)
   → unabhängig von 6, kann parallel oder danach
Etappe 8 (Redesign + Projekte-Kachel)
   → zeigt u. a. die Daten aus Etappe 6 im neuen Design,
     Projekte-Kachel unabhängig von 6/7
```

Gebaut wird trotzdem **in dieser Reihenfolge** (6 → 7 → 8), damit jede
Etappe für sich testbar bleibt und das Redesign am Ende auf einer bereits
vollständigen Datenbasis aufbaut.

## 7. Definition of Done (gesamt)

- [ ] Spike-Ergebnisse zu DHL/Hermes-Status-Abruf und Supabase-Passkey-Umfang
      dokumentiert (Log-Eintrag), Fallback-Entscheidung falls nötig.
- [ ] Tabellen `sendungen`, `termine`, `projekte` mit RLS.
- [ ] Täglicher Scheduled-Task läuft, schreibt sichtbar neue Einträge.
- [ ] Modul "Sendungen" zeigt Pakete + Termine.
- [ ] Abo-Erkennung im Finanzen-Modul sichtbar.
- [ ] Passkey-Login funktioniert (in der vom Spike bestimmten Form),
      E-Mail-Link funktioniert weiterhin.
- [ ] Redesign auf allen Modulen angewendet, Bottom-Nav funktioniert.
- [ ] Projekte-Kachel zeigt echte Daten aus mindestens 3 Projekten.
- [ ] `node:test` weiterhin grün für alle bestehenden und neuen reinen
      Funktionen.
- [ ] `docs/PROJEKT-LOG.md` (je ein Eintrag pro Etappe) + `CLAUDE.md`
      aktualisiert, nach `main` gemergt, gepusht.

## 8. Bewusst NICHT in Etappe 6–8

- Kein SMS-Bestätigungscode (Entscheidung 2026-09-16).
- Keine Passwort-/Zugangsdaten-Verwaltung (zu sensibel für dieses Setup).
- Keine GitHub-API-Anbindung für die Projekte-Kachel – nur lokale Logs.
- Kein Wetter-Widget, kein Google-Kalender – waren Ideen, wurden von Mark
  nicht ausgewählt (2026-09-16).
- Keine Live-Automatisierung "ohne offene Chat-Session" fürs Diktat – das
  bestehende Chat-Muster wird nur dokumentarisch auf To-dos/Lager erweitert
  (siehe Abschnitt 1), nicht durch eine neue API/Automatisierung ersetzt.
