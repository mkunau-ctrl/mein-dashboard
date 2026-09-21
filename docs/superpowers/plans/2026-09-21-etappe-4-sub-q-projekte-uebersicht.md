# Etappe 4, Sub-Etappe Q: Projekte-Übersicht Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alle lokalen Projekte unter `C:\Users\PC\Projekte\<name>` mit
`CLAUDE.md` werden im Dashboard angezeigt (primär für Claude gedacht,
über Suche für Mark auffindbar).

**Architecture:** Ein neues, lokales Node-Skript
(`automatisierung/projekte-sync.mjs`, gleiches Muster wie
`postfach-scan.mjs`) synchronisiert per vollem Re-Sync alle gefundenen
`CLAUDE.md`-Inhalte nach Supabase. Ein neues, nicht in der Bottom-Nav
sichtbares Modul zeigt sie an, mit einem einfachen selbstgeschriebenen
Markdown-Renderer.

**Tech Stack:** Vanilla JS/ESM, Node.js (`fs`, `@supabase/supabase-js`),
`node:test`, Windows Scheduled Task, kein Framework.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-q-projekte-uebersicht-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur reine Logik-Dateien (kein Netz/DOM/Dateisystem) bekommen
  automatisierte Tests — `projekte-sync.mjs` bleibt ungetestet
  (gleiche, bereits etablierte Konvention wie `postfach-scan.mjs`).
- Voller Re-Sync bei jedem Lauf (löschen + neu einfügen), kein Diff/Merge.
- Kein eigener Bottom-Nav-Punkt — Einstieg nur über einen neuen
  Schnelleinstieg im Suche-Screen.

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, reine DB-Aktion):**

