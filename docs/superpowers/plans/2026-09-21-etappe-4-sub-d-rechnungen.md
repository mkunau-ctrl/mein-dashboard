# Etappe 4, Sub-Etappe D: Rechnungen-Modul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein komplett neues Rechnungen-Modul (offen/bezahlt/überfällig),
im Design des Prototyp-Screens "Rechnungen", inkl. Erfassung per
Formular, Chat-Diktat und automatischer E-Mail-Erkennung.

**Architecture:** Neues, eigenständiges Modul `js/module/rechnungen/`
(kein Bottom-Nav-Eintrag, erreichbar über den in Sub-Etappe E+F gebauten
Suche-Schnelleinstieg). Eigene Tabelle `rechnungen`, komplett getrennt
von `expenses`. `automatisierung/klassifizieren.js` bekommt einen neuen
Typ `rechnung`.

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase, kein Framework.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-d-rechnungen-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`-Funktionen bekommen automatisierte Tests.
- Eine bezahlte Rechnung erzeugt **keine** `expenses`-Zeile (Spec
  Abschnitt 0, Annahme 3) — komplett getrenntes Datenmodell.
- "Überfällig" ist eine berechnete Eigenschaft (`istUeberfaellig`),
  kein gespeichertes Feld.
- Dieses Modul bekommt **keinen** eigenen Bottom-Nav-Punkt — Einstieg
  über den Suche-Schnelleinstieg "Rechnungen" (aus Sub-Etappe E+F,
  dort noch dekorativ — Task 4 unten macht ihn echt).

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, reine DB-Aktion):**

1. Tabelle `rechnungen` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null default auth.uid()
   references auth.users`, `haendler text not null`, `betrag numeric
   not null`, `faellig_am date not null`, `status text not null
   default 'offen'` (Check: `status in ('offen','bezahlt')`),
   `bezahlt_am date`, `notiz text`, `quelle text not null default
   'manuell'`, `erstellt_am timestamptz not null default now()`. RLS
   wie überall: `user_id = auth.uid()`, `for all to authenticated`.

---

### Task 1: Berechnungen

**Files:**
- Create: `js/module/rechnungen/berechnung.js`
- Test: `test/rechnungen-berechnung.test.js`

**Interfaces:**
- Produziert: `istUeberfaellig(rechnung, heute): boolean`,
  `sortiereRechnungen(rechnungen, heute): array`,
  `summeOffenerRechnungen(rechnungen): number` — werden von Task 3
  (`rechnungen/index.js`) importiert.

- [ ] **Schritt 1: Test-Datei anlegen**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istUeberfaellig, sortiereRechnungen, summeOffenerRechnungen }
  from '../js/module/rechnungen/berechnung.js';

const rechnungen = [
  { id: 'r1', haendler: 'E.ON', betrag: 148.32, faellig_am: '2026-08-29', status: 'offen' },
  { id: 'r2', haendler: 'Telekom', betrag: 39.95, faellig_am: '2026-09-05', status: 'offen' },
  { id: 'r3', haendler: 'Fitnessstudio', betrag: 24.90, faellig_am: '2026-09-15', status: 'bezahlt', bezahlt_am: '2026-09-10' },
  { id: 'r4', haendler: 'Internet', betrag: 29.99, faellig_am: '2026-10-05', status: 'offen' },
];

test('istUeberfaellig: offen und Faelligkeit vor heute', () => {
  assert.equal(istUeberfaellig(rechnungen[0], '2026-09-21'), true);
  assert.equal(istUeberfaellig(rechnungen[3], '2026-09-21'), false);
  assert.equal(istUeberfaellig(rechnungen[2], '2026-09-21'), false);
});

