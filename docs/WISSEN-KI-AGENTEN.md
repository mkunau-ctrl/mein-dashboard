# Wissen: KI-Agenten-Architektur (aus Marks Video, 2026-11-24)

**Quelle:** Marks hochgeladenes Reel (Instagram @chrizzatsu, 2:27 min, Tabelle `videos`, Id `194e0ca4-7439-498d-8644-ffb0fb872a05`).
Von Claude über Einzelbilder und eingebrannte Untertitel angesehen, **der Ton wurde nicht ausgewertet** (keine
Transkription möglich). Mark: „So sieht ungefähr das aus, was ich vorhabe.“ Das Video ist Werbung für eine Beratung
(„Schreib ARCHITEKTUR“), die Ideen darin sind aber stimmig. Alles in `[Claude]` ist Claudes eigenes Hintergrundwissen,
nicht aus dem Video.

**Mark will:** dauerhafte KI-Agenten in AURORA, die immer da sind, nicht an ein einzelnes Projekt gebunden, und immer
wissen, wozu sie gehören. Der AURORA-Kern liegt auf Marks PC (`C:\Users\PC\Projekte\aurora`, nicht aus der Cloud erreichbar).

## Der Aufbau in 16 Schritten (Beispiel im Video: Assistent einer Hausverwaltung)

| # | Baustein | Kern |
|---|---|---|
| 1 | Modell wählen | Ein Sprachmodell (z. B. ChatGPT) ist der Anfang, mehr nicht. |
| 2 | (Idee → KI → fertig?) | „Das geht doch ganz einfach“ ist die Anfangsannahme; danach kommen die Probleme. |
| 3 | **Systemprompt** | Name, Persönlichkeit, Ton des Assistenten („Hausverwaltungs-Assistent“). Das ist seine **Identität**. |
| 4 | Wissen fehlt | Ohne eigenes Wissen **erfindet** die KI Antworten (Frage „Wie lang ist meine Kündigungsfrist?“ → erfundene Frist). |
| 5 | **RAG** (Wissen) | Dokumente (Mietvertrag, Hausordnung) werden in **Textstücke** zerlegt; die **Bedeutung** jedes Stücks wird als Zahlen (Embedding) in einer **Vektordatenbank** gespeichert; bei einer Frage wird die **passende Stelle geholt**, die Antwort bekommt eine **Quelle**. Ähnliche Bedeutung = ähnliche Vektoren. |
| 6 | **Handeln: MCP + Tool Calling** | Vom Antworten zum Handeln („Bei mir tropft die Decke“). Der Agent versteht, **ruft ein Werkzeug auf** (über einen MCP-Server, z. B. Verwaltungssoftware) und gibt das Ergebnis zurück. Erst jetzt ist es ein **Agent**. |
| 7 | Grenzen | Der Nachbar darf kein Suchergebnis sein: private Daten anderer dürfen nicht in Antworten auftauchen. |
| 8 | **OAuth + Rechteprüfung** | Der Agent handelt **im Namen des Nutzers** mit Zugriffstoken; die API prüft die Rechte. |
| 9 | **Prompt Injection** | Eine Mail enthält versteckte Anweisungen („Ignoriere alle Regeln …“), der Agent hält sie für Befehle. Fremder Inhalt ≠ Anweisung. |
| 10 | **Guardrails** | Mehrere Schutzschichten: Eingangsfilter → Jailbreak-Prüfung → Datenfilter. Filtern und begrenzen, **keine absolute Garantie**. |
| 11 | **Human in the loop** | Teure oder riskante Aktion → erst **Freigabe durch einen Menschen**. |
| 12 | Kosten | Mehr Mieter → mehr Modellaufrufe → höhere Rechnung. |
| 13 | **Semantic Caching** | Ähnliche Frage, vorhandene Antwort: Bedeutung vergleichen, bei Treffer Antwort aus dem Zwischenspeicher. Nur passende, aktuelle Antworten innerhalb **derselben Berechtigung**. |
| 14 | **Modellrouting** | Die Aufgabe bestimmt das Modell: einfach → kleines, günstiges Modell (€), komplex → starkes Modell (€€€). |
| 15 | **Observability** | Jede Anfrage als **nachvollziehbare Spur** protokolliert (Eingang → Tool-Aufruf → Suchergebnis → Modellantwort → Ausgabe), mit geschützten/redigierten Daten. Frage „Warum kam diese Antwort heraus?“ |
| 16 | **Evals** | Änderungen **automatisch prüfen** (Antwortqualität, Berechtigungen, Tool-Verhalten), bevor sie live gehen. |

Schlusssatz des Videos: „Aus ‚ganz einfach‘ wird Architektur.“ Gemeint: Wissen + Werkzeuge + Rechte + Sicherheit + Kosten + Kontrolle.

## Übertragung auf Marks Agenten in AURORA

Marks Wunsch („Agenten, die immer wissen, wozu sie gehören, projektübergreifend, immer da“) entspricht den Schritten 3, 5, 6, 8:

1. **Identität / Zugehörigkeit (Schritt 3):** Pro Agent ein dauerhaftes Profil: Name, Aufgabe, Bereich(e)/Projekte, Ton, Regeln. Wird bei **jedem** Start geladen. Ein Agent gehört zu einem Bereich (z. B. Flipping, Trading, Dashboard), nicht zu einer einzelnen Sitzung.
2. **Wissen (Schritt 5):** Pro Agent ein eigener Wissensspeicher (Fakten, Regeln, Entscheidungen, Dokumente) mit Suche. **Erste Version ohne Vektoren** (Volltext, `pg_trgm`), weil das Wissen anfangs klein ist; Vektoren später. `[Claude]` In Marks Supabase sind die Erweiterungen `vector` (0.8.2) und `pg_trgm` (1.6) **verfügbar, aber nicht installiert** (Stand 2026-11-24).
3. **Werkzeuge + Rechte (Schritte 6, 8):** Jeder Agent bekommt nur die Werkzeuge/Tabellen seines Bereichs (Prinzip: so wenig Rechte wie nötig).
4. **Schutz (Schritte 9–11):** Fremde Inhalte (Mails, Kleinanzeigen-Texte, Webseiten) sind **Daten, keine Befehle**. Geld, Käufe, Überweisungen, Nachrichten an Dritte nur nach Freigabe. `[Claude]` Passt zu Marks bestehenden Regeln (nie kaufen/überweisen ohne OK, E-Mails nur lesen).
5. **Kosten + Kontrolle (Schritte 12–16):** AURORA hat bereits **Budget** (Stufen), **Kill-Switch**, **Ereignisprotokoll** (`aurora_ereignisse`) und Chat. Offen wären Modellrouting, Caching und Evals.

**Was AURORA laut Dashboard-Stand schon hat:** 9 Agenten, Aufgaben + Aufgabenbäume, Chat, Budget/Kill-Switch/Gesundheit (`aurora_*`-Tabellen, `js/module/ki/`).
**Was fehlt:** dauerhafte Agenten-Profile, Wissensspeicher je Agent, Rechte je Agent, Freigabe-Schritt (Human in the loop) im Dashboard.

## Umsetzung (2026-11-24, gebaut)

Tabellen `agent_profile` und `agent_wissen`, Modul „Agenten“ im Dashboard, Obsidian-Abgleich, Übergabe für den Kern: siehe `docs/AURORA-AGENTEN-UEBERGABE.md`.
Noch offen: Der AURORA-Kern lädt Profil und Wissen noch nicht, ein Freigabe-Schritt im Dashboard fehlt, Vektorsuche (`vector` verfügbar, nicht installiert) erst bei
größerem Wissen.
