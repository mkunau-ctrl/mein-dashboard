# Gerätetest-Checkliste (Stand 2026-10-18)

Ziel: alles, was bisher nur unit-getestet oder nie real gelaufen ist, einmal am
iPhone (App vom Home-Bildschirm) durchklicken. Ergebnis je Punkt eintragen:
OK / Fehler (+ was passiert ist). Fehler kommen ins `docs/PROJEKT-LOG.md` und
als `offen`-Zeile in `projekt_notizen`.

Reihenfolge ist bewusst: erst Grundlagen, dann Push (hängt von Abo ab).

## 0. Vorbereitung
- [ ] Supabase-Dashboard → Authentication → Passkeys aktivieren (RP-Name `Mein Dashboard`,
      RP-ID `mkunau-ctrl.github.io`, Origin `https://mkunau-ctrl.github.io`)
- [ ] App vom Home-Bildschirm komplett schließen und neu öffnen (Service-Worker-Cache holt
      neue Version; Cache-Stand in `sw.js` prüfen, aktuell v6)
- [ ] Einstellungen → "Alle Daten exportieren" probeweise: JSON lädt, enthält alle Module

## 1. Grundmodule (seit Etappe 2–5 nie am Gerät getestet)
- [ ] Home: Begrüßung, Datum, Wetter-Widget (Lemgo, 3 Tage) laden
- [ ] Bottom-Nav: Home / Finanzen / Flipping / Suche / Profil wechseln ohne Fehler
- [ ] Ernährung (`#/ernaehrung`): Punkt abhaken, Gewicht eintragen
- [ ] To-dos (`#/todos`): anlegen, abhaken, Detail öffnen, löschen
- [ ] Finanzen: Übersicht, Zeitraum-Filter, Kreisdiagramm, Kategorie anklicken
- [ ] Finanzen: Einnahme per Formular, Konto, Schuld + Teilzahlung
- [ ] Rechnungen: anlegen, als bezahlt markieren
- [ ] Sendungen / Termine: Detailansicht öffnet, ICS-Export lädt
- [ ] Handyreparatur: Auftrag auf "verkauft" setzen erzeugt Einnahme
- [ ] Dark-Mode-Schalter, Schriftgröße

## 2. Prototypen von Oktober
- [ ] Kalender (`#/kalender`): Monatsraster, Termin anlegen
- [ ] Notizen (`#/notizen`): neu, bearbeiten, in Suche auffindbar
- [ ] Dateien (`#/dateien`): Upload, auf anderem Gerät abrufen, Löschen
- [ ] Woche (`#/woche`): Heute-Überblick, Wochenaufgaben und "Zu klären" abhaken
- [ ] Passkey: in Einstellungen einrichten, abmelden, mit Passkey anmelden

## 3. Push (noch nie real gelaufen)
- [ ] Einstellungen → Benachrichtigungen einschalten (iOS-Berechtigung zulassen)
- [ ] Test-Knopf: Push kommt an
- [ ] Glocke im Header zeigt Meldung nach dem nächsten 15-Min-Lauf
- [ ] Edge-Function-Logs `push-senden`: Cron-Lauf ohne Fehler
- [ ] Tagesbriefing: kommt in der nächsten Sendezeit (Mo–Fr 06:00, Sa 09:30, So 08:30),
      Text korrekt (Wetter, Termine, flexible Zeit)

## 4. Aufräumen / Entscheidungen
- [ ] PNG-Icons 192/512 + `apple-touch-icon` erstellen (seit Etappe 0 offen)
- [ ] Geplante Aufgabe `MeinDashboard-ProjekteSync`: einrichten ja/nein (Mark entscheidet)
- [ ] `js/module/finanzen/kontostand.js` ist unreferenziert: löschen oder als Kachel
- [ ] Flipping: Ankaufsgrenzen pro iPhone-Modell, Umkreis festlegen

## Ergebnisse
(hier eintragen)
