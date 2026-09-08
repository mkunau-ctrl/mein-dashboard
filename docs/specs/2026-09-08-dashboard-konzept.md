# Konzept: Mein Dashboard

**Datum:** 2026-09-08
**Status:** Konzept abgestimmt, Umsetzung noch nicht begonnen
**Autor:** Mark + Claude

---

## 1. Idee in einem Absatz

Eine private Web-App ("Mein Dashboard"), die Mark auf jedem Gerät im Browser
öffnet – am PC und auf dem iPhone (dort per "Zum Home-Bildschirm" wie eine App).
Sie bündelt mehrere Lebensbereiche als **Module**: zuerst Ernährung, später
To-dos, Finanzen und Lager/Ersatzteile. Daten liegen in einer Supabase-Datenbank.
Mark kann alles selbst in der App eintragen **oder** Claude bitten, Einträge zu
machen ("trag 20 € Tanken ein", "heute 82,3 kg") – Claude schreibt dann direkt in
Supabase, das Dashboard zeigt es sofort.

## 2. Warum

Mark will nicht mehrere Einzel-Apps, sondern **eine Oberfläche für sein Leben**,
die er per Sprache/Chat mit Claude füttern kann und die ihm zeigt, wie oft er
seine Ziele realistisch erreicht. Der Auslöser war der Wunsch nach einem
Ernährungstracker (feste Tagesliste abhaken + Statistik); im Gespräch wurde
daraus das Dashboard-Konzept.

## 3. Grundsatzentscheidungen

| Thema | Entscheidung | Warum / Alternativen |
|---|---|---|
| Form | Web-App, **eine HTML-Seite** + Module | Keine native iOS-App (App-Store-Aufwand). Web läuft überall. |
| Hosting | **GitHub Pages**, öffentliches Repo `mein-dashboard` | Kostenlos, simpel, kein Server. Vercel wäre auch ok, aber nicht nötig. |
| Technik | **Kein Framework, kein Build.** Reines HTML/CSS/JS, `supabase-js` + `Chart.js` per CDN | Passt zum Wunsch "einfache HTML-Seite". React/Next.js wäre Overkill. |
| Daten | **Supabase** (Cloud-Postgres), eine DB, pro Modul eigene Tabellen | Sync über alle Geräte; Claude kann per MCP direkt schreiben. Mark nutzt Supabase schon. |
| Login | **Magic-Link** an m.kunau@gmx.de (Supabase Auth) | Echte Sicherheit für private Daten (Finanzen). Kein Passwort zu merken. |
| Zugriffsschutz | **Row-Level-Security**: jede Zeile `user_id = auth.uid()` | Anon-Key darf öffentlich im Quelltext stehen – das ist der vorgesehene Supabase-Weg. |
| Claude-Anbindung | Claude schreibt/liest Supabase-Tabellen (MCP am PC, Connector in der Claude-App) | Kein eigener Backend-Server nötig. |
| Offline | **Nicht** unterstützt | Braucht ohnehin Netz für Supabase. |
| Mehrbenutzer | **Nein**, nur Mark | Hält Datenmodell und Auth einfach. |

**Bewusst NICHT im Projekt** (damit es später nicht versehentlich gebaut wird):
native App, Bank-/Konto-API-Anbindung, Offline-Sync, Team-/Freigabe-Funktionen,
Benachrichtigungen/Push (kann später als eigener Wunsch kommen).

## 4. Architektur

### 4.1 Oberfläche

- **Startseite:** Kachel-Raster, eine Kachel pro Modul. Jede Kachel zeigt den
  heutigen Stand (z. B. "Ernährung 4/6", "Ausgaben heute 32 €").
- **Antippen** öffnet das Modul (Detailansicht + Statistik). Zurück zum Raster.
- Kein echtes Routing nötig – Umschalten per JS (Hash-Route `#/ernaehrung` ok,
  damit iPhone-Zurück funktioniert).

### 4.2 Dateien im Repo

```
index.html                 – App-Hülle: Login-Screen + leeres Kachel-Raster
style.css                  – gemeinsames Design
app.js                     – Start, Auth (Magic-Link), Modul-Registry, Routing
supabase.js                – Supabase-Client (URL + Anon-Key)
module/
  ernaehrung.js            – Modul 1: Heute-Ansicht, Liste bearbeiten, Gewicht
  ernaehrung-stats.js      – Modul 1: Streak, Quoten, Heatmap, Prognose
manifest.webmanifest       – PWA: Name, Icon, Farben
icons/                     – App-Icons (iOS/Android)
docs/
  PROJEKT-LOG.md           – chronologisches Logbuch (neueste zuerst)
  specs/                   – dieses Konzept + spätere Feinpläne pro Etappe
CLAUDE.md                  – Einstiegshilfe für die nächste Session
```

Jedes Modul ist eine eigenständige JS-Datei mit fester Schnittstelle
(`init(container, supabase)` + `renderKachel()`), damit ein neues Modul
hinzugefügt werden kann, ohne bestehende zu ändern.

### 4.3 Daten (Supabase)

Alle Tabellen: Spalte `user_id uuid` (Default `auth.uid()`), RLS-Policy
`user_id = auth.uid()` für select/insert/update/delete.

**Modul 1 – Ernährung:**

