# Etappe 4, Sub-Etappe E+F (+Detail-Klicks Sendungen/Termine/Todos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Profil/Suche/Ausbildung sehen wie im Prototyp aus, ein neuer
Einstellungen-Screen entsteht, Sendungen/Termine/To-dos werden
anklickbar mit Detailansicht.

**Architecture:** `js/router.js` bekommt ein drittes Hash-Segment
(`detail`). Sendungen und Todos reichen `detail` an ihre Tab-Funktionen
durch, die je nach `detail` Liste oder Detailansicht rendern. Profil/
Suche/Ausbildung werden nach Prototyp umgebaut, ein neues, nicht in der
Bottom-Nav sichtbares Einstellungen-Modul entsteht.

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase, kein Framework.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-e-f-design-einstellungen-detailklicks-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Dekorative Prototyp-Elemente ohne Backend (Benachrichtigungen,
  Bankkonto/Google-Drive-Anzeige, Profil-Menüpunkte "Persönliche
  Daten"/"Dokumente"/"Konten & Verbindungen") werden 1:1 gebaut,
  Schalter nur visuell umschaltbar (kein `localStorage`, keine DB),
  Menüpunkte ohne echte Funktion zeigen `alert('Noch nicht verfügbar.')`
  statt Navigation.
- Nur `berechnung.js`-Funktionen bekommen automatisierte Tests.
- Ausbildungsbeginn `2026-08-01`, Dauer `3.5` Jahre (vom Koordinator per
  Supabase-MCP in `berichtsheft_settings` eingetragen, siehe
  Vorbereitung).

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, reine DB-Aktion ohne Repo-Dateien):**

1. `berichtsheft_settings`-Zeilen einfügen: `ausbildungsbeginn` →
   `"2026-08-01"`, `ausbildungsdauer_jahre` → `3.5`.

---

### Task 1: Router-Erweiterung + Ausbildungsfortschritt-Berechnung

**Files:**
- Modify: `js/router.js`
- Modify: `js/module/berichtsheft/berechnung.js`
- Test: `test/router.test.js`
- Test: `test/berichtsheft-berechnung.test.js`

**Interfaces:**
- Produziert: `parseHash(hash): { modul, unterseite, detail }` (drittes
  Feld neu) — wird von Task 2 (`sendungen/index.js`) und Task 4
  (`todos/index.js`) konsumiert. `ausbildungsFortschritt(beginn,
  dauerJahre, heute): { jahr, prozent }` — wird von Task 8
  (`berichtsheft/uebersicht.js`) konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test für `parseHash` schreiben**

Die bestehende Test-Datei `test/router.test.js` lesen (Struktur
übernehmen), am Ende ergänzen:

```js
test('parseHash: drittes Segment (detail) wird erkannt', () => {
  assert.deepEqual(parseHash('#/sendungen/pakete/abc-123'),
    { modul: 'sendungen', unterseite: 'pakete', detail: 'abc-123' });
});

test('parseHash: detail ist null ohne drittes Segment', () => {
  assert.deepEqual(parseHash('#/sendungen/pakete'),
    { modul: 'sendungen', unterseite: 'pakete', detail: null });
});

test('parseHash: UUID-Zeichen (Ziffern) im dritten Segment werden erkannt', () => {
  assert.deepEqual(parseHash('#/todos/offen/3f9a1c2d-44e0-4b11-9b7a-000000000001'),
    { modul: 'todos', unterseite: 'offen', detail: '3f9a1c2d-44e0-4b11-9b7a-000000000001' });
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `parseHash` liefert noch kein `detail`-Feld, und die
Zeichenklasse `[a-z-]+` matcht keine Ziffern (UUID-Test schlägt fehl).

- [ ] **Schritt 3: `parseHash` erweitern**

Die komplette bestehende Datei `js/router.js`

```js
// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung'            -> { modul: 'ernaehrung', unterseite: null }
// '#/ernaehrung/statistik'  -> { modul: 'ernaehrung', unterseite: 'statistik' }
// alles andere              -> { modul: null, unterseite: null }
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)(?:\/([a-z-]+))?/.exec(hash || '');
  return { modul: m ? m[1] : null, unterseite: m && m[2] ? m[2] : null };
}
```

komplett ersetzen durch:

```js
// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung'                  -> { modul: 'ernaehrung', unterseite: null, detail: null }
// '#/ernaehrung/statistik'        -> { modul: 'ernaehrung', unterseite: 'statistik', detail: null }
// '#/sendungen/pakete/<id>'       -> { modul: 'sendungen', unterseite: 'pakete', detail: '<id>' }
// alles andere                    -> { modul: null, unterseite: null, detail: null }
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?/.exec(hash || '');
  return {
    modul: m ? m[1] : null,
    unterseite: m && m[2] ? m[2] : null,
    detail: m && m[3] ? m[3] : null,
  };
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen (Router-Teil)**

Run: `npm test`
Expected: `test/router.test.js` PASS. Die `berichtsheft-berechnung`-Tests
aus Schritt 5 unten fehlen noch — Gesamtsuite ist erst nach Schritt 6 grün.

- [ ] **Schritt 5: Fehlschlagenden Test für `ausbildungsFortschritt` schreiben**

`test/berichtsheft-berechnung.test.js` — bestehende Import-Zeile um
`ausbildungsFortschritt` erweitern, am Ende ergänzen:

```js
test('ausbildungsFortschritt: Jahr und Prozent korrekt berechnet', () => {
  assert.deepEqual(ausbildungsFortschritt('2026-08-01', 3.5, '2026-09-21'), { jahr: 1, prozent: 4 });
});

test('ausbildungsFortschritt: Prozent wird bei Ueberschreiten auf 100 begrenzt', () => {
  assert.deepEqual(ausbildungsFortschritt('2020-08-01', 3.5, '2026-09-21'), { jahr: 7, prozent: 100 });
});
```

- [ ] **Schritt 6: `ausbildungsFortschritt` implementieren**

Am Ende von `js/module/berichtsheft/berechnung.js` ergänzen:

