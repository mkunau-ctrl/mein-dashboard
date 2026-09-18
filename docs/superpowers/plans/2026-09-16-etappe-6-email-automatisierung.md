# Etappe 6 – E-Mail-Automatisierung: Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein täglicher lokaler Scan von Marks GMX-Postfach erkennt automatisch
Belege, Paket-/Amazon-Sendungen und Termine/Fristen und trägt sie in Mein
Dashboard ein; zusätzlich erkennt das Finanzen-Modul wiederkehrende Abos aus
den bereits gespeicherten Ausgaben.

**Architecture:** Ein Node.js-Skript (`automatisierung/postfach-scan.mjs`),
gestartet von einem täglichen Windows-Scheduled-Task, liest per IMAP neue
GMX-Mails, lässt jede Mail von `claude -p` klassifizieren (reine
Parsing/Validierungs-Logik in `klassifizieren.js`) und schreibt das Ergebnis
per Supabase-Service-Role-Key in drei Tabellen (`expenses`, `sendungen`,
`termine`). Die Browser-App bekommt ein neues Modul `js/module/sendungen/`
(Pakete + Termine) nach dem etablierten Modul-Muster, plus einen neuen
"Abos"-Tab im Finanzen-Modul, der ausschließlich aus vorhandenen `expenses`
berechnet wird.

**Tech Stack:** Node.js (ESM, `"type": "module"`), `node:test` für
Unit-Tests, `imapflow` + `mailparser` fürs Postfach lesen, `@supabase/supabase-js`
(npm, server-seitig) für Schreibzugriffe, `dotenv` fürs lokale `.env`,
`claude -p` als Klassifikations-"Modell" (kein eigenes LLM-Training/-Hosting).
Browser-Seite bleibt wie bisher: kein Framework, kein Build, `supabase-js`
per CDN.

**Spec:** `docs/superpowers/specs/2026-09-16-etappe-6-8-automatisierung-auth-redesign-design.md`
(Abschnitte 2 und 3 – Etappe 7/8 sind **nicht** Teil dieses Plans, siehe Notiz
am Ende der Spec).

## Global Constraints

- Kein Framework, kein Build-Schritt in der Browser-App (`index.html`, `js/`).
- ESM überall (`"type": "module"` in `package.json`).
- Reine Logik (kein Netz, kein DOM, kein Dateisystem) in eigenen Dateien mit
  `node:test`-Tests; Supabase-Zugriff gebündelt in `daten.js` je Modul
  (siehe `js/module/README.md`).
- RLS-Muster für neue Tabellen: `user_id uuid not null default auth.uid()`,
  eine Policy `"<tabelle>: eigene Zeilen" for all using (user_id = auth.uid())
  with check (user_id = auth.uid())` (exakt wie bei `parts`/`todos`).
- Secrets (GMX-App-Passwort, Supabase-Service-Role-Key) ausschließlich in
  lokaler `.env`-Datei, per `.gitignore` ausgeschlossen (bereits vorhanden:
  `.env`, `.env.*`), niemals im Repo oder Chat.
- Sprache: Doku, Commit-Nachrichten und UI-Texte auf Deutsch.
- `USER_ID` für Server-Schreibzugriffe: `df0b24a6-6a74-4830-995c-84015161dcc3`
  (Marks Auth-UID, siehe `CLAUDE.md`).
- Supabase-Projekt: `vogztxoaqbnuciboughd`, URL `https://vogztxoaqbnuciboughd.supabase.co`.

---

### Task 1: Spike – DHL/Hermes-Live-Status: Machbarkeit klären

**Files:** keine Code-Änderung, nur eine Entscheidung, die in Task 6 und in
`docs/PROJEKT-LOG.md` (Task 11) einfließt.

**Interfaces:** keine.

- [ ] **Schritt 1: DHL prüfen (max. 15 Minuten)**

