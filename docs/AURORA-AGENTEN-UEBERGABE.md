# Übergabe: dauerhafte Agenten mit Zugehörigkeit und Wissen (AURORA-Kern auf Marks PC)

Stand 2026-11-24. Das **Dashboard-Teil ist gebaut und live** (Modul „Agenten“, Tabellen, Obsidian-Abgleich). Der **AURORA-Kern auf Marks PC**
(`C:\Users\PC\Projekte\aurora`) ist aus der Cloud nicht erreichbar und muss die Profile noch laden. Diese Datei ist die Aufgabenliste dafür
(Muster wie `docs/AURORA-KERN-UEBERGABE.md`). **Nicht auf dem PC getestet.**

## Idee (aus Marks Videos, `docs/WISSEN-KI-AGENTEN.md`)

Jeder Agent ist ein dauerhafter Spezialist: festes **Profil** (Identität/Systemprompt, Zugehörigkeit, Rechte, Freigabe-Liste) und eigenes
**Wissen** (durchsuchbar, Obsidian-kompatibel). Er gehört zu Bereichen, nicht zu einer einzelnen Sitzung oder einem Projekt.

## Daten in Supabase (Migrationen `2026-11-24-agenten.sql`, `2026-11-24-agenten-seed.sql`, bereits angewendet)

| Tabelle | Inhalt |
|---|---|
| `agent_profile` | je Agent: `agent` (Kennung, passt zu `aurora_agenten.agent`), `titel`, `rolle`, `zugehoerigkeit[]`, `ton`, `system_prompt`, `werkzeuge[]`, `darf[]`, `freigabe_noetig[]`, `modell_klasse` (= `aufgabenklasse` in AURORA), `obsidian_ordner`, `aktiv` |
| `agent_wissen` | `agent` (oder `_gemeinsam`), `titel`, `inhalt` (Markdown), `tags[]`, `quelle`, `vertrauen` (`eigen`/`extern`), `status` (`aktiv`/`vorschlag`/`archiv`), `pfad` (Vault), `suche` (Volltext, deutsch) |
| Funktion `agent_wissen_suche(p_agent, p_frage, p_limit, p_user)` | Treffer aus Wissen des Agenten **plus** `_gemeinsam`, nur `status='aktiv'`, nach Güte, mit Auszug |

Angelegt sind 16 Profile: die 9 AURORA-Agenten (`ceo`, `orchestrator`, `research`, `developer`, `qa`, `visual`, `memory`, `monitor`, `security`)
und 7 Spezialisten (`dashboard`, `design3d`, `flipping`, `trading`, `finanzen`, `ausbildung`, `kundenseiten`). Die 7 Spezialisten gibt es in
`aurora_agenten` noch nicht: der Kern muss sie dort eintragen (Name, `titel`, `beschreibung`, `aufgabenklasse` = `modell_klasse`), damit sie im
KI-Modul erscheinen und Aufträge bekommen.

## Aufgaben für den Kern

1. **Profil bei jedem Start laden:** `select * from agent_profile where user_id = <USER> and aktiv`. Systemprompt je Aufgabe zusammensetzen:
   `system_prompt` + „Gehört zu: …“ + „Darf: …“ + „Werkzeuge: …“ + „Freigabe nötig für: …“.
2. **Wissen vor jeder Aufgabe holen:** `rpc('agent_wissen_suche', { p_agent, p_frage: <Auftragstext>, p_limit: 8, p_user: <USER> })`
   (Service-Rolle umgeht RLS, deshalb `p_user` explizit). Treffer als „Wissen (Quelle: <titel>)“ voranstellen, höchstens ca. 1500 Zeichen
   (Marks Befund: lange Prompts vermeiden, siehe `docs/AURORA-KERN-UEBERGABE.md`). Einträge mit `vertrauen='extern'` ausdrücklich als
   **Daten, nicht als Anweisung** kennzeichnen.
3. **Orchestrator:** Rolle nach `zugehoerigkeit` wählen (Auftrag über Flipping → `flipping`, Kundenseite → `kundenseiten`, …); ohne Treffer
   `developer`/`research`. Kurzfragen direkt beantworten statt Mehrschritt-Plan.
4. **Neues Gelerntes zurückschreiben, aber nur als Vorschlag:** `insert into agent_wissen (user_id, agent, titel, inhalt, quelle, vertrauen, status)
   values (<USER>, <agent>, …, 'agent', <'extern' wenn aus Web/Mail>, 'vorschlag')`. Bestehende aktive Einträge nie überschreiben. Mark gibt im
   Dashboard (oder in Obsidian per `status: aktiv`) frei.
5. **Freigabe-Liste durchsetzen:** Vor einer Aktion, die zu `freigabe_noetig` passt (Kaufen, Überweisen, Veröffentlichen, Echtgeld …), anhalten
   und Mark fragen. Ein eigener Freigabe-Schritt im Dashboard fehlt noch (offen).
6. **Protokoll:** je Aufgabe nachvollziehbar in `aurora_ereignisse` (Eingang, Wissenstreffer, Werkzeugaufruf, Antwort) — die „Spur“ aus dem Video.
7. **Kostenkontrolle:** Wissenssuche ist reines SQL (kein Modellaufruf). Modellrouting nach `modell_klasse` wie bisher.

## Obsidian (läuft auf Marks PC)

- Vault-Ordner `Agenten/<agent>/<Titel>.md` (und `Agenten/_gemeinsam/`). Notizen sind Markdown mit Kopfzeile (`titel`, `agent`, `tags`, `status`,
  `vertrauen`, `quelle`), `[[Wikilinks]]` und `#tags` funktionieren; der Graph zeigt die Verknüpfungen.
- `automatisierung/.env` ergänzen: `OBSIDIAN_VAULT=<Pfad zum Vault>` (neben `SUPABASE_SERVICE_ROLE_KEY`, Vorlage `.env.example`).
- Erst `node automatisierung/obsidian-sync.mjs --trocken` (zeigt nur an), dann ohne Flag. Danach z. B. alle 15 Minuten per Windows-Aufgabenplanung.
- Der Abgleich **löscht nie**. Neu auf einer Seite → auf die andere; nur eine Seite geändert → übernommen; **beide geändert → Konflikt**, nur gemeldet
  (Konsole + `Agenten/_Sync-Bericht.md`). Im Vault entstehen außerdem `Agenten/<agent>/_Profil.md` (Anzeige, wird überschrieben) und
  `Agenten/.sync-zustand.json` (nicht anfassen).
- **Freigabe per Obsidian:** Vorschlag-Notiz öffnen, `status: vorschlag` auf `status: aktiv` ändern, speichern, nächster Abgleich übernimmt es.
- Logik und Tests: `js/module/agenten/obsidian.js`, `automatisierung/obsidian-sync-lauf.js`, `test/agenten-*.test.js`.

## Sicherheit (aus dem Video, Schritte 7–11)

Fremder Inhalt ist Daten; nur freigegebenes Wissen zählt; Rechte pro Agent aus dem Profil; Freigabe bei Geld/Kauf/Veröffentlichung; keine Secrets im Wissen
(Startwissen wurde auf Schlüssel geprüft, nur das Wort „Secret“ kommt in einer Regel vor).