```js
export function ausbildungsFortschritt(beginn, dauerJahre, heute) {
  const jahr = ausbildungsjahr(beginn, heute);
  const gesamtTage = dauerJahre * 365.25;
  const vergangeneTage = (tagMs(heute) - tagMs(beginn)) / TAG_MS;
  const prozent = Math.round(Math.min(100, Math.max(0, (vergangeneTage / gesamtTage) * 100)));
  return { jahr, prozent };
}
```

- [ ] **Schritt 7: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 8: Commit**

```bash
git add js/router.js test/router.test.js js/module/berichtsheft/berechnung.js test/berichtsheft-berechnung.test.js
git commit -m "feat: Router-drittes-Segment fuer Detail-Klicks, Ausbildungsfortschritt-Berechnung"
```

---

### Task 2: Sendungen — Detail-Klick "Pakete"

**Files:**
- Modify: `js/module/sendungen/daten.js`
- Modify: `js/module/sendungen/pakete.js`
- Modify: `js/module/sendungen/index.js`
- Create: `js/module/sendungen/sendung-detail.js`

**Interfaces:**
- Konsumiert: `parseHash` (Task 1, liefert jetzt `detail`).
- Produziert: `zeigeSendungDetail(container, sendung, ereignisse,
  zurueck): void` — wird von `pakete.js` per dynamischem Import
  aufgerufen.

- [ ] **Schritt 1: `daten.js` lädt `sendungen_ereignisse`**

Die bestehende Funktion

```js
export async function ladeAlles() {
  const [sendungen, termine] = await Promise.all([
    supabase.from('sendungen').select('*'),
    supabase.from('termine').select('*'),
  ]);
  if (sendungen.error) throw fehler('Sendungen laden', sendungen.error);
  if (termine.error) throw fehler('Termine laden', termine.error);
  return { sendungen: sendungen.data, termine: termine.data };
}
```

ersetzen durch:

```js
export async function ladeAlles() {
  const [sendungen, termine, ereignisse] = await Promise.all([
    supabase.from('sendungen').select('*'),
    supabase.from('termine').select('*'),
    supabase.from('sendungen_ereignisse').select('*').order('erstellt_am'),
  ]);
  if (sendungen.error) throw fehler('Sendungen laden', sendungen.error);
  if (termine.error) throw fehler('Termine laden', termine.error);
  if (ereignisse.error) throw fehler('Sendungs-Ereignisse laden', ereignisse.error);
  return { sendungen: sendungen.data, termine: termine.data, ereignisse: ereignisse.data };
}
```

- [ ] **Schritt 2: `sendung-detail.js` anlegen**