Auf `https://developer.dhl.com` nach einer **Sendungsverfolgungs-API für
Privatkunden ohne Geschäftskunden-Vertrag** suchen (Stichwort "Shipment
Tracking – Unified", freier Tarif). Ergebnis notieren: kostenlos ohne
Geschäftskundennummer nutzbar? Ja/Nein, ggf. mit welchen Einschränkungen
(Rate-Limit, nur bestimmte Sendungsarten).

- [ ] **Schritt 2: Hermes prüfen (max. 15 Minuten)**

Auf `https://www.myhermes.de`/`https://www.hermesworld.com` nach einer
öffentlich nutzbaren Tracking-API für Endkunden suchen. Ergebnis notieren.

- [ ] **Schritt 3: Entscheidung treffen und dokumentieren**

Wenn **eine** der beiden APIs ohne Geschäftskonto/mit vertretbarem Aufwand
nutzbar ist: Task 6 um einen Abschnitt "Live-Status-Abruf" für genau diesen
Anbieter erweitern (Implementierung dort nachtragen, bevor Task 6
abgeschlossen wird).

Wenn **keine** einfach nutzbar ist (das ist auf Basis der aktuellen
Kenntnislage der wahrscheinlichere Fall – DHL verlangt für die
Sendungsverfolgungs-API in der Regel eine Geschäftskundennummer, Hermes bietet
keine öffentliche Tracking-API für Privatpersonen): **Fallback verwenden**,
der in Task 6 bereits so gebaut wird – nur Trackingnummer + Link zur
Trackingseite speichern, `status` bleibt `unterwegs`/`unbekannt`, Mark
aktualisiert den Status bei Bedarf manuell in der App (Klick auf den
Status-Badge, siehe Task 9).

In beiden Fällen: Ergebnis als ein bis zwei Sätze festhalten – wird in Task 11
mit ins Log übernommen (z. B. "DHL/Hermes-Recherche: kein einfacher
kostenloser Live-Status verfügbar, Fallback (Trackingnummer + Link) wird
verwendet.").

---

### Task 2: Supabase-Migration – Tabellen `sendungen` + `termine`

**Files:**
- Supabase-Migration (per `mcp__claude_ai_Supabase__apply_migration`,
  `project_id: "vogztxoaqbnuciboughd"`, `name: "etappe6_sendungen_termine"`).

**Interfaces:**
- Produziert die Tabellen, die `js/module/sendungen/daten.js` (Task 9) und
  `automatisierung/postfach-scan.mjs` (Task 6) beschreiben.

- [ ] **Schritt 1: Migration anwenden**

Mit dem Supabase-MCP-Tool `apply_migration` folgendes SQL anwenden (Muster
1:1 aus den bestehenden Tabellen `parts`/`todos` übernommen):

```sql
create table public.sendungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  haendler text not null,
  trackingnummer text,
  beschreibung text,
  status text not null default 'unterwegs',
  letzte_aktualisierung timestamptz,
  quelle text not null default 'email',
  erstellt_am timestamptz not null default now()
);
alter table public.sendungen enable row level security;
create policy "sendungen: eigene Zeilen" on public.sendungen
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.termine (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  titel text not null,
  faellig_am date not null,
  erledigt boolean not null default false,
  quelle text not null default 'email',
  erstellt_am timestamptz not null default now()
);
alter table public.termine enable row level security;
create policy "termine: eigene Zeilen" on public.termine
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

- [ ] **Schritt 2: Prüfen, dass RLS aktiv ist**

Mit `mcp__claude_ai_Supabase__execute_sql` prüfen:

```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and tablename in ('sendungen', 'termine');
```

Erwartet: je eine Zeile pro Tabelle, `cmd = 'ALL'`.

---

### Task 3: Automatisierung – Projekt-Setup (Pakete, `.env`)

**Files:**
- Modify: `package.json`
- Create: `automatisierung/.env.example`
- Create: `automatisierung/letzter-lauf.json` (wird zur Laufzeit erzeugt,
  nicht von Hand anlegen)
- Modify: `.gitignore`

**Interfaces:** keine (reines Setup).

- [ ] **Schritt 1: Abhängigkeiten installieren**

```bash
npm install --save imapflow mailparser @supabase/supabase-js dotenv
```

Danach prüfen, dass `package.json` die vier Pakete unter `dependencies`
führt und `package-lock.json` erzeugt wurde.

- [ ] **Schritt 2: `.env.example` anlegen**

`automatisierung/.env.example`:

```
GMX_IMAP_USER=m.kunau@gmx.de
GMX_IMAP_APP_PASSWORT=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Schritt 3: `.gitignore` ergänzen**

In `.gitignore` (bereits vorhanden: `.env`, `.env.*`) einen Eintrag für den
Laufzeit-Zustand hinzufügen:

```
# Laufzeit-Zustand der Automatisierung
automatisierung/letzter-lauf.json
```

- [ ] **Schritt 4: Mark bittet, `.env` lokal anzulegen**

Mark kopiert `automatisierung/.env.example` zu `automatisierung/.env` und
trägt dort sein GMX-App-Passwort (siehe bereits erhaltene Anleitung) und den
Supabase-Service-Role-Key ein (Service-Role-Key: Supabase-Dashboard →
Project Settings → API → `service_role` secret). **Diese Datei nicht im
Chat teilen und nicht committen** – das übernimmt Mark selbst außerhalb
dieser Session.

- [ ] **Schritt 5: Commit**

```bash
git add package.json package-lock.json automatisierung/.env.example .gitignore
git commit -m "chore: Setup fuer E-Mail-Automatisierung (Pakete, .env-Vorlage)"
```

---

### Task 4: Automatisierung – Klassifikations-Logik (reine Funktionen)

**Files:**
- Create: `automatisierung/klassifizieren.js`
- Test: `test/automatisierung-klassifizieren.test.js`

**Interfaces:**
- Produziert: `baustePrompt(): string`,
  `parseKlassifikation(rohtext: string): { typ: 'beleg'|'sendung'|'amazon'|'termin'|'sonstiges', ... }`
  (wirft `Error` bei ungültigem/unvollständigem Ergebnis).
- Wird von `automatisierung/postfach-scan.mjs` (Task 6) konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/automatisierung-klassifizieren.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKlassifikation } from '../automatisierung/klassifizieren.js';

test('parseKlassifikation: gueltiger Beleg', () => {
  const ergebnis = parseKlassifikation(
    '{"typ":"beleg","haendler":"REWE","betrag":12.5,"datum":"2026-09-10","kategorie":"lebensmittel"}');
  assert.deepEqual(ergebnis, {
    typ: 'beleg', haendler: 'REWE', betrag: 12.5, datum: '2026-09-10', kategorie: 'lebensmittel',
  });
});

test('parseKlassifikation: entfernt Markdown-Codeblock', () => {
  const ergebnis = parseKlassifikation('```json\n{"typ":"sonstiges"}\n```');
  assert.equal(ergebnis.typ, 'sonstiges');
});

test('parseKlassifikation: Sendung ohne Haendler ist unvollstaendig', () => {
  assert.throws(() => parseKlassifikation('{"typ":"sendung","trackingnummer":"123"}'), /unvollständig/);
});

test('parseKlassifikation: Termin ohne Faelligkeit ist unvollstaendig', () => {
  assert.throws(() => parseKlassifikation('{"typ":"termin","titel":"Pruefung"}'), /unvollständig/);
});

test('parseKlassifikation: unbekannter Typ wirft Fehler', () => {
  assert.throws(() => parseKlassifikation('{"typ":"werbung"}'), /Unbekannter Typ/);
});

test('parseKlassifikation: kein JSON wirft Fehler', () => {
  assert.throws(() => parseKlassifikation('Das ist keine Werbung.'), /kein gültiges JSON/);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – `Cannot find module '../automatisierung/klassifizieren.js'`

- [ ] **Schritt 3: Implementierung schreiben**

`automatisierung/klassifizieren.js`:

```js
// Reine Logik zur Klassifikation von E-Mail-Text. Kein Netz, kein Dateisystem.

const ERLAUBTE_TYPEN = ['beleg', 'sendung', 'amazon', 'termin', 'sonstiges'];

export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon/Rechnung für einen Kauf
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin (z. B. Prüfungsanmeldung, Rechnungsfälligkeit)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.`;
}

function entferneCodeblock(text) {
  const treffer = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (treffer ? treffer[1] : text).trim();
}

export function parseKlassifikation(rohtext) {
  let objekt;
  try {
    objekt = JSON.parse(entferneCodeblock(rohtext));
  } catch {
    throw new Error(`Antwort ist kein gültiges JSON: ${rohtext}`);
  }
  if (!ERLAUBTE_TYPEN.includes(objekt.typ)) {
    throw new Error(`Unbekannter Typ: ${objekt.typ}`);
  }
  if (objekt.typ === 'beleg' &&
      (!objekt.haendler || typeof objekt.betrag !== 'number' || !objekt.datum)) {
    throw new Error(`Beleg unvollständig: ${rohtext}`);
  }
  if (objekt.typ === 'sendung' && !objekt.haendler) {
    throw new Error(`Sendung unvollständig: ${rohtext}`);
  }
  if (objekt.typ === 'termin' && (!objekt.titel || !objekt.faelligAm)) {
    throw new Error(`Termin unvollständig: ${rohtext}`);
  }
  return objekt;
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests aus Schritt 1 PASS.

- [ ] **Schritt 5: Commit**

```bash
git add automatisierung/klassifizieren.js test/automatisierung-klassifizieren.test.js
git commit -m "feat: E-Mail-Klassifikations-Logik (Beleg/Sendung/Amazon/Termin/Sonstiges)"
```

---

### Task 5: Automatisierung – Letzter-Lauf-Zustand (reine Funktionen)

**Files:**
- Create: `automatisierung/letzter-lauf.js`
- Test: `test/automatisierung-letzter-lauf.test.js`

**Interfaces:**
- Produziert: `leseLetztenLauf(pfad: string): string|null`,
  `schreibeLetztenLauf(pfad: string, isoZeitstempel: string): void`.
- Wird von `automatisierung/postfach-scan.mjs` (Task 6) konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/automatisierung-letzter-lauf.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { leseLetztenLauf, schreibeLetztenLauf } from '../automatisierung/letzter-lauf.js';

test('leseLetztenLauf: null wenn Datei fehlt', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'md-test-'));
  const pfad = join(ordner, 'letzter-lauf.json');
  assert.equal(leseLetztenLauf(pfad), null);
  rmSync(ordner, { recursive: true, force: true });
});