test('sortiereRechnungen: ueberfaellige (nach Faelligkeit) vor offenen (nach Faelligkeit) vor bezahlten (nach bezahlt_am absteigend)', () => {
  const namen = sortiereRechnungen(rechnungen, '2026-09-21').map((r) => r.haendler);
  assert.deepEqual(namen, ['E.ON', 'Telekom', 'Internet', 'Fitnessstudio']);
});

test('summeOffenerRechnungen: nur status offen', () => {
  assert.equal(summeOffenerRechnungen(rechnungen), 148.32 + 39.95 + 29.99);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `js/module/rechnungen/berechnung.js` existiert noch nicht.

- [ ] **Schritt 3: Implementieren**

```js
// Reine Berechnungen fuers Rechnungen-Modul. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

export function istUeberfaellig(rechnung, heute) {
  return rechnung.status === 'offen' && rechnung.faellig_am < heute;
}

export function sortiereRechnungen(rechnungen, heute) {
  const rang = (r) => {
    if (istUeberfaellig(r, heute)) return 0;
    if (r.status === 'offen') return 1;
    return 2;
  };
  return [...rechnungen].sort((a, b) => {
    const rangA = rang(a);
    const rangB = rang(b);
    if (rangA !== rangB) return rangA - rangB;
    if (rangA === 2) return (b.bezahlt_am || '') < (a.bezahlt_am || '') ? -1 : 1;
    return a.faellig_am < b.faellig_am ? -1 : 1;
  });
}

export function summeOffenerRechnungen(rechnungen) {
  return rechnungen.filter((r) => r.status === 'offen').reduce((s, r) => s + r.betrag, 0);
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/rechnungen/berechnung.js test/rechnungen-berechnung.test.js
git commit -m "feat: Rechnungen-Berechnungen (Ueberfaellig-Erkennung, Sortierung, Summe)"
```

---

### Task 2: Datenzugriff

**Files:**
- Create: `js/module/rechnungen/daten.js`

**Interfaces:**
- Produziert: `ladeAlles(): Promise<{rechnungen}>`,
  `legeRechnungAn({haendler,betrag,faellig_am,notiz,quelle}):
  Promise<void>`, `setzeRechnungBezahlt(id): Promise<void>`,
  `entferneRechnung(id): Promise<void>` — werden von Task 3
  (`rechnungen/index.js`) importiert.

- [ ] **Schritt 1: Datei anlegen**

```js
import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('rechnungen').select('*').order('faellig_am');
  if (error) throw fehler('Rechnungen laden', error);
  return { rechnungen: data };
}

export async function legeRechnungAn({ haendler, betrag, faellig_am, notiz, quelle }) {
  const { error } = await supabase.from('rechnungen').insert({
    haendler, betrag, faellig_am, notiz: notiz || null, quelle: quelle || 'manuell',
  });
  if (error) throw fehler('Rechnung anlegen', error);
}

export async function setzeRechnungBezahlt(id) {
  const { error } = await supabase.from('rechnungen')
    .update({ status: 'bezahlt', bezahlt_am: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw fehler('Rechnung als bezahlt markieren', error);
}

export async function entferneRechnung(id) {
  const { error } = await supabase.from('rechnungen').delete().eq('id', id);
  if (error) throw fehler('Rechnung entfernen', error);
}
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/rechnungen/daten.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 3: Commit**

```bash
git add js/module/rechnungen/daten.js
git commit -m "feat: Datenzugriff fuer Rechnungen"
```

---

### Task 3: UI-Modul

**Files:**
- Create: `js/module/rechnungen/index.js`
- Modify: `app.css`

**Interfaces:**
- Konsumiert: `legeRechnungAn`, `setzeRechnungBezahlt`,
  `entferneRechnung` (Task 2, `./daten.js`); `sortiereRechnungen`,
  `summeOffenerRechnungen`, `istUeberfaellig` (Task 1, `./berechnung.js`).
- Produziert: registriert Modul `id:'rechnungen'` in der Registry
  (kein Bottom-Nav-Eintrag) — wird von Task 4 (`js/app.js`-Import) und
  Task 5 (Suche-Verlinkung) vorausgesetzt.

- [ ] **Schritt 1: CSS für Filter-Chips prüfen**

Run: `grep -n "\.chips\|\.chip " app.css`
Falls `.chips`/`.chip` bereits existieren (aus Sub-Etappe B,
Transaktionen-Tab) — wiederverwenden, keine neue CSS nötig. Falls
Sub-Etappe B zum Zeitpunkt dieser Task noch nicht gebaut ist, hier
ergänzen (nach dem Muster aus `docs/superpowers/plans/2026-09-21-etappe-4-sub-b-finanzen-redesign.md`
Task 4 Schritt 1):

```css
.chips { display: flex; gap: 8px; margin: 14px 0; overflow-x: auto; padding-bottom: 2px; }
.chip { flex: none; padding: 8px 14px; border-radius: 999px; font-size: .82rem;
  font-weight: 600; border: 1px solid var(--rand); background: var(--karte);
  color: var(--gedaempft); cursor: pointer; font-family: inherit; }
.chip.aktiv { background: var(--text); color: var(--bg); border-color: var(--text); }
```

- [ ] **Schritt 2: `index.js` anlegen**

```js
import { registriere } from '../../registry.js';
import { ladeAlles, legeRechnungAn, setzeRechnungBezahlt, entferneRechnung } from './daten.js';
import { sortiereRechnungen, summeOffenerRechnungen, istUeberfaellig } from './berechnung.js';

const RECHNUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const FILTER = ['alle', 'offen', 'bezahlt', 'ueberfaellig'];
const FILTER_TEXT = { alle: 'Alle', offen: 'Offen', bezahlt: 'Bezahlt', ueberfaellig: 'Überfällig' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;
let filter = 'offen';

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="haendler" type="text" placeholder="Händler (z. B. E.ON)" required>
    <input name="betrag" type="number" step="0.01" placeholder="Betrag" required>
    <input name="faellig_am" type="date" required>
    <button type="submit">+ Rechnung anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeRechnungAn({
        haendler: daten.get('haendler'),
        betrag: Number(daten.get('betrag')),
        faellig_am: daten.get('faellig_am'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

function zeichneListe(container, aktualisieren) {
  const heuteStr = heute();
  const gefiltert = sortiereRechnungen(zustand.rechnungen, heuteStr).filter((r) => {
    if (filter === 'alle') return true;
    if (filter === 'ueberfaellig') return istUeberfaellig(r, heuteStr);
    return r.status === filter;
  });
  const liste = container.querySelector('#rn-liste');
  liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Rechnungen in dieser Ansicht.</p>' : '';
  for (const r of gefiltert) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    const ueberfaellig = istUeberfaellig(r, heuteStr);
    const statusText = r.status === 'bezahlt' ? 'Bezahlt' : ueberfaellig ? 'Überfällig' : 'Offen';
    const statusKlasse = r.status === 'bezahlt' ? 'status-da' : ueberfaellig ? 'status-fehlt' : 'status-bestellt';
    zeile.innerHTML = `
      <div class="icon-badge">${RECHNUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(r.haendler)}</strong>
        <small>${r.betrag.toFixed(2)} € · fällig ${r.faellig_am}</small>
      </div>
      <span class="status-badge ${statusKlasse}">${statusText}</span>
      <div class="punkt-aktionen">
        ${r.status === 'offen' ? '<button data-a="bezahlt">✓</button>' : ''}
        <button data-a="weg">✕</button>
      </div>`;
    if (r.status === 'offen') {
      zeile.querySelector('[data-a=bezahlt]').addEventListener('click', async () => {
        try { await setzeRechnungBezahlt(r.id); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
    }
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Rechnung „${r.haendler}" entfernen?`)) return;
      try { await entferneRechnung(r.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}

registriere({
  id: 'rechnungen',
  titel: 'Rechnungen',
  async init(container) {
    if (!zustand) await ladeZustand();
    const aktualisieren = async () => { await ladeZustand(); render(); };

    function render() {
      container.innerHTML = `
        <div class="modul-kopf">
          <button id="rn-zurueck" type="button">‹ Zurück</button>
          <h2>Rechnungen</h2>
        </div>
        <div class="stat-karte gross">
          <small>Offene Rechnungen</small>
          <span>${summeOffenerRechnungen(zustand.rechnungen).toFixed(2)} €</span>
        </div>
        <div class="chips">
          ${FILTER.map((f) => `<button type="button" class="chip${f === filter ? ' aktiv' : ''}" data-f="${f}">${FILTER_TEXT[f]}</button>`).join('')}
        </div>
        <div class="punkt-liste" id="rn-liste"></div>`;
      container.querySelector('#rn-zurueck').addEventListener('click', () => { history.back(); });
      baueFormular(container, aktualisieren);
      container.querySelectorAll('[data-f]').forEach((btn) => {
        btn.addEventListener('click', () => {
          filter = btn.dataset.f;
          container.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('aktiv', b.dataset.f === filter));
          zeichneListe(container, aktualisieren);
        });
      });
      zeichneListe(container, aktualisieren);
    }
    render();
  },
});
```

(`status-da`/`status-fehlt`/`status-bestellt` sind bestehende CSS-Klassen
aus dem Lager-Modul, hier zweckentfremdet für grün/rot/gelb — grep vor
dem Schreiben mit `grep -n "\.status-da\|\.status-fehlt\|\.status-bestellt" app.css`
um zu bestätigen, dass diese Klassen wirklich grün/rot/gelb-artige
Farben liefern; falls nicht, stattdessen die vorhandenen
`.status-unterwegs`/`.status-abholbereit`/`.status-zugestellt`-Klassen
aus dem Sendungen-Modul verwenden, die eindeutig blau/gelb/grün sind.)

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/rechnungen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/rechnungen/index.js app.css
git commit -m "feat: Rechnungen-UI (Formular, Filter-Chips, Summenkarte)"
```

---

### Task 4: E-Mail-Automatisierung erweitern

**Files:**
- Modify: `automatisierung/klassifizieren.js`
- Modify: `automatisierung/postfach-scan.mjs`
- Test: `test/automatisierung-klassifizieren.test.js`

**Interfaces:**
- Konsumiert: nichts Neues.
- Produziert: `parseKlassifikation` akzeptiert jetzt auch `typ:'rechnung'`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/automatisierung-klassifizieren.test.js` am Ende ergänzen:

```js
test('parseKlassifikation: akzeptiert Typ rechnung mit vollstaendigen Feldern', () => {
  const ergebnis = parseKlassifikation(JSON.stringify({
    typ: 'rechnung', haendler: 'E.ON', betrag: 148.32, faelligAm: '2026-08-29',
  }));
  assert.equal(ergebnis.typ, 'rechnung');
  assert.equal(ergebnis.haendler, 'E.ON');
});

test('parseKlassifikation: rechnung ohne Haendler wirft Fehler', () => {
  assert.throws(() => parseKlassifikation(JSON.stringify({ typ: 'rechnung', betrag: 10, faelligAm: '2026-08-29' })));
});

test('baustePrompt: erwaehnt den neuen Typ rechnung', () => {
  assert.ok(baustePrompt().includes('rechnung'));
});
```

(Import-Zeile am Dateianfang um `baustePrompt` erweitern, falls noch
nicht importiert.)

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `rechnung` ist kein erlaubter Typ.

- [ ] **Schritt 3: `klassifizieren.js` erweitern**

Die bestehende Zeile

```js
const ERLAUBTE_TYPEN = ['beleg', 'sendung', 'amazon', 'termin', 'sonstiges'];
```

ersetzen durch:

```js
const ERLAUBTE_TYPEN = ['beleg', 'sendung', 'amazon', 'termin', 'rechnung', 'sonstiges'];
```

Die bestehende Prompt-Funktion

```js
export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon/Rechnung für einen Kauf
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin (z. B. Prüfungsanmeldung, Rechnungsfälligkeit)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.
Fülle "statusText"/"ort"/"abholcode"/"abholadresse"/"abholzeiten" NUR, wenn der Wert wörtlich oder eindeutig aus der E-Mail hervorgeht. Erfinde keine Werte - bei Unsicherheit null.`;
}
```

komplett ersetzen durch:

```js
export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon für einen bereits bezahlten Kauf (z. B. Supermarkt-Kassenbon per Mail)
- "rechnung": eine noch zu bezahlende Rechnung mit Fälligkeitsdatum (z. B. Stromrechnung, Telefonrechnung, Mitgliedsbeitrag)
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin ohne Rechnungsbetrag (z. B. Prüfungsanmeldung)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- rechnung: {"typ":"rechnung","haendler":string,"betrag":number,"faelligAm":"YYYY-MM-DD"}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.
Fülle "statusText"/"ort"/"abholcode"/"abholadresse"/"abholzeiten" NUR, wenn der Wert wörtlich oder eindeutig aus der E-Mail hervorgeht. Erfinde keine Werte - bei Unsicherheit null.`;
}
```

Die bestehende Prüfung in `parseKlassifikation`

```js
  if (objekt.typ === 'termin' && (!objekt.titel || !objekt.faelligAm)) {
    throw new Error(`Termin unvollständig: ${rohtext}`);
  }
  return objekt;
```

ersetzen durch:

```js
  if (objekt.typ === 'termin' && (!objekt.titel || !objekt.faelligAm)) {
    throw new Error(`Termin unvollständig: ${rohtext}`);
  }
  if (objekt.typ === 'rechnung' &&
      (!objekt.haendler || typeof objekt.betrag !== 'number' || !objekt.faelligAm)) {
    throw new Error(`Rechnung unvollständig: ${rohtext}`);
  }
  return objekt;
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `postfach-scan.mjs` — neuer Zweig**

Die bestehende Funktion `schreibeErgebnis` (Stand nach Sub-Etappe A's
Fix-Wave, mit `konto_id` beim `beleg`-Zweig)

```js
async function schreibeErgebnis(k, kontoId) {
  if (k.typ === 'beleg') {
    const { error } = await supabase.from('expenses').insert({
      user_id: DASHBOARD_USER_ID, betrag: k.betrag, kategorie: k.kategorie || 'sonstiges',
      datum: k.datum, notiz: k.haendler, quelle: 'email', konto_id: kontoId,
    });
    if (error) throw new Error(`Beleg speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    await schreibeSendung(k);
    return;
  }
  if (k.typ === 'termin') {
    const { error } = await supabase.from('termine').insert({
      user_id: DASHBOARD_USER_ID, titel: k.titel, faellig_am: k.faelligAm, quelle: 'email',
    });
    if (error) throw new Error(`Termin speichern: ${error.message}`);
  }
}
```

(Lies die Datei vor dem Ändern einmal komplett, da sich die exakte
Zeilenlage seit Sub-Etappe A verschoben haben kann — die Textblöcke
oben müssen exakt matchen, bevor du ersetzt.)

ersetzen durch:

```js
async function schreibeErgebnis(k, kontoId) {
  if (k.typ === 'beleg') {
    const { error } = await supabase.from('expenses').insert({
      user_id: DASHBOARD_USER_ID, betrag: k.betrag, kategorie: k.kategorie || 'sonstiges',
      datum: k.datum, notiz: k.haendler, quelle: 'email', konto_id: kontoId,
    });
    if (error) throw new Error(`Beleg speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'rechnung') {
    const { error } = await supabase.from('rechnungen').insert({
      user_id: DASHBOARD_USER_ID, haendler: k.haendler, betrag: k.betrag,
      faellig_am: k.faelligAm, quelle: 'email',
    });
    if (error) throw new Error(`Rechnung speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    await schreibeSendung(k);
    return;
  }
  if (k.typ === 'termin') {
    const { error } = await supabase.from('termine').insert({
      user_id: DASHBOARD_USER_ID, titel: k.titel, faellig_am: k.faelligAm, quelle: 'email',
    });
    if (error) throw new Error(`Termin speichern: ${error.message}`);
  }
}
```

- [ ] **Schritt 6: Statische Prüfung**

Run: `node --check automatisierung/klassifizieren.js && node --check automatisierung/postfach-scan.mjs`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (`postfach-scan.mjs` hat keine
automatisierten Tests, bestehende Konvention).

- [ ] **Schritt 7: Commit**

```bash
git add automatisierung/klassifizieren.js automatisierung/postfach-scan.mjs test/automatisierung-klassifizieren.test.js
git commit -m "feat: E-Mail-Automatisierung erkennt Rechnungen"
```

---

### Task 5: Modul verdrahten + Suche-Verlinkung

**Files:**
- Modify: `js/app.js`
- Modify: `js/module/suche/index.js`

**Interfaces:**
- Konsumiert: registriertes Modul `id:'rechnungen'` (Task 3).

- [ ] **Schritt 1: `js/app.js` — Modul importieren**

Die bestehende Import-Liste (Stand nach Sub-Etappe E+F, mit
`einstellungen`) um eine Zeile ergänzen:

```js
import './module/rechnungen/index.js';
```

(Direkt nach der `einstellungen`-Import-Zeile einfügen, falls
vorhanden — sonst nach `profil/index.js`.) `NAV_MODULE` bleibt
unverändert.

- [ ] **Schritt 2: Suche-Schnelleinstieg auf echte Navigation umstellen**

In `js/module/suche/index.js` (Stand nach Sub-Etappe E+F) die
bestehende Zeile im `SCHNELLEINSTIEGE`-Array

```js
  { label: 'Rechnungen', icon: RECEIPT_ICON, ziel: null },
```

ersetzen durch:

```js
  { label: 'Rechnungen', icon: RECEIPT_ICON, ziel: '#/rechnungen' },
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/app.js && node --check js/module/suche/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/app.js js/module/suche/index.js
git commit -m "feat: Rechnungen-Modul verdrahtet, Suche-Schnelleinstieg echt"
```

---

### Task 6: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum), Was/Entscheidungen/Stand-danach-Muster.
Inhalt: neues Rechnungen-Modul, neue Tabelle `rechnungen`, neuer
E-Mail-Klassifikations-Typ `rechnung`, die vier Annahmen aus der Spec
(Abschnitt 0) als getroffene Entscheidungen dokumentieren (Doku-Rigor:
klar machen, dass diese ohne direkte Nutzer-Rückfrage getroffen
wurden).

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe D als fertig markieren. Neuen
Abschnitt im "Aufbau"-Teil für `js/module/rechnungen/` ergänzen
(Dateien, Tabelle, Konventionen — analog zu den anderen Modul-
Beschreibungen). `npm test`-Ausgabe tatsächlich ausführen, echte
Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe D (Rechnungen-Modul) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Tabelle `rechnungen` angelegt (RLS, Check-Constraint `status`).
- [ ] Alle 6 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Rechnung anlegen (Formular + Chat-Diktat-fähige `daten.js`-
      Funktion), als bezahlt markieren, löschen funktioniert.
- [ ] Filter-Chips zeigen korrekt Alle/Offen/Bezahlt/Überfällig.
- [ ] E-Mail-Automatisierung erkennt Rechnungen, legt sie automatisch an.
- [ ] Suche-Schnelleinstieg "Rechnungen" führt zur echten Liste.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
