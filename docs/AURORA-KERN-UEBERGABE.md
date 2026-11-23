# Übergabe: AURORA-Kern auf Marks PC (Ordner `C:\Users\PC\Projekte\aurora`)

Diese Datei ist für eine Claude-Session, die **auf Marks PC** im Ordner `Projekte/aurora` läuft.
Die Cloud-Session, die sie geschrieben hat, kam an den Kern nicht heran.

## Zuerst lesen
1. Supabase-Projekt `vogztxoaqbnuciboughd`, Tabelle `projekt_notizen`: die `offen`-Zeilen mit „AURORA“ im Titel.
2. `docs/DASHBOARD-ANBINDUNG.md` im Aurora-Ordner (Sync-Dienst, Tabellen `aurora_*`).
3. Nichts aus `.env*` lesen oder ausgeben.

## Befund (aus `aurora_aufgaben`, 22.11.2026)
- Erste Chat-Nachricht eines Agenten wird als kurzer Prompt weitergegeben
  (`Neue Nachricht des Nutzers: …`, 45–49 Zeichen).
- Ab der zweiten Nachricht wird der **gesamte bisherige Chatverlauf** vorangestellt
  (`Verlauf aus dem Dashboard … [[UNTRUSTED …]]`), auch die langen Agentenantworten.
  Beispiel: 2. Nachricht an `security` = 981 Zeichen. Der Prompt wächst mit jeder Nachricht.
- Der Orchestrator macht aus „Bist du Claude?“ drei Aufgaben (orchestrator, research, ceo),
  je 0,01 €.
- Mark beschwert sich über zu lange Agentenantworten („Warum schreibst du immer so lange Nachrichten“).
- `visual`: Chat-Aufgaben enden `BLOCKED` mit `COST_LIMIT: Kostenschätzung nicht möglich`
  (zwei Fälle am 22.11. gegen 18:49 UTC). Dazu sagt der Verlauf-Wrapper „Erkannte Muster: system_prompt“,
  weil die Systemmeldung im Verlauf steht.

## Aufgaben
1. **Verlauf begrenzen:** nur die letzten 1–2 Austausche mitgeben. Agentenantworten im Verlauf auf
   ca. 300 Zeichen kürzen. Systemmeldungen (`rolle='system'`) nicht in den Verlauf aufnehmen.
2. **Kurzfragen direkt beantworten:** Smalltalk und einfache Fragen ohne Mehrschritt-Plan durch
   den Agenten selbst, nicht über Orchestrator → Research → CEO.
3. **Antwortstil:** im Chat höchstens 2–3 Sätze, ohne Kopfzeilen wie „Aktion / Geprüfte Grundlage /
   Risikostufe“, außer Mark fragt nach Details. Gilt für alle Agenten.
4. **`visual` entblocken:** herausfinden, warum die Kostenschätzung für `visual` nicht möglich ist
   (fehlende Preisangabe für das Modell oder Aufgabenklasse?) und beheben. Das Budget-Limit
   (Kill-Switch, 25 €) darf dabei nicht umgangen oder gelockert werden.
5. **Tests:** für jede Änderung einen Test, bestehende Tests nicht abschwächen.

## Grenzen
- Sicherheitsregeln und das Budget-Limit bleiben unverändert.
- Kein Push auf `main` ohne Marks Ja; Branch verwenden.
- Nach jeder Änderung einen `log`-Eintrag in `projekt_notizen` (`user_id` explizit
  `df0b24a6-6a74-4830-995c-84015161dcc3`) und den passenden `offen`-Punkt auf `erledigt=true` setzen.

## Danach prüfen
Im Dashboard (KI-Tab) eine kurze Frage an `orchestrator` und eine an `visual` stellen. Dann in
`aurora_aufgaben` nachsehen: Länge der `eingabe` bleibt kurz, nur eine Aufgabe pro Kurzfrage.