test('schreibeLetztenLauf + leseLetztenLauf: Roundtrip', () => {
  const ordner = mkdtempSync(join(tmpdir(), 'md-test-'));
  const pfad = join(ordner, 'letzter-lauf.json');
  schreibeLetztenLauf(pfad, '2026-09-16T07:00:00.000Z');
  assert.equal(leseLetztenLauf(pfad), '2026-09-16T07:00:00.000Z');
  rmSync(ordner, { recursive: true, force: true });
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – Modul nicht gefunden.

- [ ] **Schritt 3: Implementierung schreiben**

`automatisierung/letzter-lauf.js`:

```js
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function leseLetztenLauf(pfad) {
  if (!existsSync(pfad)) return null;
  const inhalt = JSON.parse(readFileSync(pfad, 'utf-8'));
  return inhalt.letzterLauf ?? null;
}

export function schreibeLetztenLauf(pfad, isoZeitstempel) {
  writeFileSync(pfad, JSON.stringify({ letzterLauf: isoZeitstempel }, null, 2));
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add automatisierung/letzter-lauf.js test/automatisierung-letzter-lauf.test.js
git commit -m "feat: Zustandsverwaltung fuer letzten Postfach-Scan"
```

---

### Task 6: Automatisierung – Hauptskript (IMAP → Claude → Supabase)

**Files:**
- Create: `automatisierung/postfach-scan.mjs`

**Interfaces:**
- Konsumiert: `baustePrompt`, `parseKlassifikation` (Task 4);
  `leseLetztenLauf`, `schreibeLetztenLauf` (Task 5); Supabase-Tabellen
  `expenses`, `sendungen`, `termine` (Task 2).
- Produziert: ausführbares Skript, kein Modul-Export (Einstiegspunkt).

Dieses Skript wird **nicht** per `node:test` getestet (wie `daten.js` in den
Browser-Modulen – Netz-/IMAP-Zugriff, siehe `js/module/README.md`), sondern
manuell in Schritt 3 geprüft.

- [ ] **Schritt 1: Skript schreiben**

`automatisierung/postfach-scan.mjs`:

```js
#!/usr/bin/env node
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { leseLetztenLauf, schreibeLetztenLauf } from './letzter-lauf.js';
import { baustePrompt, parseKlassifikation } from './klassifizieren.js';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZUSTAND_PFAD = join(HIER, 'letzter-lauf.json');

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
// Marks Auth-UID, siehe CLAUDE.md. Service-Role-Key umgeht RLS, deshalb
// hier explizit statt ueber die Session gesetzt.
const DASHBOARD_USER_ID = 'df0b24a6-6a74-4830-995c-84015161dcc3';

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function klassifiziereMail(text) {
  const rohtext = execFileSync('claude', ['-p', baustePrompt()], {
    input: text.slice(0, 8000),
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseKlassifikation(rohtext);
}

async function schreibeErgebnis(k) {
  if (k.typ === 'beleg') {
    const { error } = await supabase.from('expenses').insert({
      user_id: DASHBOARD_USER_ID, betrag: k.betrag, kategorie: k.kategorie || 'sonstiges',
      datum: k.datum, notiz: k.haendler, quelle: 'email',
    });
    if (error) throw new Error(`Beleg speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    const { error } = await supabase.from('sendungen').insert({
      user_id: DASHBOARD_USER_ID,
      haendler: k.typ === 'amazon' ? 'Amazon' : k.haendler,
      trackingnummer: k.trackingnummer || null,
      beschreibung: k.beschreibung || null,
      quelle: 'email',
    });
    if (error) throw new Error(`Sendung speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'termin') {
    const { error } = await supabase.from('termine').insert({
      user_id: DASHBOARD_USER_ID, titel: k.titel, faellig_am: k.faelligAm, quelle: 'email',
    });
    if (error) throw new Error(`Termin speichern: ${error.message}`);
  }
}

async function main() {
  const seit = leseLetztenLauf(ZUSTAND_PFAD) ?? new Date(Date.now() - 24 * 3_600_000).toISOString();
  const client = new ImapFlow({
    host: 'imap.gmx.net', port: 993, secure: true,
    auth: { user: process.env.GMX_IMAP_USER, pass: process.env.GMX_IMAP_APP_PASSWORT },
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  let verarbeitet = 0;
  try {
    for await (const nachricht of client.fetch({ since: new Date(seit) }, { source: true })) {
      const geparst = await simpleParser(nachricht.source);
      const text = geparst.text || geparst.html || '';
      if (!text.trim()) continue;
      try {
        const klassifikation = klassifiziereMail(text);
        if (klassifikation.typ !== 'sonstiges') {
          await schreibeErgebnis(klassifikation);
          verarbeitet += 1;
        }
      } catch (fehler) {
        console.error(`Mail "${geparst.subject}" übersprungen: ${fehler.message}`);
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  schreibeLetztenLauf(ZUSTAND_PFAD, new Date().toISOString());
  console.log(`Postfach-Scan fertig: ${verarbeitet} Eintrag/Einträge übernommen.`);
}

main().catch((fehler) => { console.error(fehler); process.exit(1); });
```

- [ ] **Schritt 2: Voraussetzung prüfen**

Vor dem ersten Testlauf sicherstellen, dass `automatisierung/.env` existiert
(Task 3, Schritt 4) und `GMX_IMAP_USER`, `GMX_IMAP_APP_PASSWORT`,
`SUPABASE_SERVICE_ROLE_KEY` gesetzt sind. Fehlt eine davon: hier anhalten und
Mark fragen, statt mit leeren Zugangsdaten zu testen.

- [ ] **Schritt 3: Manueller Testlauf**

Run: `node automatisierung/postfach-scan.mjs`

Erwartet: Konsolenausgabe `Postfach-Scan fertig: N Eintrag/Einträge
übernommen.` ohne unbehandelte Exceptions. Bei `N > 0`: mit
`mcp__claude_ai_Supabase__execute_sql` stichprobenhaft prüfen, dass die
erwarteten Zeilen in `expenses`/`sendungen`/`termine` angekommen sind. Bei
`N = 0` (z. B. leeres Postfach im Testzeitraum): das ist kein Fehler, aber
vor Task 7 mindestens einmal mit einer echten Test-Mail (z. B. eine
DHL-Versandbestätigung an sich selbst weiterleiten) verifizieren, dass die
Pipeline durchläuft.

- [ ] **Schritt 4: Commit**

```bash
git add automatisierung/postfach-scan.mjs
git commit -m "feat: Hauptskript fuer den taeglichen Postfach-Scan"
```

---

### Task 7: Windows-Scheduled-Task registrieren

**Files:** keine Repo-Änderung (Systemkonfiguration).

**Interfaces:** ruft `automatisierung/postfach-scan.mjs` (Task 6) auf.

- [ ] **Schritt 1: Task anlegen**

Per PowerShell (einmalig, mit Admin-Rechten falls gefordert):

```powershell
$aktion = New-ScheduledTaskAction -Execute (Get-Command node).Source `
  -Argument "automatisierung\postfach-scan.mjs" `
  -WorkingDirectory "C:\Users\PC\Projekte\mein-dashboard"
$trigger = New-ScheduledTaskTrigger -Daily -At 7:00am
$einstellungen = New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable
Register-ScheduledTask -TaskName "MeinDashboard-PostfachScan" `
  -Action $aktion -Trigger $trigger -Settings $einstellungen -RunLevel Limited
```

- [ ] **Schritt 2: Task einmal manuell auslösen und prüfen**

```powershell
Start-ScheduledTask -TaskName "MeinDashboard-PostfachScan"
Start-Sleep -Seconds 10
Get-ScheduledTaskInfo -TaskName "MeinDashboard-PostfachScan"
```

`LastTaskResult` sollte `0` sein. Falls nicht: Task-Scheduler-Protokoll
prüfen (`Get-WinEvent -LogName Microsoft-Windows-TaskScheduler/Operational`
oder Task-Scheduler-GUI → Verlauf), Ursache beheben (meist fehlende/falsche
`.env`-Werte oder falscher `node`-Pfad), erneut versuchen.

- [ ] **Schritt 3: Entfernen-Anleitung notieren**

Für `CLAUDE.md` (Task 11) merken: `Unregister-ScheduledTask -TaskName
"MeinDashboard-PostfachScan" -Confirm:$false` entfernt den Task wieder.

---

### Task 8: Modul Sendungen – Berechnung (reine Funktionen)

**Files:**
- Create: `js/module/sendungen/berechnung.js`
- Test: `test/sendungen-berechnung.test.js`

**Interfaces:**
- Produziert: `sortiereSendungen(sendungen)`, `offeneSendungen(sendungen)`,
  `sortiereTermine(termine)`, `naechsterSendungStatus(status)`.
- Wird von `js/module/sendungen/index.js`, `pakete.js`, `termine.js`
  (Task 9) konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/sendungen-berechnung.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus }
  from '../js/module/sendungen/berechnung.js';

const sendungen = [
  { haendler: 'Hermes', status: 'zugestellt' },
  { haendler: 'DHL', status: 'unterwegs' },
  { haendler: 'Amazon', status: 'unbekannt' },
];

test('sortiereSendungen: unterwegs vor unbekannt vor zugestellt', () => {
  assert.deepEqual(sortiereSendungen(sendungen).map((s) => s.haendler),
    ['DHL', 'Amazon', 'Hermes']);
});

test('offeneSendungen: zaehlt alles ausser zugestellt', () => {
  assert.equal(offeneSendungen(sendungen), 2);
});

test('sortiereTermine: nur offene, nach Faelligkeit aufsteigend', () => {
  const termine = [
    { titel: 'B', faellig_am: '2026-10-01', erledigt: false },
    { titel: 'A', faellig_am: '2026-09-20', erledigt: false },
    { titel: 'C', faellig_am: '2026-09-01', erledigt: true },
  ];
  assert.deepEqual(sortiereTermine(termine).map((t) => t.titel), ['A', 'B']);
});

test('naechsterSendungStatus: zyklisch unterwegs -> zugestellt -> unterwegs, unbekannt -> unterwegs', () => {
  assert.equal(naechsterSendungStatus('unterwegs'), 'zugestellt');
  assert.equal(naechsterSendungStatus('zugestellt'), 'unterwegs');
  assert.equal(naechsterSendungStatus('unbekannt'), 'unterwegs');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – Modul nicht gefunden.

- [ ] **Schritt 3: Implementierung schreiben**

`js/module/sendungen/berechnung.js`:

```js
// Reine Berechnungen fuers Sendungen-Modul. Kein Netz, keine DOM.

const STATUS_PRIORITAET = { unterwegs: 0, unbekannt: 1, zugestellt: 2 };
const STATUS_ZYKLUS = { unterwegs: 'zugestellt', zugestellt: 'unterwegs', unbekannt: 'unterwegs' };

export function sortiereSendungen(sendungen) {
  return [...sendungen].sort((a, b) => {
    const p = STATUS_PRIORITAET[a.status] - STATUS_PRIORITAET[b.status];
    if (p !== 0) return p;
    return a.haendler.localeCompare(b.haendler, 'de');
  });
}

export function offeneSendungen(sendungen) {
  return sendungen.filter((s) => s.status !== 'zugestellt').length;
}

export function sortiereTermine(termine) {
  return [...termine]
    .filter((t) => !t.erledigt)
    .sort((a, b) => a.faellig_am.localeCompare(b.faellig_am));
}

export function naechsterSendungStatus(status) {
  return STATUS_ZYKLUS[status];
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/sendungen/berechnung.js test/sendungen-berechnung.test.js
git commit -m "feat: Berechnungslogik fuer das Sendungen-Modul"
```

---

### Task 9: Modul Sendungen – Daten, UI, CSS, App-Registrierung

**Files:**
- Create: `js/module/sendungen/daten.js`
- Create: `js/module/sendungen/index.js`
- Create: `js/module/sendungen/pakete.js`
- Create: `js/module/sendungen/termine.js`
- Modify: `js/app.js`
- Modify: `app.css`

**Interfaces:**
- Konsumiert: `sortiereSendungen`, `offeneSendungen`, `sortiereTermine`,
  `naechsterSendungStatus` (Task 8); `supabase` aus `js/supabase.js`;
  `registriere` aus `js/registry.js`; `parseHash` aus `js/router.js`.
- Produziert: registriertes Modul `id: 'sendungen'` (verfügbar über
  `holeModul('sendungen')`), Routen `#/sendungen/pakete`,
  `#/sendungen/termine`.

Dieses Modul folgt exakt dem Muster aus `js/module/lager/` (siehe Referenz
dort) – keine automatisierten Tests für `daten.js`/`index.js`/Tab-Dateien
(DOM/Netz), stattdessen manueller Test in Schritt 6.

- [ ] **Schritt 1: `daten.js` schreiben**

`js/module/sendungen/daten.js`:

```js
import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [sendungen, termine] = await Promise.all([
    supabase.from('sendungen').select('*'),
    supabase.from('termine').select('*'),
  ]);
  if (sendungen.error) throw fehler('Sendungen laden', sendungen.error);
  if (termine.error) throw fehler('Termine laden', termine.error);
  return { sendungen: sendungen.data, termine: termine.data };
}

export async function legeSendungAn({ haendler, trackingnummer, beschreibung }) {
  const { error } = await supabase.from('sendungen').insert({
    haendler, trackingnummer: trackingnummer || null, beschreibung: beschreibung || null,
    quelle: 'manuell',
  });
  if (error) throw fehler('Sendung anlegen', error);
}

export async function setzeSendungStatus(id, status) {
  const { error } = await supabase.from('sendungen')
    .update({ status, letzte_aktualisierung: new Date().toISOString() }).eq('id', id);
  if (error) throw fehler('Sendungsstatus ändern', error);
}

export async function entferneSendung(id) {
  const { error } = await supabase.from('sendungen').delete().eq('id', id);
  if (error) throw fehler('Sendung entfernen', error);
}

export async function legeTerminAn({ titel, faellig_am }) {
  const { error } = await supabase.from('termine').insert({ titel, faellig_am, quelle: 'manuell' });
  if (error) throw fehler('Termin anlegen', error);
}

export async function hakeTerminAb(id) {
  const { error } = await supabase.from('termine').update({ erledigt: true }).eq('id', id);
  if (error) throw fehler('Termin abhaken', error);
}

export async function entferneTermin(id) {
  const { error } = await supabase.from('termine').delete().eq('id', id);
  if (error) throw fehler('Termin entfernen', error);
}
```

- [ ] **Schritt 2: `pakete.js` schreiben**

`js/module/sendungen/pakete.js`:

```js
import { legeSendungAn, setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigePakete(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Sendung hinzufügen';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular());
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const s of sortiereSendungen(zustand.sendungen)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small>${s.beschreibung ? esc(s.beschreibung) : ''}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${s.status}">${STATUS_TEXT[s.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeSendungStatus(s.id, naechsterSendungStatus(s.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Sendung von „${s.haendler}" entfernen?`)) return;
      try { await entferneSendung(s.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neue Sendung</h3>
        <label>Händler <input name="haendler" required></label>
        <label>Trackingnummer (optional) <input name="trackingnummer"></label>
        <label>Beschreibung (optional) <input name="beschreibung"></label>
        <p class="dialog-fehler" role="alert" hidden></p>
        <menu>
          <button type="button" data-a="abbrechen">Abbrechen</button>
          <button type="submit" data-a="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);
    const form = dlg.querySelector('form');
    const fehlerEl = dlg.querySelector('.dialog-fehler');
    const schliesse = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('[data-a=abbrechen]').addEventListener('click', schliesse);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.haendler.value.trim()) { form.haendler.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeSendungAn({
          haendler: form.haendler.value.trim(),
          trackingnummer: form.trackingnummer.value.trim(),
          beschreibung: form.beschreibung.value.trim(),
        });
        schliesse();
        await aktualisieren();
      } catch (err) {
        fehlerEl.textContent = err.message;
        fehlerEl.hidden = false;
        knopf.disabled = false;
      }
    });
    dlg.showModal();
  }
}
```

- [ ] **Schritt 3: `termine.js` schreiben**

`js/module/sendungen/termine.js`:

```js
import { legeTerminAn, hakeTerminAb, entferneTermin } from './daten.js';
import { sortiereTermine } from './berechnung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Termin hinzufügen';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular());
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTermine(zustand.termine)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(t.titel)}</strong>
        <small>fällig am ${t.faellig_am}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="ab">✓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=ab]').addEventListener('click', async () => {
      try { await hakeTerminAb(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Termin „${t.titel}" entfernen?`)) return;
      try { await entferneTermin(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neuer Termin</h3>
        <label>Titel <input name="titel" required></label>
        <label>Fällig am <input name="faellig_am" type="date" required></label>
        <p class="dialog-fehler" role="alert" hidden></p>
        <menu>
          <button type="button" data-a="abbrechen">Abbrechen</button>
          <button type="submit" data-a="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);
    const form = dlg.querySelector('form');
    const fehlerEl = dlg.querySelector('.dialog-fehler');
    const schliesse = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('[data-a=abbrechen]').addEventListener('click', schliesse);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.titel.value.trim() || !form.faellig_am.value) return;
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeTerminAn({ titel: form.titel.value.trim(), faellig_am: form.faellig_am.value });
        schliesse();
        await aktualisieren();
      } catch (err) {
        fehlerEl.textContent = err.message;
        fehlerEl.hidden = false;
        knopf.disabled = false;
      }
    });
    dlg.showModal();
  }
}
```

- [ ] **Schritt 4: `index.js` schreiben**

`js/module/sendungen/index.js`:

```js
import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { offeneSendungen } from './berechnung.js';

