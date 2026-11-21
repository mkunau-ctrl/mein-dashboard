# F1-Bericht: Modul „KI“ im Dashboard (2026-11-21)

## Gebaut (Branch `aurora-modul`, kein Push/Merge)

- **T1 Logik:** `js/module/ki/status.js`, `budget.js`, `baum.js`, `chat.js`,
  `ereignisse.js` + fünf Testdateien. 34 Tests, inkl. leere Listen, `null`,
  Zyklen im Aufgabenbaum, 4000/4001-Zeichen-Grenze und `<script>` als Text.
- **T2 Rahmen:** `daten.js` (Laden aller `aurora_*`, `sendeChat`, `sendeAuftrag`,
  Realtime-Abo mit 500-ms-Drossel, 10-s-Polling im Vordergrund, `beende()`),
  `index.js` (Rahmen, Router für drei Ansichten, `aktualisieren`), KI als
  sechster Tab in `js/app.js`/`NAV_MODULE`, engere Bottom-Nav unter 420 px.
  Client per `setzeClient()` injizierbar, 10 Tests.
- **T3 Ansichten:** `uebersicht.js`, `agent.js`, `verteilung.js`, `helfer.js`,
  Stil in `app.css` (`ki-`), Mock-Harness `test/ki-harness.html`.
- **T4 Doku:** dieser Bericht, `docs/PROJEKT-LOG.md`, `CLAUDE.md`.

## Prüfzahlen (gemessen am 2026-11-21)

- `npm test`: **241 Tests, 240 grün, 1 rot**.
  Der rote Test ist vorbestehend: `test/push-client.test.js`
  („base64UrlZuBytes …“, `TypeError` auf einen `null`-Wert) und hat mit dem
  KI-Modul nichts zu tun. Er wurde nicht verändert oder abgeschwächt.
  Vor dem KI-Modul: 197 Tests, 196 grün, derselbe rote Test.
- `tsc --noEmit`: nicht möglich/notwendig, das Projekt enthält kein
  TypeScript (`npx tsc` würde erst TypeScript installieren).
- Syntaxprüfung aller neuen Module mit `node --check`: grün.
- Harness in headless Edge (localhost, Mock-Client, kein Netz):
  Übersicht mit 9 Agentenkarten, Budget und Gesundheit; Agentenansicht mit
  Chat, Wartehinweis und Aufgaben; Verteilung mit Zeitleiste und 5 Baumknoten.

## Mock-Harness ansehen

```
python -m http.server 8000        # im Repo-Wurzel
http://localhost:8000/test/ki-harness.html
```

Links oben wechseln zwischen Übersicht, Verteilung und den Agenten
(orchestrator/monitor). Die vier „Live“-Knöpfe verändern Mock-Daten und lösen
den Realtime-Pfad aus (Ereignis, Aufgabe, Status, offline). Keine echten
Schlüssel, keine Supabase-Verbindung.

## Offene Punkte (für den Chef)

1. Realtime gegen echtes Supabase mit laufendem AURORA-Sync testen.
2. Browser-/Gerätetest bei 390 px und 820 px (Chef-Abnahme).
3. `aurora_chat` erlaubt laut Migration 1–8000 Zeichen; die UI prüft wie im
   Plan 1–4000. Bei Bedarf Grenze anpassen.
4. Chat-/Auftrags-Inserts hängen von den RLS-Policies der Migration ab
   (nur `rolle='nutzer'`, `status='neu'`, Agentenliste); im Harness nur
   gemockt, nicht gegen die echte Datenbank geprüft.
5. Der vorbestehende rote `push-client`-Test sollte separat angesehen werden.