| Tabelle | Spalten (Kern) | Zweck |
|---|---|---|
| `checklist_items` | `id`, `label`, `typ` (`haken`\|`zaehler`), `zielwert numeric`, `einheit text`, `pflicht bool`, `sortierung int`, `aktiv bool`, `erstellt_am` | Die feste Tagesliste. Deaktivierte Punkte bleiben für die Historie erhalten. |
| `daily_log` | `id`, `datum date`, `item_id → checklist_items`, `wert numeric`, `erledigt bool`, `aktualisiert_am` | Ein Eintrag pro Tag + Item. Unique (`user_id`, `datum`, `item_id`). |
| `weight_log` | `id`, `datum date`, `gewicht_kg numeric` | Gewichtsverlauf. Unique (`user_id`, `datum`). |
| `settings` | `key text`, `value jsonb` | Einzelwerte, z. B. `koerpergroesse_cm`, `zieldefinition`. |

**Tagesziel-Logik:** "Ziel an Tag X erreicht" = für alle am Tag X aktiven
`pflicht`-Items gibt es einen `daily_log`-Eintrag mit `erledigt = true`
(bzw. `wert >= zielwert` bei Typ `zaehler`). Bonus-Items zählen in die
Punkt-Quote, aber nicht ins Tagesziel.

**Spätere Module** bekommen eigene Tabellen (Skizze, wird je Etappe konkretisiert):
- To-dos: `todos` (`text`, `faellig date`, `erledigt bool`, `wiederkehrend`).
- Finanzen: `expenses` (`betrag`, `kategorie`, `notiz`, `datum`), `finance_settings`
  (`kontostand_start`, `stand_datum`); aktueller Stand = Start − Summe Ausgaben seither.
- Lager: `parts` (`bezeichnung`, `bestand`, `soll_bestand`, `status`
  `fehlt`\|`bestellt`\|`da`, `einzelwert`); Warenwert = Σ `bestand · einzelwert`.

### 4.4 Claude ↔ Supabase

- **Am PC (Claude Code):** Supabase-MCP ist verbunden. Claude führt SQL /
  Inserts aus. Da MCP mit Admin-Rechten arbeitet, setzt Claude die `user_id`
  explizit auf Marks Auth-ID (wird in `CLAUDE.md` hinterlegt).
- **Am Handy (Claude-App):** Supabase-Connector, gleiche Idee.
- Typische Sätze: "trag heute Wasser 3 von 3 ein", "82,3 kg heute",
  "20 € Tanken gestern", "Ersatzteil Display iPhone 15 als bestellt markieren".
- Das Dashboard pollt beim Öffnen / auf Knopfdruck neu (kein Realtime nötig,
  kann später ergänzt werden).

## 5. Modul 1 – Ernährung (erste echte Etappe)

### Ansichten

1. **Heute:** feste Liste. `haken`-Punkte antippen = erledigt. `zaehler`-Punkte
   mit +/− (Wasser 1/3 → 2/3 …). Oben ein Fortschrittsring "Tagesziel"
   (erfüllte Pflicht-Punkte / alle Pflicht-Punkte).
2. **Liste bearbeiten:** Punkte anlegen / umbenennen / Zielwert ändern /
   deaktivieren / sortieren.
3. **Gewicht:** heutigen Wert eintragen, Mini-Verlaufskurve, optional BMI
   (wenn `koerpergroesse_cm` gesetzt).
4. **Statistik:**
   - **Streak:** aktuelle + längste Serie an Tagen mit erreichtem Tagesziel.
   - **Quote pro Punkt:** Prozent der Tage (seit Anlage bzw. letzte 30/90 Tage),
     an denen der Punkt erfüllt war.
   - **Kalender-Heatmap:** Monatsraster, je Tag grün (Ziel erreicht) / gelb
     (teilweise) / rot (wenig) / grau (kein Eintrag).
   - **Ziel-Prognose:** aus der Erfolgsquote der letzten 14 Tage hochgerechnet:
     "≈ 21 von 30 Tagen".

### Definition of Done Etappe 1

- Liste konfigurierbar, Heute-Ansicht funktioniert auf iPhone-Safari + Desktop.
- Gewicht erfassbar mit Verlauf.
- Alle vier Statistiken korrekt (mit Testdaten geprüft).
- Claude kann per Supabase einen Tageseintrag setzen und er erscheint im Dashboard.
- `PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, alles auf GitHub.

## 6. Etappen

| Etappe | Inhalt | Ergebnis |
|---|---|---|
| **0 – Grundgerüst** | Repo, Supabase-Projekt anlegen, Auth (Magic-Link), leeres Kachel-Raster, Deploy auf GitHub Pages, PWA-Manifest, Claude↔Supabase einmal durchgetestet | Login funktioniert, leeres Dashboard ist live erreichbar |
| **1 – Ernährung** | Modul 1 komplett (siehe Abschnitt 5) | Erster echter Nutzen |
| **2 – To-dos** | Aufgaben-Modul | |
| **3 – Finanzen** | Ausgaben + Kontostand + Monatsübersicht | |
| **4 – Lager/Ersatzteile** | Teileliste, Status, Warenwert, Bestell-Merkliste | |

Reihenfolge von Mark bestätigt: Ernährung → To-dos → Finanzen → Lager.

Jede Etappe: erst kurzer Feinplan in `docs/specs/`, dann bauen (wo sinnvoll
Tests zuerst), dann `PROJEKT-LOG.md` + `CLAUDE.md` pflegen, dann pushen.

## 7. Offene Punkte

- Supabase-Projekt: neues eigenes Projekt oder bestehendes mitnutzen? (Empfehlung:
  eigenes Projekt "mein-dashboard".)
- GitHub Pages für öffentliches Repo ist kostenlos – bestätigt.
- Icon/Design für die PWA (kann simpel starten).
- Körpergröße-Wert und genaue Zieldefinition trägt Mark beim Bau von Etappe 1 ein.
- Realtime-Aktualisierung des Dashboards: vorerst manuelles Neuladen, später ggf.
  Supabase-Realtime.