const TABS = [['pakete', 'Pakete'], ['termine', 'Termine']];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Sendungen</h2>
      <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
    </header>
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelector('.zurueck')
    .addEventListener('click', () => { location.hash = ''; });
  container.querySelector('.neu-laden')
    .addEventListener('click', async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/sendungen/${b.dataset.tab}`; });
  });
}

const LADER = {
  pakete: () => import('./pakete.js').then((m) => m.zeigePakete),
  termine: () => import('./termine.js').then((m) => m.zeigeTermine),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'pakete';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';
  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'sendungen' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'sendungen',
  titel: 'Sendungen',
  renderKachel(el) {
    const n = zustand ? offeneSendungen(zustand.sendungen) : 0;
    el.innerHTML = `Sendungen<span class="kachel-zahl">${n}</span>
      <small>unterwegs</small>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
```

- [ ] **Schritt 5: In `js/app.js` registrieren**

In `js/app.js` nach der bestehenden Zeile
`import './module/berichtsheft/index.js';` ergänzen:

```js
import './module/sendungen/index.js';
```

- [ ] **Schritt 6: CSS ergänzen**

In `app.css` nach den bestehenden `.status-*`-Regeln (`.status-fehlt`,
`.status-bestellt`, `.status-da`) ergänzen:

```css
.status-unterwegs { background: var(--hm-gelb); }
.status-zugestellt { background: var(--hm-gruen); }
.status-unbekannt { background: var(--gedaempft); }
```

- [ ] **Schritt 7: Manueller Testlauf**

Lokalen Server starten (`python -m http.server 8000` im Repo-Wurzel),
`http://localhost:8000` öffnen, einloggen, Kachel "Sendungen" öffnen: Tabs
"Pakete"/"Termine" laden ohne Fehler. Über "+ Sendung hinzufügen" eine
Testsendung anlegen, Status-Badge anklicken (wechselt), Sendung wieder
entfernen. Gleiches für "+ Termin hinzufügen" und "✓"/"✕".

- [ ] **Schritt 8: Commit**

```bash
git add js/module/sendungen js/app.js app.css
git commit -m "feat: neues Modul Sendungen (Pakete + Termine)"
```

---

### Task 10: Finanzen – Abo-Erkennung

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Modify: `test/finanzen-berechnung.test.js`
- Create: `js/module/finanzen/abos.js`
- Modify: `js/module/finanzen/index.js`

**Interfaces:**
- Produziert: `erkenneAbos(expenses): { haendler, betrag, naechsteFaelligkeit }[]`.
- Konsumiert von `zeigeAbos` (neuer Tab) in `js/module/finanzen/index.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Die bestehende Importzeile ganz oben in `test/finanzen-berechnung.test.js`

```js
import { kontostand, summeProMonat, summenProKategorie }
  from '../js/module/finanzen/berechnung.js';
```

um `erkenneAbos` erweitern (eine einzige Importzeile, kein zweiter Import
derselben Datei):

```js
import { kontostand, summeProMonat, summenProKategorie, erkenneAbos }
  from '../js/module/finanzen/berechnung.js';
```

Danach ans Ende der Datei anhängen:

```js
test('erkenneAbos: erkennt monatlich wiederkehrende gleiche Notiz', () => {
  const abo = [
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-07-15' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-08-14' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-09-15' },
  ];
  const ergebnis = erkenneAbos(abo);
  assert.equal(ergebnis.length, 1);
  assert.equal(ergebnis[0].haendler, 'Netflix');
  assert.equal(ergebnis[0].betrag, 15.99);
});

test('erkenneAbos: ignoriert unregelmaessige Abstaende', () => {
  const unregelmaessig = [
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-01-05' },
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-06-20' },
  ];
  assert.deepEqual(erkenneAbos(unregelmaessig), []);
});

test('erkenneAbos: ignoriert einmalige Ausgaben ohne Wiederholung', () => {
  assert.deepEqual(erkenneAbos([
    { betrag: 50, kategorie: 'lebensmittel', notiz: 'Rewe', datum: '2026-09-01' },
  ]), []);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – `erkenneAbos is not a function` bzw. Importfehler.

- [ ] **Schritt 3: Implementierung ergänzen**

An `js/module/finanzen/berechnung.js` anhängen:

```js
function differenzInTagen(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86_400_000);
}

export function erkenneAbos(expenses) {
  const gruppen = new Map();
  for (const e of expenses) {
    if (!e.notiz) continue;
    const schluessel = e.notiz.trim().toLowerCase();
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(e);
  }
  const abos = [];
  for (const eintraege of gruppen.values()) {
    if (eintraege.length < 2) continue;
    const sortiert = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum));
    const abstaende = [];
    for (let i = 1; i < sortiert.length; i++) {
      abstaende.push(differenzInTagen(sortiert[i - 1].datum, sortiert[i].datum));
    }
    const regelmaessig = abstaende.every((tage) => tage >= 25 && tage <= 35);
    if (!regelmaessig) continue;
    const letzter = sortiert[sortiert.length - 1];
    const naechsteFaelligkeit = new Date(letzter.datum);
    naechsteFaelligkeit.setDate(naechsteFaelligkeit.getDate() + 30);
    abos.push({
      haendler: letzter.notiz,
      betrag: letzter.betrag,
      naechsteFaelligkeit: naechsteFaelligkeit.toISOString().slice(0, 10),
    });
  }
  return abos.sort((a, b) => a.naechsteFaelligkeit.localeCompare(b.naechsteFaelligkeit));
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `abos.js` schreiben**

`js/module/finanzen/abos.js`:

```js
import { erkenneAbos } from './berechnung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeAbos(container, zustand) {
  const abos = erkenneAbos(zustand.expenses);
  if (abos.length === 0) {
    container.innerHTML = '<p class="lade">Noch keine wiederkehrenden Zahlungen erkannt.</p>';
    return;
  }
  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  for (const abo of abos) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(abo.haendler)}</strong>
        <small>${abo.betrag.toFixed(2)} € · nächste Abbuchung ca. ${abo.naechsteFaelligkeit}</small>
      </div>`;
    liste.appendChild(zeile);
  }
  container.appendChild(liste);
}
```

- [ ] **Schritt 6: Tab in `index.js` verdrahten**

In `js/module/finanzen/index.js`:

```js
const TABS = [['ausgaben', 'Ausgaben'], ['kontostand', 'Kontostand'], ['monat', 'Monat'], ['abos', 'Abos']];
```

und in `LADER`:

```js
abos: () => import('./abos.js').then((m) => m.zeigeAbos),
```

- [ ] **Schritt 7: Manueller Testlauf**

Lokalen Server starten, Finanzen-Modul öffnen, Tab "Abos" prüfen: zeigt
entweder den Hinweistext oder erkannte Abos, ohne Fehler in der
Browser-Konsole.

- [ ] **Schritt 8: Commit**

```bash
git add js/module/finanzen/berechnung.js js/module/finanzen/abos.js js/module/finanzen/index.js test/finanzen-berechnung.test.js
git commit -m "feat: Abo-Erkennung im Finanzen-Modul"
```

---

### Task 11: Dokumentation, Merge, Push

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` – neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum des tatsächlichen Abschlusses verwenden, nicht
blind `2026-09-16` übernehmen falls sich der Bau über mehrere Tage zieht),
nach dem in diesem Projekt üblichen Muster (**Was/Warum/Entscheidungen/Stand
danach/Offene Punkte**). Inhaltlich mindestens:
- Was gebaut wurde (Postfach-Scan, neue Tabellen, Modul Sendungen,
  Abo-Erkennung).
- Ergebnis des DHL/Hermes-Spikes aus Task 1 (wörtlich die in Task 1,
  Schritt 3 notierte Entscheidung übernehmen).
- Dass Etappe 7 (Passkey) und Etappe 8 (Redesign) als Nächstes anstehen,
  mit Verweis auf die gemeinsame Spec.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

- Abschnitt "Aufbau" um `automatisierung/` (Zweck: täglicher Postfach-Scan,
  siehe Log) und `js/module/sendungen/` ergänzen, Tabellenliste im Abschnitt
  "Supabase-Projekt" um `sendungen`/`termine` erweitern.
- Neuen Unterabschnitt zu Secrets: `.env` in `automatisierung/` mit
  GMX-App-Passwort + Service-Role-Key, nie committen (Verweis auf
  bestehenden Abschnitt "Keine Geheimnisse ins Repo").
- Scheduled-Task-Namen `MeinDashboard-PostfachScan` und die
  Entfernen-Anleitung aus Task 7, Schritt 3 dokumentieren.
- Den in der Spec vorgesehenen Diktat-Hinweis für To-dos/Lager ergänzen:
  unter "Konventionen/Fallstricke" einen Satz analog zu den bestehenden
  Berichtsheft-/Finanzen-Einträgen, dass Mark auch für To-dos und Lager per
  Chat diktieren kann und Claude direkt per Supabase-MCP einträgt.

- [ ] **Schritt 3: Commit, Merge, Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Etappe 6 (E-Mail-Automatisierung) im Log und in CLAUDE.md dokumentiert"
git checkout main
git merge --no-ff etappe-6 -m "merge: Etappe 6 (E-Mail-Automatisierung) nach main"
```

Push an Mark übergeben (`!git push`), falls der Push in dieser Session
blockiert wird – wie bei den vorherigen Etappen.

## Definition of Done

- [ ] Alle 11 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Spike-Entscheidung zu DHL/Hermes dokumentiert (Task 1 + Task 11).
- [ ] Täglicher Scheduled-Task läuft und wurde mindestens einmal erfolgreich
      manuell ausgelöst.
- [ ] Modul "Sendungen" und Tab "Abos" funktionieren im manuellen Test.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktuell, nach `main` gemergt.