```js
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeSendungDetail(container, sendung, ereignisse, zurueck) {
  const eigene = ereignisse.filter((e) => e.sendung_id === sendung.id)
    .sort((a, b) => (a.erstellt_am < b.erstellt_am ? -1 : 1));
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="sd-zurueck" type="button">‹ Sendungen</button>
      <h2>${esc(sendung.haendler)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${BOX_ICON}</div>
        <div class="punkt-info"><strong>${esc(sendung.beschreibung || sendung.haendler)}</strong>
        <small>${sendung.trackingnummer ? esc(sendung.trackingnummer) : 'keine Trackingnummer'}</small></div>
        <span class="status-badge status-${sendung.status}">${esc(sendung.status)}</span></div>
      ${sendung.abholcode ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholcode</strong><small>${esc(sendung.abholcode)}</small></div></div>` : ''}
      ${sendung.abholadresse ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholadresse</strong><small>${esc(sendung.abholadresse)}</small></div></div>` : ''}
      ${sendung.abholzeiten ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholzeiten</strong><small>${esc(sendung.abholzeiten)}</small></div></div>` : ''}
    </div>
    <div class="section-head"><h2>Verlauf</h2></div>
    <div class="punkt-liste">
      ${eigene.length === 0 ? '<p class="lade">Noch keine Status-Ereignisse erfasst.</p>' : eigene.map((e) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><strong>${esc(e.beschreibung)}</strong>
          <small>${e.erstellt_am.slice(0, 16).replace('T', ' ')}${e.ort ? ` · ${esc(e.ort)}` : ''}</small></div>
        </div>`).join('')}
    </div>`;
  container.querySelector('#sd-zurueck').addEventListener('click', zurueck);
}
```

- [ ] **Schritt 3: `pakete.js` — Zeile klickbar machen**

Die bestehende Funktion `zeigePakete` komplett ersetzen durch:

```js
import { setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigePakete(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const sendung = zustand.sendungen.find((s) => s.id === detail);
    if (sendung) {
      const { zeigeSendungDetail } = await import('./sendung-detail.js');
      zeigeSendungDetail(container, sendung, zustand.ereignisse, () => { location.hash = '#/sendungen/pakete'; });
      return;
    }
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const s of sortiereSendungen(zustand.sendungen)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small>${s.beschreibung ? esc(s.beschreibung) : ''}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${s.status}">${STATUS_TEXT[s.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/sendungen/pakete/${s.id}`; });
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.stopPropagation();
      e.target.disabled = true;
      try { await setzeSendungStatus(s.id, naechsterSendungStatus(s.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Sendung von „${s.haendler}" entfernen?`)) return;
      try { await entferneSendung(s.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
```

(Neu: 6. Parameter `detail`, Zeilen-Klick auf `location.hash`, die zwei
bestehenden Buttons bekommen `e.stopPropagation()`, damit ihr Klick
nicht zusätzlich die Zeile navigiert.)

- [ ] **Schritt 4: `sendungen/index.js` — `detail` durchreichen**

Die bestehende Funktion `zeigeAktuellenTab`

```js
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
```

ersetzen durch:

```js
async function zeigeAktuellenTab() {
  const { unterseite, detail } = parseHash(location.hash);
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
    }, null, null, detail);
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}
```

(Parameter 4/5 bleiben `null` — `zeitraum`/`setZeitraum` sind ein
Finanzen-spezifisches Konzept aus Sub-Etappe B, hier ungenutzt, aber
die Positions-Reihenfolge `(container, zustand, aktualisieren,
zeitraum, setZeitraum, detail)` bleibt über alle Module hinweg
einheitlich.)

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/sendungen/daten.js && node --check js/module/sendungen/pakete.js && node --check js/module/sendungen/sendung-detail.js && node --check js/module/sendungen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/sendungen/daten.js js/module/sendungen/pakete.js js/module/sendungen/index.js js/module/sendungen/sendung-detail.js
git commit -m "feat: Sendungen-Detailansicht (Abholcode/-adresse/-zeiten, Status-Verlauf)"
```

---

### Task 3: Sendungen — Detail-Klick "Termine"

**Files:**
- Modify: `js/module/sendungen/termine.js`
- Create: `js/module/sendungen/termin-detail.js`

**Interfaces:**
- Konsumiert: `detail`-Parameter (Task 2 hat das Muster in `pakete.js`/
  `index.js` bereits etabliert; `index.js` reicht `detail` bereits an
  alle Tabs durch, hier nur noch `termine.js` selbst anpassen).
- Produziert: `zeigeTerminDetail(container, termin, zurueck): void`.

- [ ] **Schritt 1: `termin-detail.js` anlegen**

```js
const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeTerminDetail(container, termin, zurueck) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="td-zurueck" type="button">‹ Termine</button>
      <h2>${esc(termin.titel)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${KALENDER_ICON}</div>
        <div class="punkt-info"><strong>Fällig am</strong><small>${termin.faellig_am}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Quelle</strong>
        <small>${termin.quelle === 'email' ? 'E-Mail-Automatisierung' : 'manuell'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Status</strong>
        <small>${termin.erledigt ? 'erledigt' : 'offen'}</small></div></div>
    </div>`;
  container.querySelector('#td-zurueck').addEventListener('click', zurueck);
}
```

- [ ] **Schritt 2: `termine.js` — Zeile klickbar machen**

Die bestehende Funktion `zeigeTermine` komplett ersetzen durch:

```js
import { hakeTerminAb, entferneTermin } from './daten.js';
import { sortiereTermine } from './berechnung.js';

const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const termin = zustand.termine.find((t) => t.id === detail);
    if (termin) {
      const { zeigeTerminDetail } = await import('./termin-detail.js');
      zeigeTerminDetail(container, termin, () => { location.hash = '#/sendungen/termine'; });
      return;
    }
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTermine(zustand.termine)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${KALENDER_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.titel)}</strong>
        <small>fällig am ${t.faellig_am}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="ab">✓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/sendungen/termine/${t.id}`; });
    zeile.querySelector('[data-a=ab]').addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await hakeTerminAb(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Termin „${t.titel}" entfernen?`)) return;
      try { await entferneTermin(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/sendungen/termine.js && node --check js/module/sendungen/termin-detail.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/sendungen/termine.js js/module/sendungen/termin-detail.js
git commit -m "feat: Termine-Detailansicht"
```

---

### Task 4: To-dos — Detail-Klick

**Files:**
- Modify: `js/module/todos/offen.js`
- Modify: `js/module/todos/erledigt.js`
- Modify: `js/module/todos/index.js`
- Create: `js/module/todos/todo-detail.js`

**Interfaces:**
- Konsumiert: `parseHash` (Task 1).
- Produziert: `zeigeTodoDetail(container, todo, zurueck): void`.

- [ ] **Schritt 1: `todo-detail.js` anlegen**

```js
const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeTodoDetail(container, todo, zurueck) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="tdd-zurueck" type="button">‹ To-dos</button>
      <h2>${esc(todo.text)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${TODO_ICON}</div>
        <div class="punkt-info"><strong>Fällig</strong><small>${todo.faellig || 'kein Datum'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Wiederkehr</strong>
        <small>${todo.vorlage_id ? 'wiederkehrend' : 'einmalig'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Status</strong>
        <small>${todo.erledigt ? `erledigt am ${(todo.erledigt_am || '').slice(0, 10)}` : 'offen'}</small></div></div>
    </div>`;
  container.querySelector('#tdd-zurueck').addEventListener('click', zurueck);
}
```

- [ ] **Schritt 2: `offen.js` — Zeile klickbar machen**

Die bestehende Funktion `zeigeOffen` komplett ersetzen durch:

```js
import { hakeAb, entferneTodo } from './daten.js';
import { sortiereOffeneTodos, istUeberfaellig } from './planung.js';

const WIEDERHOLUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5M20 20v-5h-5"/><path d="M4.5 15a8 8 0 0 0 14.7 3.2M19.5 9A8 8 0 0 0 4.8 5.8"/></svg>';
const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeOffen(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const todo = zustand.offen.find((t) => t.id === detail);
    if (todo) {
      const { zeigeTodoDetail } = await import('./todo-detail.js');
      zeigeTodoDetail(container, todo, () => { location.hash = '#/todos/offen'; });
      return;
    }
  }

  const heuteStr = heute();
  const todos = sortiereOffeneTodos(zustand.offen, heuteStr);

  if (todos.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Keine offenen Todos.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of todos) {
    const ueberfaellig = istUeberfaellig(t, heuteStr);
    const icon = t.vorlage_id ? WIEDERHOLUNG_ICON : t.faellig ? KALENDER_ICON : TODO_ICON;
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${icon}</div>
      <label class="heute-zeile" style="flex:1; padding:0;">
        <input type="checkbox">
        <span>${esc(t.text)}${t.faellig
          ? (ueberfaellig
              ? ` <span class="badge-ueberfaellig">überfällig, ${t.faellig}</span>`
              : ` <small>(${t.faellig})</small>`)
          : ''}</span>
      </label>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;

    const box = zeile.querySelector('input');
    box.addEventListener('click', (e) => e.stopPropagation());
    box.addEventListener('change', async () => {
      box.disabled = true;
      try { await hakeAb(t); await aktualisieren(); }
      catch (e) { box.checked = false; box.disabled = false; alert(e.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      const hinweis = t.vorlage_id
        ? `„${t.text}" entfernen? Die Wiederkehr wird beendet.`
        : `„${t.text}" entfernen?`;
      if (!confirm(hinweis)) return;
      try { await entferneTodo(t); await aktualisieren(); }
      catch (e) { alert(e.message); }
    });
    zeile.addEventListener('click', () => { location.hash = `#/todos/offen/${t.id}`; });
    liste.appendChild(zeile);
  }
}
```

(Checkbox bekommt zusätzlich einen `click`-Stopper, da `label` das
`input` sonst über den Zeilen-Klick hinaus mit auslösen würde — nur
`change` reicht hier nicht, weil das Label selbst schon Teil der Zeile
ist, die jetzt einen eigenen Klick-Handler hat.)

- [ ] **Schritt 3: `erledigt.js` — Zeile klickbar machen**

Die bestehende Funktion `zeigeErledigt` komplett ersetzen durch:

```js
const ERLEDIGT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeErledigt(container, zustand, _aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const todo = zustand.erledigt.find((t) => t.id === detail);
    if (todo) {
      const { zeigeTodoDetail } = await import('./todo-detail.js');
      zeigeTodoDetail(container, todo, () => { location.hash = '#/todos/erledigt'; });
      return;
    }
  }

  if (zustand.erledigt.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch nichts erledigt (letzte 60 Tage).';
    container.appendChild(p);
    return;
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of zustand.erledigt) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${ERLEDIGT_ICON}</div>
      <div class="punkt-info">
        <span>${esc(t.text)}</span>
        <small>erledigt am ${t.erledigt_am.slice(0, 10)}</small>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/todos/erledigt/${t.id}`; });
    liste.appendChild(zeile);
  }
}
```

- [ ] **Schritt 4: `todos/index.js` — `detail` durchreichen**

Die bestehende Funktion `zeigeAktuellenTab`

```js
async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'offen';
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
```

ersetzen durch:

```js
async function zeigeAktuellenTab() {
  const { unterseite, detail } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'offen';
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
    }, null, null, detail);
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}
```

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/todos/offen.js && node --check js/module/todos/erledigt.js && node --check js/module/todos/todo-detail.js && node --check js/module/todos/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/todos/offen.js js/module/todos/erledigt.js js/module/todos/todo-detail.js js/module/todos/index.js
git commit -m "feat: To-do-Detailansicht"
```

---

### Task 5: Profil-Screen nach Prototyp

**Files:**
- Modify: `js/module/profil/index.js`

**Interfaces:**
- Konsumiert: `holeSession`, `meldeAb` (bereits vorhanden, `../../auth.js`).
- Keine neuen Exporte.

- [ ] **Schritt 1: Datei komplett ersetzen**

Die bestehende komplette Datei

```js
import { registriere } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'profil',
  titel: 'Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    const email = session?.user?.email ?? '';
    const buchstabe = email ? email[0].toUpperCase() : '?';
    container.innerHTML = `
      <header class="modul-kopf"><h2>Profil</h2></header>
      <div class="avatar">${esc(buchstabe)}</div>
      <p style="text-align:center;">Angemeldet als <strong>${esc(email) || '–'}</strong></p>
      <p class="lade">Hell/Dunkel-Umschalter findest du oben rechts im Header.</p>
      <button id="profil-abmelden" class="knopf-neutral">Abmelden</button>`;
    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
```

komplett ersetzen durch:

```js
import { registriere } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';
const USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.1 0l2-2a5 5 0 00-7.1-7.1l-1 1"/><path d="M14 11a5 5 0 00-7.1 0l-2 2a5 5 0 007.1 7.1l1-1"/></svg>';
const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>';
const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
const GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const MENU = [
  { label: 'Persönliche Daten', icon: USER_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Konten & Verbindungen', icon: LINK_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Dokumente', icon: FOLDER_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Berichtsheft', icon: DOC_ICON, aktion: () => { location.hash = '#/berichtsheft'; } },
  { label: 'App-Einstellungen', icon: GEAR_ICON, aktion: () => { location.hash = '#/einstellungen'; } },
];

registriere({
  id: 'profil',
  titel: 'Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    const email = session?.user?.email ?? '';
    const buchstabe = email ? email[0].toUpperCase() : '?';
    const name = email ? email.split('@')[0] : '–';
    container.innerHTML = `
      <header class="modul-kopf"><h2>Profil</h2></header>
      <div class="avatar">${esc(buchstabe)}</div>
      <p style="text-align:center;font-weight:700;margin:0;">${esc(name)}</p>
      <p style="text-align:center;color:var(--gedaempft);margin:2px 0 16px;">${esc(email) || '–'}</p>
      <div class="punkt-liste" id="profil-menu"></div>
      <button id="profil-abmelden" class="knopf-neutral" style="margin-top:16px;">Abmelden</button>`;

    const menu = container.querySelector('#profil-menu');
    MENU.forEach((item, i) => {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="icon-badge">${item.icon}</div>
        <div class="punkt-info"><strong>${esc(item.label)}</strong></div>
        <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
      zeile.addEventListener('click', () => MENU[i].aktion());
      menu.appendChild(zeile);
    });

    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
```

(Der Prototyp hat zusätzlich einen "Sicherheit"-Menüpunkt — laut Spec
Abschnitt 6 bewusst weggelassen, da Sicherheit jetzt direkt Teil des
neuen Einstellungen-Screens ist, ein Klick weniger als im Prototyp.)

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/profil/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 3: Commit**

```bash
git add js/module/profil/index.js
git commit -m "feat: Profil-Screen nach Prototyp (Menue, Avatar-Kopf)"
```

---

### Task 6: Neues Einstellungen-Modul

**Files:**
- Create: `js/module/einstellungen/index.js`
- Create: `js/module/einstellungen/schriftgroesse.js`
- Create: `js/module/einstellungen/export.js`
- Modify: `js/app.js`

**Interfaces:**
- Konsumiert: `registrierePasskey` (`../../auth.js`, bereits
  vorhanden), `wechsleTheme`/`aufgeloestesTheme`-Äquivalent (siehe
  `js/theme.js` — prüfe die exakten Exportnamen vor dem Schreiben,
  falls sie von den unten angenommenen abweichen, an die echten Namen
  anpassen).
- Produziert: `js/module/einstellungen/index.js` registriert
  `id:'einstellungen'` — **nicht** in `NAV_MODULE`, nur per Hash
  erreichbar (wie `ernaehrung`/`todos`/`sendungen`).

- [ ] **Schritt 1: `js/theme.js` lesen, exakte Exportnamen prüfen**

Vor dem Schreiben von `einstellungen/index.js`: `js/theme.js` öffnen
und die exakten Funktionsnamen für "aktuelles Theme lesen" und "Theme
umschalten" notieren (im restlichen Code als `wendeThemeAn`/
`wechsleTheme`/`aufgeloestesTheme` referenziert, siehe `js/app.js`
Zeile 6 und 124) — diese Namen im folgenden Code exakt verwenden.

- [ ] **Schritt 2: `schriftgroesse.js` anlegen**

```js
const SCHLUESSEL = 'schriftgroesse';
const STUFEN = ['klein', 'normal', 'gross'];

export function aktuelleSchriftgroesse() {
  try {
    const gespeichert = localStorage.getItem(SCHLUESSEL);
    return STUFEN.includes(gespeichert) ? gespeichert : 'normal';
  } catch { return 'normal'; }
}

export function setzeSchriftgroesse(stufe) {
  if (!STUFEN.includes(stufe)) return;
  document.documentElement.setAttribute('data-schriftgroesse', stufe);
  try { localStorage.setItem(SCHLUESSEL, stufe); } catch { /* Storage evtl. blockiert, kein kritischer Zustand */ }
}

export function wendeSchriftgroesseAn() {
  setzeSchriftgroesse(aktuelleSchriftgroesse());
}
```

- [ ] **Schritt 3: CSS-Skalierung ergänzen**

In `app.css`, direkt nach dem `body {...}`-Block (Zeile ~38-41)
einfügen:

```css
:root[data-schriftgroesse="klein"] body { font-size: 14px; }
:root[data-schriftgroesse="gross"] body { font-size: 18px; }
```

- [ ] **Schritt 4: `export.js` anlegen**

```js
import { ladeAlles as ladeErnaehrung } from '../ernaehrung/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeBerichtsheft } from '../berichtsheft/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';

export async function sammleAlleDaten() {
  const [ernaehrung, todos, finanzen, berichtsheft, sendungen] = await Promise.all([
    ladeErnaehrung(), ladeTodos(), ladeFinanzen(), ladeBerichtsheft(), ladeSendungen(),
  ]);
  return { ernaehrung, todos, finanzen, berichtsheft, sendungen, exportiert_am: new Date().toISOString() };
}

export function ladeAlsDatei(daten) {
  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mein-dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

(Prüfe vor dem Schreiben, ob `js/module/ernaehrung/daten.js` seine
Ladefunktion tatsächlich `ladeAlles` nennt — falls nicht, den echten
Namen hier einsetzen.)

- [ ] **Schritt 5: `index.js` anlegen**

```js
import { registriere } from '../../registry.js';
import { registrierePasskey } from '../../auth.js';
import { aktuelleSchriftgroesse, setzeSchriftgroesse } from './schriftgroesse.js';
import { sammleAlleDaten, ladeAlsDatei } from './export.js';

function baueAbschnitt(titel) {
  const h = document.createElement('div');
  h.className = 'settings-label';
  h.textContent = titel;
  return h;
}

export function zeigeEinstellungen(container) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="ein-zurueck" type="button">‹ Profil</button>
      <h2>Einstellungen</h2>
    </div>`;
  container.querySelector('#ein-zurueck').addEventListener('click', () => { location.hash = '#/profil'; });

  container.appendChild(baueAbschnitt('Darstellung'));
  const darstellung = document.createElement('div');
  darstellung.className = 'punkt-liste';
  darstellung.innerHTML = `
    <div class="settings-row"><span class="row-title">Schriftgröße</span>
      <select id="ein-schriftgroesse">
        <option value="klein">Klein</option>
        <option value="normal">Normal</option>
        <option value="gross">Groß</option>
      </select></div>
    <div class="settings-row"><span class="row-title">Push-Benachrichtigungen</span>
      <div class="switch on" data-deko-switch></div></div>
    <div class="settings-row"><span class="row-title">E-Mail-Benachrichtigungen</span>
      <div class="switch" data-deko-switch></div></div>`;
  container.appendChild(darstellung);
  const auswahl = darstellung.querySelector('#ein-schriftgroesse');
  auswahl.value = aktuelleSchriftgroesse();
  auswahl.addEventListener('change', () => setzeSchriftgroesse(auswahl.value));
  darstellung.querySelectorAll('[data-deko-switch]').forEach((sw) => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });

  container.appendChild(baueAbschnitt('Verbundene Dienste'));
  const dienste = document.createElement('div');
  dienste.className = 'punkt-liste';
  dienste.innerHTML = `
    <div class="settings-row"><span class="row-title">Bankkonto</span><span class="row-sub">nicht verbunden</span></div>
    <div class="settings-row"><span class="row-title">Google Drive</span><span class="row-sub">nicht verbunden</span></div>`;
  container.appendChild(dienste);

  container.appendChild(baueAbschnitt('Sicherheit'));
  const sicherheit = document.createElement('div');
  sicherheit.className = 'punkt-liste';
  sicherheit.innerHTML = `
    <div class="settings-row"><span class="row-title">Passkey</span>
      <button id="ein-passkey" class="knopf-neutral" style="width:auto;">Einrichten</button></div>`;
  container.appendChild(sicherheit);
  container.querySelector('#ein-passkey').addEventListener('click', async (e) => {
    const knopf = e.currentTarget;
    knopf.disabled = true;
    knopf.textContent = 'Wird eingerichtet …';
    const { ok, fehler } = await registrierePasskey();
    knopf.textContent = ok ? 'Eingerichtet' : 'Einrichten';
    knopf.disabled = ok;
    if (!ok) alert(`Fehler: ${fehler}`);
  });

  container.appendChild(baueAbschnitt('App'));
  const app = document.createElement('div');
  app.className = 'punkt-liste';
  app.innerHTML = `
    <div class="settings-row"><span class="row-title">Alle Daten exportieren</span>
      <button id="ein-export" class="knopf-neutral" style="width:auto;">Herunterladen</button></div>
    <div class="settings-row"><span class="row-title">Version</span><span class="row-sub">1.0.0</span></div>`;
  container.appendChild(app);
  container.querySelector('#ein-export').addEventListener('click', async (e) => {
    const knopf = e.currentTarget;
    knopf.disabled = true;
    knopf.textContent = 'Sammle Daten …';
    try {
      const daten = await sammleAlleDaten();
      ladeAlsDatei(daten);
    } catch (err) { alert(err.message); }
    knopf.disabled = false;
    knopf.textContent = 'Herunterladen';
  });
}

registriere({
  id: 'einstellungen',
  titel: 'Einstellungen',
  async init(container) {
    zeigeEinstellungen(container);
  },
});
```

- [ ] **Schritt 6: `js/app.js` — Modul importieren**

Die bestehende Import-Liste

```js
import './module/ernaehrung/index.js';
import './module/todos/index.js';
import './module/finanzen/index.js';
import './module/berichtsheft/index.js';
import './module/sendungen/index.js';
import './module/home/index.js';
import './module/suche/index.js';
import './module/profil/index.js';
```

ersetzen durch:

```js
import './module/ernaehrung/index.js';
import './module/todos/index.js';
import './module/finanzen/index.js';
import './module/berichtsheft/index.js';
import './module/sendungen/index.js';
import './module/home/index.js';
import './module/suche/index.js';
import './module/profil/index.js';
import './module/einstellungen/index.js';
```

`NAV_MODULE` bleibt unverändert (kein neuer Bottom-Nav-Punkt).

- [ ] **Schritt 7: Statische Prüfung**

Run: `node --check js/module/einstellungen/index.js && node --check js/module/einstellungen/schriftgroesse.js && node --check js/module/einstellungen/export.js && node --check js/app.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 8: Commit**

```bash
git add js/module/einstellungen/ js/app.js app.css
git commit -m "feat: neues Einstellungen-Modul (Schriftgroesse, Passkey, Datenexport)"
```

---

### Task 7: Suche nach Prototyp

**Files:**
- Modify: `js/module/suche/index.js`
- Modify: `js/module/suche/berechnung.js`

**Interfaces:**
- Konsumiert: `sucheAlles` (angepasst).
- Keine neuen Exporte über die Datei-Grenze hinaus.

- [ ] **Schritt 1: `berechnung.js` — `ziel` zeigt auf Detailrouten**

Die bestehende Funktion `sucheAlles` komplett ersetzen durch:

```js
function treffer(text, suchtext) {
  return String(text ?? '').toLowerCase().includes(suchtext);
}

export function sucheAlles(zustand, suchtextRoh) {
  const suchtext = suchtextRoh.trim().toLowerCase();
  if (!suchtext) return [];

  const ergebnisse = [];

  for (const e of zustand.expenses) {
    if (treffer(e.notiz, suchtext)) {
      ergebnisse.push({ typ: 'expense', titel: e.notiz, info: `${e.betrag.toFixed(2)} €`, ziel: '#/finanzen/ausgaben' });
    }
  }
  for (const t of zustand.todosOffen) {
    if (treffer(t.text, suchtext)) {
      ergebnisse.push({ typ: 'todo', titel: t.text, info: '', ziel: `#/todos/offen/${t.id}` });
    }
  }
  for (const t of zustand.todosErledigt) {
    if (treffer(t.text, suchtext)) {
      ergebnisse.push({ typ: 'todo', titel: t.text, info: '', ziel: `#/todos/erledigt/${t.id}` });
    }
  }
  for (const s of zustand.sendungen) {
    if (treffer(s.haendler, suchtext) || treffer(s.beschreibung, suchtext)) {
      ergebnisse.push({ typ: 'sendung', titel: s.haendler, info: s.beschreibung ?? '', ziel: `#/sendungen/pakete/${s.id}` });
    }
  }
  for (const t of zustand.termine) {
    if (treffer(t.titel, suchtext)) {
      ergebnisse.push({ typ: 'termin', titel: t.titel, info: '', ziel: `#/sendungen/termine/${t.id}` });
    }
  }
  return ergebnisse;
}
```

- [ ] **Schritt 2: Bestehenden Test anpassen**

`test/suche-berechnung.test.js` lesen — die Assertions, die bisher
`ziel: '#/todos'`/`ziel: '#/sendungen/pakete'`/`ziel: '#/sendungen/termine'`
ohne ID erwarten, auf die neuen ID-tragenden Routen anpassen (exakte
IDs aus den Test-Fixtures der Datei übernehmen, die dort für
`zustand.todosOffen`/`zustand.sendungen`/`zustand.termine` definiert
sind).

- [ ] **Schritt 3: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 4: `index.js` nach Prototyp umbauen**

Die bestehende komplette Datei

```js
import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { sucheAlles } from './berechnung.js';

const SUCHE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

registriere({
  id: 'suche',
  titel: 'Suche',
  icon: SUCHE_ICON,
  async init(container) {
    await ladeZustand();
    container.innerHTML = `
      <header class="modul-kopf"><h2>Suche</h2></header>
      <div class="searchbar" style="margin:16px 0;">
        ${SUCHE_ICON}
        <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …">
      </div>
      <div id="suche-treffer" class="punkt-liste"></div>`;
    const eingabe = container.querySelector('#suche-eingabe');
    const trefferListe = container.querySelector('#suche-treffer');
    eingabe.addEventListener('input', () => {
      trefferListe.innerHTML = '';
      for (const t of sucheAlles(zustand, eingabe.value)) {
        const zeile = document.createElement('div');
        zeile.className = 'punkt-zeile';
        zeile.style.cursor = 'pointer';
        zeile.innerHTML = `<div class="punkt-info"><strong>${esc(t.titel)}</strong><small>${esc(t.info)}</small></div>`;
        zeile.addEventListener('click', () => { location.hash = t.ziel; });
        trefferListe.appendChild(zeile);
      }
    });
  },
});
```

komplett ersetzen durch:

```js
import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { sucheAlles } from './berechnung.js';

const SUCHE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
const CASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
const RECEIPT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>';
const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';
const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const TYP_ICON = { expense: RECEIPT_ICON, todo: TODO_ICON, sendung: BOX_ICON, termin: KALENDER_ICON };

const SCHNELLEINSTIEGE = [
  { label: 'Kontostand', icon: CASH_ICON, ziel: '#/finanzen' },
  { label: 'Rechnungen', icon: RECEIPT_ICON, ziel: null },
  { label: 'Sendungen', icon: BOX_ICON, ziel: '#/sendungen' },
  { label: 'Berichtsheft', icon: DOC_ICON, ziel: '#/berichtsheft' },
  { label: 'Dokumente', icon: FOLDER_ICON, ziel: null },
];

const LETZTE_SUCHEN_SCHLUESSEL = 'letzteSuchen';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function ladeLetzteSuchen() {
  try {
    const roh = localStorage.getItem(LETZTE_SUCHEN_SCHLUESSEL);
    return roh ? JSON.parse(roh) : [];
  } catch { return []; }
}

function speichereLetzteSuche(text) {
  if (!text.trim()) return;
  try {
    const bisherige = ladeLetzteSuchen().filter((s) => s !== text);
    const neu = [text, ...bisherige].slice(0, 5);
    localStorage.setItem(LETZTE_SUCHEN_SCHLUESSEL, JSON.stringify(neu));
  } catch { /* Storage evtl. blockiert, kein kritischer Zustand */ }
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

registriere({
  id: 'suche',
  titel: 'Suche',
  icon: SUCHE_ICON,
  async init(container) {
    await ladeZustand();
    container.innerHTML = `
      <header class="modul-kopf"><h2>Suche</h2></header>
      <div class="searchbar" style="margin:16px 0;">
        ${SUCHE_ICON}
        <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …">
      </div>
      <div id="suche-treffer" class="punkt-liste" hidden></div>
      <div id="suche-standard">
        <div class="section-head"><h2>Schnelleinstiege</h2></div>
        <div class="punkt-liste" id="suche-schnell"></div>
        <div class="section-head"><h2>Letzte Suchen</h2></div>
        <div class="punkt-liste" id="suche-letzte">
          ${ladeLetzteSuchen().length === 0 ? '<p class="lade">Noch keine Suchen.</p>' : ''}
        </div>
      </div>`;

    const schnellBox = container.querySelector('#suche-schnell');
    SCHNELLEINSTIEGE.forEach((item) => {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="icon-badge">${item.icon}</div>
        <div class="punkt-info"><strong>${esc(item.label)}</strong></div>
        <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
      zeile.addEventListener('click', () => {
        if (item.ziel) location.hash = item.ziel;
        else alert('Noch nicht verfügbar.');
      });
      schnellBox.appendChild(zeile);
    });

    const letzteBox = container.querySelector('#suche-letzte');
    ladeLetzteSuchen().forEach((text) => {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="icon-badge">${SUCHE_ICON}</div><div class="punkt-info"><strong>${esc(text)}</strong></div>`;
      zeile.addEventListener('click', () => { eingabe.value = text; eingabe.dispatchEvent(new Event('input')); });
      letzteBox.appendChild(zeile);
    });

    const eingabe = container.querySelector('#suche-eingabe');
    const trefferListe = container.querySelector('#suche-treffer');
    const standardBox = container.querySelector('#suche-standard');
    let letzteSucheGespeichert = '';

    eingabe.addEventListener('input', () => {
      const wert = eingabe.value;
      if (!wert.trim()) {
        trefferListe.hidden = true;
        standardBox.hidden = false;
        return;
      }
      standardBox.hidden = true;
      trefferListe.hidden = false;
      const treffer = sucheAlles(zustand, wert);
      trefferListe.innerHTML = treffer.length === 0
        ? '<p class="lade">Keine Treffer.</p>'
        : treffer.map((t) => `
          <div class="punkt-zeile" data-ziel="${esc(t.ziel)}" style="cursor:pointer;">
            <div class="icon-badge">${TYP_ICON[t.typ] || SUCHE_ICON}</div>
            <div class="punkt-info"><strong>${esc(t.titel)}</strong><small>${esc(t.info)}</small></div>
            <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>
          </div>`).join('');
      trefferListe.querySelectorAll('[data-ziel]').forEach((zeile) => {
        zeile.addEventListener('click', () => { location.hash = zeile.dataset.ziel; });
      });
      if (wert !== letzteSucheGespeichert) {
        letzteSucheGespeichert = wert;
        speichereLetzteSuche(wert);
      }
    });
  },
});
```

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/suche/index.js && node --check js/module/suche/berechnung.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/suche/index.js js/module/suche/berechnung.js test/suche-berechnung.test.js
git commit -m "feat: Suche nach Prototyp (Schnelleinstiege, Letzte Suchen, Detail-Routen)"
```

---

### Task 8: Ausbildung — Übersicht-Tab mit Fortschritts-Ring

**Files:**
- Create: `js/module/berichtsheft/uebersicht.js`
- Modify: `js/module/berichtsheft/index.js`
- Modify: `js/module/berichtsheft/daten.js`

**Interfaces:**
- Konsumiert: `ausbildungsFortschritt` (Task 1, `./berechnung.js`),
  `sortiereTermine` (`../sendungen/berechnung.js`),
  `sortiereOffeneTodos` (`../todos/planung.js`).
- Produziert: `zeigeUebersicht(container, zustand, aktualisieren):
  Promise<void>` — wird von Task 8 selbst in `index.js` verdrahtet.

- [ ] **Schritt 1: `daten.js` lädt Sendungen/Termine/Todos zusätzlich**

Die bestehende Funktion `ladeAlles`

```js
export async function ladeAlles() {
  const [eintraege, settings] = await Promise.all([
    supabase.from('berichtsheft_eintraege').select('*').order('datum', { ascending: false }),
    supabase.from('berichtsheft_settings').select('key,value'),
  ]);
  if (eintraege.error) throw fehler('Einträge laden', eintraege.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { eintraege: eintraege.data, settings: settingsObj };
}
```

ersetzen durch:

```js
export async function ladeAlles() {
  const [eintraege, settings, termine, todosOffen] = await Promise.all([
    supabase.from('berichtsheft_eintraege').select('*').order('datum', { ascending: false }),
    supabase.from('berichtsheft_settings').select('key,value'),
    supabase.from('termine').select('*'),
    supabase.from('todos').select('*').eq('erledigt', false).order('erstellt_am'),
  ]);
  if (eintraege.error) throw fehler('Einträge laden', eintraege.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  if (termine.error) throw fehler('Termine laden', termine.error);
  if (todosOffen.error) throw fehler('Todos laden', todosOffen.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { eintraege: eintraege.data, settings: settingsObj, termine: termine.data, todosOffen: todosOffen.data };
}
```

(Import am Dateianfang bleibt unverändert, `supabase` ist schon
importiert.)

- [ ] **Schritt 2: `uebersicht.js` anlegen**

```js
import { ausbildungsFortschritt } from './berechnung.js';
import { sortiereTermine } from '../sendungen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeUebersicht(container, zustand) {
  const heuteStr = heute();
  const beginn = zustand.settings.ausbildungsbeginn;
  const dauer = zustand.settings.ausbildungsdauer_jahre;
  const gesetzt = beginn != null && dauer != null;
  const fortschritt = gesetzt ? ausbildungsFortschritt(beginn, dauer, heuteStr) : null;

  const termineHtml = sortiereTermine(zustand.termine).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
    .join('');
  const aufgabenHtml = sortiereOffeneTodos(zustand.todosOffen, heuteStr).slice(0, 5)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
    .join('');

  container.innerHTML = `
    <div class="punkt-liste" style="padding:18px;text-align:center;">
      ${gesetzt ? `
        <div class="fortschritt-ring" style="--prozent:${fortschritt.prozent};">
          <span>${fortschritt.prozent}%</span>
          <small>Jahr ${fortschritt.jahr}</small>
        </div>
        <p style="margin:0;color:var(--gedaempft);">Ausbildungsjahr ${fortschritt.jahr} von ${dauer}</p>
      ` : '<p class="lade">Ausbildungsbeginn noch nicht hinterlegt.</p>'}
    </div>
    <div class="section-head"><h2>Nächste Termine</h2></div>
    <div class="punkt-liste">${termineHtml || '<p class="lade">Keine Termine.</p>'}</div>
    <div class="section-head"><h2>Offene Aufgaben</h2></div>
    <div class="punkt-liste">${aufgabenHtml || '<p class="lade">Keine offenen Aufgaben.</p>'}</div>`;
}
```

- [ ] **Schritt 3: `index.js` — Tab ergänzen, Default wechseln**

Die bestehende Zeile

```js
const TABS = [['eintraege', 'Einträge'], ['drucken', 'Drucken']];
```

ersetzen durch:

```js
const TABS = [['uebersicht', 'Übersicht'], ['eintraege', 'Berichtsheft'], ['drucken', 'Drucken']];
```

Die bestehende Zeile

```js
const LADER = {
  eintraege: () => import('./eintraege.js').then((m) => m.zeigeEintraege),
  drucken: () => import('./drucken.js').then((m) => m.zeigeDrucken),
};
```

ersetzen durch:

```js
const LADER = {
  uebersicht: () => import('./uebersicht.js').then((m) => m.zeigeUebersicht),
  eintraege: () => import('./eintraege.js').then((m) => m.zeigeEintraege),
  drucken: () => import('./drucken.js').then((m) => m.zeigeDrucken),
};
```

Die bestehende Zeile

```js
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'eintraege';
```

ersetzen durch:

```js
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'uebersicht';
```

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/module/berichtsheft/uebersicht.js && node --check js/module/berichtsheft/index.js && node --check js/module/berichtsheft/daten.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/berichtsheft/uebersicht.js js/module/berichtsheft/index.js js/module/berichtsheft/daten.js
git commit -m "feat: Ausbildungsfortschritt-Ring, neuer Uebersicht-Tab"
```

---

### Task 9: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum des Implementierungstags), Was/Entscheidungen/
Stand-danach-Muster. Inhalt: Router-Erweiterung, Sendungen/Termine/
Todos-Detailansichten, Profil/Suche/Ausbildung nach Prototyp, neues
Einstellungen-Modul. **Wichtig laut Doku-Rigor-Regel:** auch den
Vorfall aus der Planungsphase dieser Sub-Etappe festhalten — mehrere
parallele Forks haben sich beim Brainstorming der Folge-Sub-Etappen
(D/N/O/P/Q) zwischenzeitlich mit der Koordinator-Rolle verwechselt und
sich gegenseitig überschrieben (Details bereits in der Session
dokumentiert, hier kurz zusammenfassen als Lehre: bei parallelen
Sub-Agenten künftig nur noch für klar unabhängige, kurze Aufgaben
nutzen, nicht mehr als 3-4 gleichzeitig, Ergebnisse sofort nach
Fertigstellung prüfen statt zu sammeln).

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand" aktualisieren: Sub-Etappe E+F als fertig
markieren. Backlog-Reihenfolge aktualisieren (siehe Koordinator-Notiz
zur Neusortierung: nach E+F kommt B, dann der Rest von C, dann D, dann
M, dann N/O/I/P, dann Q, dann H, dann G/J/K+L). Abschnitt "Nav" um den
neuen (nicht sichtbaren) Einstellungen-Screen ergänzen. `npm
test`-Ausgabe tatsächlich ausführen, echte Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe E+F (Design-Angleichung, Einstellungen, Detail-Klicks) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Alle 9 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Sendungen, Termine, To-dos anklickbar mit funktionierender
      Detailansicht (inkl. Zurück-Navigation).
- [ ] Profil, Suche (Schnelleinstiege + Letzte Suchen), Ausbildung
      (Fortschritts-Ring) sehen wie im Prototyp aus.
- [ ] Neuer Einstellungen-Screen erreichbar über Profil, Schriftgröße +
      Passkey + Datenexport funktionieren echt.
- [ ] Suchtreffer führen direkt zur jeweiligen Detailseite.
- [ ] Keine Regression: bestehende Status-/Lösch-/Abhak-Buttons in den
      Listen funktionieren weiterhin trotz neuer Zeilen-Klickbarkeit.
- [ ] `docs/PROJEKT-LOG.md` (inkl. Fork-Vorfall) + `CLAUDE.md`
      aktualisiert, gepusht.