1. Tabelle `claude_projekte` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null default auth.uid()
   references auth.users`, `name text not null`, `inhalt text not
   null`, `sync_zeitstempel timestamptz not null default now()`,
   `unique (user_id, name)`. RLS wie überall.

---

### Task 1: Markdown-Rendering (reine Logik)

**Files:**
- Create: `js/module/projekte/markdown.js`
- Test: `test/projekte-markdown.test.js`

**Interfaces:**
- Produziert: `zuHtml(markdown: string): string` — wird von Task 3
  (`projekte/index.js`) importiert.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zuHtml } from '../js/module/projekte/markdown.js';

test('zuHtml: Ueberschriften und Fettschrift werden umgewandelt, HTML wird escaped', () => {
  const html = zuHtml('# Titel\n## Unterabschnitt\nEin **wichtiger** Satz.\n<script>');
  assert.ok(html.includes('<h2>Titel</h2>'));
  assert.ok(html.includes('<h3>Unterabschnitt</h3>'));
  assert.ok(html.includes('Ein <strong>wichtiger</strong> Satz.'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('zuHtml: leere Zeilen werden zu Zeilenumbruechen', () => {
  const html = zuHtml('Zeile 1\n\nZeile 2');
  assert.ok(html.includes('<br>'));
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `js/module/projekte/markdown.js` existiert noch nicht.

- [ ] **Schritt 3: Implementieren**

```js
// Sehr einfaches, selbstgeschriebenes Markdown-Rendering
// (nur Ueberschriften # / ## und Fettschrift **text**).
// Kein Netz, keine DOM.

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function inline(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function zuHtml(markdown) {
  const zeilen = String(markdown).split('\n');
  return zeilen.map((zeile) => {
    if (zeile.startsWith('## ')) return `<h3>${inline(zeile.slice(3))}</h3>`;
    if (zeile.startsWith('# ')) return `<h2>${inline(zeile.slice(2))}</h2>`;
    if (zeile.trim() === '') return '<br>';
    return `<p>${inline(zeile)}</p>`;
  }).join('\n');
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/projekte/markdown.js test/projekte-markdown.test.js
git commit -m "feat: einfaches Markdown-Rendering fuer Projekte-Uebersicht"
```

---

### Task 2: Sync-Skript

**Files:**
- Create: `automatisierung/projekte-sync.mjs`
- Create: `automatisierung/.env.example` (nur ergänzen, falls die
  Datei existiert und `SUPABASE_SERVICE_ROLE_KEY` dort noch nicht
  dokumentiert ist — prüfen, meist schon vorhanden aus Etappe 6)

**Interfaces:** keine (eigenständiges, ausführbares Skript).

- [ ] **Schritt 1: Skript anlegen**

```js
#!/usr/bin/env node
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const HIER = dirname(fileURLToPath(import.meta.url));
config({ path: join(HIER, '.env') });

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
// Marks Auth-UID, siehe CLAUDE.md. Service-Role-Key umgeht RLS, deshalb
// hier explizit statt ueber die Session gesetzt (gleiches Muster wie
// postfach-scan.mjs).
const DASHBOARD_USER_ID = 'df0b24a6-6a74-4830-995c-84015161dcc3';
const PROJEKTE_ORDNER = 'C:\\Users\\PC\\Projekte';

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function findeProjekte() {
  const gefunden = [];
  for (const eintrag of readdirSync(PROJEKTE_ORDNER, { withFileTypes: true })) {
    if (!eintrag.isDirectory()) continue;
    const claudeMdPfad = join(PROJEKTE_ORDNER, eintrag.name, 'CLAUDE.md');
    if (existsSync(claudeMdPfad)) {
      gefunden.push({ name: eintrag.name, inhalt: readFileSync(claudeMdPfad, 'utf-8') });
    }
  }
  return gefunden;
}

async function main() {
  const projekte = findeProjekte();

  const { error: delError } = await supabase.from('claude_projekte')
    .delete().eq('user_id', DASHBOARD_USER_ID);
  if (delError) throw new Error(`Alte Projekte löschen: ${delError.message}`);

  if (projekte.length > 0) {
    const { error: insError } = await supabase.from('claude_projekte').insert(
      projekte.map((p) => ({ user_id: DASHBOARD_USER_ID, name: p.name, inhalt: p.inhalt })),
    );
    if (insError) throw new Error(`Projekte speichern: ${insError.message}`);
  }

  console.log(`Projekte-Sync fertig: ${projekte.length} Projekt(e) synchronisiert.`);
}

main().catch((fehler) => { console.error(fehler); process.exit(1); });
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check automatisierung/projekte-sync.mjs`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (dieses Skript hat keine
automatisierten Tests, bestehende Konvention wie `postfach-scan.mjs`).

- [ ] **Schritt 3: Manueller Testlauf**

Run: `node automatisierung/projekte-sync.mjs` (im Repo-Wurzel, braucht
`automatisierung/.env` mit `SUPABASE_SERVICE_ROLE_KEY`).
Expected: Ausgabe "Projekte-Sync fertig: N Projekt(e) synchronisiert."
mit einer plausiblen Zahl N (Anzahl der Ordner unter
`C:\Users\PC\Projekte\` mit einer `CLAUDE.md`-Datei). Die konkrete
Zahl N im Projekt-Log (Task 4) dokumentieren.

- [ ] **Schritt 4: Windows Scheduled Task einrichten**

PowerShell-Befehl zum Anlegen des Tasks (werktags 06:30/13:00/15:30
Uhr, Wochenende zusätzlich 18:00/21:00 Uhr — fünf Trigger nötig, da
`New-ScheduledTaskTrigger` nur einen Zeitplan pro Aufruf erzeugt,
mehrere Trigger werden als Array übergeben):

```powershell
$Action = New-ScheduledTaskAction -Execute "node.exe" -Argument "automatisierung\projekte-sync.mjs" -WorkingDirectory "C:\Users\PC\Projekte\mein-dashboard"
$TriggerWerktags = @(
  New-ScheduledTaskTrigger -Daily -At 6:30AM -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday
  New-ScheduledTaskTrigger -Daily -At 1:00PM -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday
  New-ScheduledTaskTrigger -Daily -At 3:30PM -DaysOfWeek Monday,Tuesday,Wednesday,Thursday,Friday
)
$TriggerWochenende = @(
  New-ScheduledTaskTrigger -Daily -At 6:30PM -DaysOfWeek Saturday,Sunday
  New-ScheduledTaskTrigger -Daily -At 9:00PM -DaysOfWeek Saturday,Sunday
)
Register-ScheduledTask -TaskName "MeinDashboard-ProjekteSync" -Action $Action -Trigger ($TriggerWerktags + $TriggerWochenende) -Description "Synchronisiert alle CLAUDE.md-Projektdateien nach Supabase"
```

(`-DaysOfWeek` mit `-Daily` ist syntaktisch ungewöhnlich — prüfe beim
Ausführen, ob `New-ScheduledTaskTrigger -Weekly -DaysOfWeek ... -At ...`
stattdessen die korrekte Cmdlet-Syntax für "an bestimmten Wochentagen"
ist, und passe den Befehl entsprechend an, falls `-Daily` das
`-DaysOfWeek`-Argument nicht akzeptiert.)

- [ ] **Schritt 5: Commit**

```bash
git add automatisierung/projekte-sync.mjs
git commit -m "feat: Projekte-Sync-Skript (CLAUDE.md-Dateien nach Supabase)"
```

---

### Task 3: Anzeige-Modul + Suche-Verlinkung

**Files:**
- Create: `js/module/projekte/index.js`
- Create: `js/module/projekte/daten.js`
- Modify: `js/module/suche/index.js`
- Modify: `js/app.js`

**Interfaces:**
- Konsumiert: `zuHtml` (Task 1, `./markdown.js`).
- Produziert: registriert Modul `id:'projekte'` (kein Bottom-Nav-Eintrag).

- [ ] **Schritt 1: `daten.js` anlegen**

```js
import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('claude_projekte').select('*').order('name');
  if (error) throw fehler('Projekte laden', error);
  return { projekte: data };
}
```

- [ ] **Schritt 2: `index.js` anlegen**

```js
import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { zuHtml } from './markdown.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'projekte',
  titel: 'Projekte',
  async init(container) {
    const { projekte } = await ladeAlles();
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="proj-zurueck" type="button">‹ Zurück</button>
        <h2>Projekte</h2>
      </div>
      <div class="punkt-liste" id="proj-liste">
        ${projekte.length === 0 ? '<p class="lade">Noch keine Projekte synchronisiert.</p>' : ''}
      </div>
      <div id="proj-detail" hidden></div>`;
    container.querySelector('#proj-zurueck').addEventListener('click', () => { history.back(); });

    const liste = container.querySelector('#proj-liste');
    const detail = container.querySelector('#proj-detail');
    for (const p of projekte) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="punkt-info"><strong>${esc(p.name)}</strong>
        <small>zuletzt synchronisiert: ${p.sync_zeitstempel.slice(0, 16).replace('T', ' ')}</small></div>`;
      zeile.addEventListener('click', () => {
        liste.hidden = true;
        detail.hidden = false;
        detail.innerHTML = `<button id="proj-detail-zurueck" type="button" class="knopf-neutral" style="margin-bottom:12px;">‹ Alle Projekte</button>
          <div class="punkt-liste" style="padding:14px;">${zuHtml(p.inhalt)}</div>`;
        detail.querySelector('#proj-detail-zurueck').addEventListener('click', () => {
          detail.hidden = true;
          liste.hidden = false;
        });
      });
      liste.appendChild(zeile);
    }
  },
});
```

- [ ] **Schritt 3: `js/app.js` — Modul importieren**

Ergänze in der Import-Liste (Stand nach Sub-Etappe E+F/D) eine Zeile:

```js
import './module/projekte/index.js';
```

`NAV_MODULE` bleibt unverändert.

- [ ] **Schritt 4: Suche-Schnelleinstieg ergänzen**

In `js/module/suche/index.js` (Stand nach Sub-Etappe E+F) das
`SCHNELLEINSTIEGE`-Array um einen Eintrag ergänzen (nach dem
bestehenden `Dokumente`-Eintrag):

```js
  { label: 'Projekte', icon: FOLDER_ICON, ziel: '#/projekte' },
