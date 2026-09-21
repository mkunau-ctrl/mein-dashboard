# Etappe 4, Sub-Etappe P – Kalender-Export (ICS): Design

**Datum:** 2026-09-21
**Status:** Entwurf — enthält vom Koordinator zu bestätigende Annahmen (siehe unten)
**Vorgänger:** `CLAUDE.md` Backlog-Item P.

## 0. Offene Punkte / Annahmen (bitte bestätigen)

Beim Rückfragen kam für "Download-Knopf vs. abonnierbarer Link" keine
eindeutige Antwort — die Nutzer-Antwort beschrieb stattdessen, was
Sub-Etappe M (Kalender & Notizen) später können soll (E-Mails/Apple-
Kalender/Chat-Diktat als Quellen, Benachrichtigungen pro Termin). Das
ist wertvoller Kontext **für M**, beantwortet aber nicht P's Frage.
Für diesen Entwurf angenommen:
- **Export-Art: einfacher Download-Knopf** (.ics-Datei), kein
  abonnierbarer Link (der bräuchte einen öffentlichen, unauthentifizierten
  Endpunkt — deutlich mehr Aufwand und ein neues Sicherheitsthema, passt
  nicht zu "P ist ein kleiner Nachzügler").
- **Ort des Knopfs:** im Sendungen-Modul, Tab "Termine", oben in der Leiste.
- **Notiz für M:** "Benachrichtigung pro Termin" ist explizit ein
  M-Feature (Erinnerungen), nicht Teil von P.

## 1. Ziel

Bestehende Termine als .ics-Datei exportierbar machen, damit sie im
iPhone-/Google-Kalender importiert werden können.

## 2. Grundsatz-Entscheidungen

| Thema | Entscheidung | Warum |
|---|---|---|
| Umfang | `sendungen.termine` **und** offene To-dos mit `faellig`-Datum | Nutzer-Bestätigung 2026-09-21 |
| Export-Mechanismus | Download-Knopf (Blob + Klick, wie CSV-Export aus Sub-Etappe B) | Angenommen, siehe Abschnitt 0 |
| Zeitangabe im ICS | Ganztägige Termine (`DTSTART;VALUE=DATE`), keine Uhrzeit | Weder `sendungen.termine.faellig_am` noch `todos.faellig` haben eine Uhrzeit-Komponente |
| Kein Rück-Import | reine Einbahnstraße (App → Kalender-App), kein Zwei-Wege-Sync | Passt zur Abgrenzung "P ist Gegenrichtung zu M", kein Datenverlust-Risiko durch Fremdänderungen |

## 3. Datenmodell

Keine neue Tabelle, keine Schema-Änderung.

## 4. Logik (reine Funktion)

Neue Datei `js/module/sendungen/ics.js`:
- `zuIcsDatei(termine)` — `termine: {titel, datum}[]` (Aufrufer bildet
  `sendungen.termine` und `todos.offen` mit `faellig` auf dieses
  gemeinsame Shape ab) → vollständiger `.ics`-Dateiinhalt als String
  (`BEGIN:VCALENDAR` … `END:VCALENDAR`, ein `VEVENT`-Block pro Termin
  mit `UID` (stabil aus Titel+Datum abgeleitet, damit ein erneuter
  Export keine Duplikate im Kalender erzeugt), `DTSTART;VALUE=DATE`,
  `SUMMARY`, `DTSTAMP`).

## 5. Dateistruktur

- `js/module/sendungen/ics.js` (neu) — `zuIcsDatei` (siehe oben).
- `js/module/sendungen/termine.js` — neuer "Kalender exportieren"-Knopf
  oben im Tab. Sammelt `zustand.termine` + `zustand.todosOffen` (falls
  im Sendungen-`zustand` noch nicht vorhanden: `daten.js` lädt
  zusätzlich `todos` parallel, analog zu `home/daten.js`s Muster für
  modulübergreifendes Laden), baut die `.ics`-Datei, löst den Download aus.

## 6. Definition of Done

- [ ] `node --test` grün: `zuIcsDatei` getestet (gültiger ICS-Aufbau,
      stabile UIDs).
- [ ] Knopf im Termine-Tab lädt eine `.ics`-Datei herunter, die sich in
      Apple Kalender/Google Kalender importieren lässt (manuell verifiziert).
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.

## 7. Bewusst NICHT in dieser Sub-Etappe

- Abonnierbarer Kalender-Link.
- Benachrichtigungen pro Termin (Sub-Etappe M).
- Externe Termine reinholen (Sub-Etappe M).