```

(`FOLDER_ICON` ist im selben Array-Kontext bereits definiert, siehe
den `Dokumente`-Eintrag direkt darüber — kein neues Icon nötig.)

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/projekte/index.js && node --check js/module/projekte/daten.js && node --check js/app.js && node --check js/module/suche/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/projekte/index.js js/module/projekte/daten.js js/app.js js/module/suche/index.js
git commit -m "feat: Projekte-Uebersicht-Modul + Suche-Verlinkung"
```

---

### Task 4: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum), Was/Entscheidungen/Stand-danach-Muster.
Inhalt: neues Projekte-Modul, Sync-Skript, Scheduled Task (Zeitplan),
Ergebnis des ersten manuellen Testlaufs (Anzahl gefundener Projekte,
aus Task 2 Schritt 3). Vermerk zum zweifachen Überschreib-Vorfall
dieser Spec-Datei während des Brainstormings (siehe Spec Abschnitt 0)
— Doku-Rigor.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe Q als fertig markieren. Neuen
Abschnitt im "Aufbau"-Teil für `js/module/projekte/` ergänzen sowie für
`automatisierung/projekte-sync.mjs` im Automatisierungs-Abschnitt.
`npm test`-Ausgabe tatsächlich ausführen, echte Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe Q (Projekte-Uebersicht) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Tabelle `claude_projekte` angelegt (RLS, `unique(user_id,name)`).
- [ ] Alle 4 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] `projekte-sync.mjs` einmal manuell ausgeführt, findet alle
      Projekte mit `CLAUDE.md` unter `C:\Users\PC\Projekte\`.
- [ ] Scheduled Task eingerichtet.
- [ ] Suche zeigt "Projekte" als neuen Schnelleinstieg, führt zur
      Liste, Klick auf ein Projekt zeigt gerenderten Markdown-Inhalt.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
