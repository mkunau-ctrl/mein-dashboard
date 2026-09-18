# Etappe 8 (v2) Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Neue Bottom-Navigation nach Marks Prototyp (Home/Finanzen/Ausbildung/
Suche/Profil) statt einem Icon pro Fachmodul; Lager geht in Finanzen auf;
drei neue Screens (Home, Suche, Profil) kommen dazu; Ernährung verschwindet
nur aus der Navigation.

**Architecture:** Home/Suche/Profil werden als ganz normale Module über
`registriere()` registriert (gleiche Schnittstelle wie alle bestehenden
Module), lesen aber teils Daten aus mehreren bestehenden `daten.js`-Dateien
statt einer eigenen Tabelle. `js/app.js` erzeugt die Bottom-Nav nicht mehr
aus **allen** registrierten Modulen, sondern aus einer festen Liste von
5 Modul-IDs. Lager wird als eigenes Modul entfernt, seine Daten-/
Berechnungs-Logik wandert unverändert in die Finanzen-Dateien, seine beiden
Tab-Dateien werden zu weiteren Finanzen-Tabs.

**Tech Stack:** Kein Framework, kein Build (bestehende Konvention). ESM,
`node:test` für reine Logik, Supabase-JS per CDN (bestehend).

**Spec:** `docs/superpowers/specs/2026-09-18-etappe-8-redesign-v2-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt (`index.html`, `js/`).
- ESM überall.
- Reine Logik in eigenen Dateien mit `node:test`-Tests; Supabase-Zugriff
  gebündelt in `daten.js` je Modul (siehe `js/module/README.md`).
- Sprache: Doku, Commit-Nachrichten und UI-Texte auf Deutsch.
- Keine erfundenen Daten: keine "Einnahmen"-Einträge, keine
  Prozent-Fortschrittsbalken ohne echte Datenbasis.
- Theme bleibt `prefers-color-scheme`-gesteuert (kein erzwungenes Dunkel).
- `USER_ID` für Server-Schreibzugriffe (falls per MCP nötig):
  `df0b24a6-6a74-4830-995c-84015161dcc3`.
- Modul-Schnittstelle (`js/module/README.md`): `id`, `titel`, `icon`
  (optional, Inline-SVG), `init(containerEl)`. Tab-Ansichten exportieren
  `zeige<Tab>(container, zustand, aktualisieren)`.

---

### Task 1: Finanzen – Lager-Daten und -Berechnung übernehmen

**Files:**
- Modify: `js/module/finanzen/daten.js`
- Modify: `js/module/finanzen/berechnung.js`
- Modify: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert (neu in `finanzen/daten.js`): `speicherTeil(teil)`,
  `entferneTeil(id)`, `setzeStatus(id, status)` – 1:1 aus
  `lager/daten.js` übernommen, gleiche Signaturen.
- Produziert (neu in `finanzen/berechnung.js`): `warenwert(teile)`,
  `sortiereTeile(teile)`, `merkliste(teile)`, `naechsterStatus(status)` –
  1:1 aus `lager/berechnung.js` übernommen; `unechterKontostand(settings,
  expenses, teile, heute): number`.
- `ladeAlles()` liefert ab jetzt zusätzlich `{ ..., teile }`.
- Wird von Task 2 (`finanzen/index.js`, `teile.js`, `bestellen.js`,
  `kontostand.js`) konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

Die bestehende Importzeile ganz oben in `test/finanzen-berechnung.test.js`

```js
import { kontostand, summeProMonat, summenProKategorie, erkenneAbos }
  from '../js/module/finanzen/berechnung.js';
```

um die vier Lager-Funktionen und `unechterKontostand` erweitern (eine
einzige Importzeile):

```js
import { kontostand, summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus, unechterKontostand }
  from '../js/module/finanzen/berechnung.js';
```

Danach ans Ende der Datei anhängen (Tests 1:1 aus
`test/lager-berechnung.test.js` übernommen, plus ein neuer Test für
`unechterKontostand`):

```js
const teile = [
  { bezeichnung: 'Display iPhone 15', bestand: 2, einzelwert: 60, status: 'da' },
  { bezeichnung: 'Akku iPhone 13', bestand: 0, einzelwert: 25, status: 'fehlt' },
  { bezeichnung: 'Rückglas iPhone 14', bestand: 1, einzelwert: 15, status: 'bestellt' },
  { bezeichnung: 'Schraubenset', bestand: 5, status: 'da' }, // kein einzelwert
];

test('warenwert: Summe bestand mal einzelwert, fehlender Wert zaehlt als 0', () => {
  assert.equal(warenwert(teile), 2 * 60 + 0 * 25 + 1 * 15 + 5 * 0);
});

test('sortiereTeile: fehlt vor bestellt vor da, sonst alphabetisch', () => {
  const namen = sortiereTeile(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, [
    'Akku iPhone 13', 'Rückglas iPhone 14', 'Display iPhone 15', 'Schraubenset',
  ]);
});

test('merkliste: nur status != da', () => {
  const namen = merkliste(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, ['Akku iPhone 13', 'Rückglas iPhone 14']);
});

test('naechsterStatus: zyklisch fehlt -> bestellt -> da -> fehlt', () => {
  assert.equal(naechsterStatus('fehlt'), 'bestellt');
  assert.equal(naechsterStatus('bestellt'), 'da');
  assert.equal(naechsterStatus('da'), 'fehlt');
});

test('unechterKontostand: echter Kontostand plus Warenwert', () => {
  const settings = { kontostand_start: 500, stand_datum: '2026-09-01' };
  const expenses = [{ betrag: 20, kategorie: 'tanken', datum: '2026-09-05' }];
  // echter Kontostand: 500 - 20 = 480; Warenwert der 4 Testteile: 2*60+0*25+1*15+5*0 = 135
  assert.equal(unechterKontostand(settings, expenses, teile, '2026-09-16'), 480 + 135);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – die vier Lager-Funktionen und `unechterKontostand` sind
in `finanzen/berechnung.js` noch nicht exportiert.

- [ ] **Schritt 3: `finanzen/berechnung.js` erweitern**

An `js/module/finanzen/berechnung.js` anhängen (Lager-Funktionen 1:1 aus
`js/module/lager/berechnung.js` übernommen, unverändert):

```js
const STATUS_PRIORITAET = { fehlt: 0, bestellt: 1, da: 2 };
const STATUS_ZYKLUS = { fehlt: 'bestellt', bestellt: 'da', da: 'fehlt' };

export function warenwert(teile) {
  return teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
}

export function sortiereTeile(teile) {
  return [...teile].sort((a, b) => {
    const p = STATUS_PRIORITAET[a.status] - STATUS_PRIORITAET[b.status];
    if (p !== 0) return p;
    return a.bezeichnung.localeCompare(b.bezeichnung, 'de');
  });
}

export function merkliste(teile) {
  return sortiereTeile(teile).filter((t) => t.status !== 'da');
}

export function naechsterStatus(status) {
  return STATUS_ZYKLUS[status];
}

export function unechterKontostand(settings, expenses, teile, heute) {
  return kontostand(settings, expenses, heute) + warenwert(teile);
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `finanzen/daten.js` erweitern**

In `js/module/finanzen/daten.js`: `ladeAlles()` ersetzen durch (lädt
zusätzlich `parts` parallel zu `expenses`/`settings`):

```js
export async function ladeAlles() {
  const [expenses, settings, teile] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
  ]);
  if (expenses.error) throw fehler('Ausgaben laden', expenses.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  if (teile.error) throw fehler('Teile laden', teile.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { expenses: expenses.data, settings: settingsObj, teile: teile.data };
}
```

Danach ans Ende der Datei anhängen (1:1 aus `js/module/lager/daten.js`
übernommen, unverändert):

```js
export async function speicherTeil(teil) {
  const felder = {
    bezeichnung: teil.bezeichnung, bestand: teil.bestand ?? 0,
    soll_bestand: teil.soll_bestand ?? null, status: teil.status ?? 'da',
    einzelwert: teil.einzelwert ?? null,
  };
  const abfrage = teil.id
    ? supabase.from('parts').update(felder).eq('id', teil.id).select().single()
    : supabase.from('parts').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Teil speichern', error);
  return data;
}

export async function entferneTeil(id) {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) throw fehler('Teil entfernen', error);
}

export async function setzeStatus(id, status) {
  const { error } = await supabase.from('parts').update({ status }).eq('id', id);
  if (error) throw fehler('Status ändern', error);
}
```

- [ ] **Schritt 6: Test laufen lassen, weiterhin grün**

Run: `npm test`
Expected: weiterhin alle Tests PASS (Schritt 5 hat keine reine Logik
geändert, nur Supabase-Zugriff – kein Test dafür nötig, siehe
`js/module/README.md`).

- [ ] **Schritt 7: Commit**

```bash
git add js/module/finanzen/daten.js js/module/finanzen/berechnung.js test/finanzen-berechnung.test.js
git commit -m "feat: Finanzen uebernimmt Lager-Daten/-Berechnung + unechterKontostand"
```

---

### Task 2: Finanzen-UI erweitern, Lager-Modul entfernen

**Files:**
- Create: `js/module/finanzen/teile.js`
- Create: `js/module/finanzen/bestellen.js`
- Modify: `js/module/finanzen/index.js`
- Modify: `js/module/finanzen/kontostand.js`
- Modify: `js/app.js`
- Delete: `js/module/lager/` (gesamter Ordner: `daten.js`, `berechnung.js`,
  `index.js`, `teile.js`, `bestellen.js`)
- Delete: `test/lager-berechnung.test.js`

**Interfaces:**
- Konsumiert: `speicherTeil`, `entferneTeil`, `setzeStatus` (Task 1,
  `finanzen/daten.js`); `warenwert`, `sortiereTeile`, `merkliste`,
  `naechsterStatus`, `unechterKontostand`, `kontostand`, `summeProMonat`
  (Task 1, `finanzen/berechnung.js`).

- [ ] **Schritt 1: `teile.js` anlegen**

`js/module/finanzen/teile.js` – 1:1 aus `js/module/lager/teile.js`
übernommen (Importe zeigen weiterhin auf `./daten.js`/`./berechnung.js`,
jetzt aber die Finanzen-eigenen Dateien aus Task 1):

```js
import { speicherTeil, entferneTeil, setzeStatus } from './daten.js';
import { warenwert, sortiereTeile, naechsterStatus } from './berechnung.js';

const STATUS_TEXT = { fehlt: 'fehlt', bestellt: 'bestellt', da: 'da' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTeile(container, zustand, aktualisieren) {
  const wert = document.createElement('div');
  wert.className = 'stat-karte gross';
  wert.innerHTML = `
    <div class="stat-kopf">
      <div class="icon-badge">${BOX_ICON}</div>
      <small>Warenwert</small>
    </div>
    <span>${warenwert(zustand.teile).toFixed(2)} €</span>`;
  container.appendChild(wert);

  const neu = document.createElement('button');
  neu.textContent = '+ Neues Teil';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular(null));
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTeile(zustand.teile)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.bezeichnung)}</strong>
        <small>Bestand ${t.bestand}${t.soll_bestand != null ? ` / Soll ${t.soll_bestand}` : ''}
          ${t.einzelwert != null ? ` · ${t.einzelwert.toFixed(2)} € /Stk` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${t.status}">${STATUS_TEXT[t.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="bearbeiten">✎</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(t.id, naechsterStatus(t.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=bearbeiten]')
      .addEventListener('click', () => oeffneFormular(t));
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${t.bezeichnung}" entfernen?`)) return;
      try { await entferneTeil(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular(t) {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>${t ? 'Teil bearbeiten' : 'Neues Teil'}</h3>
        <label>Bezeichnung <input name="bezeichnung" required value="${esc(t?.bezeichnung ?? '')}"></label>
        <label>Bestand <input name="bestand" type="number" step="1" value="${t?.bestand ?? 0}"></label>
        <label>Soll-Bestand (optional) <input name="soll_bestand" type="number" step="1"
          value="${t?.soll_bestand ?? ''}"></label>
        <label>Einzelwert € (optional) <input name="einzelwert" type="number" step="0.01"
          value="${t?.einzelwert ?? ''}"></label>
        <label>Status
          <select name="status">
            <option value="fehlt" ${(!t || t.status === 'fehlt') ? 'selected' : ''}>fehlt</option>
            <option value="bestellt" ${t?.status === 'bestellt' ? 'selected' : ''}>bestellt</option>
            <option value="da" ${t?.status === 'da' ? 'selected' : ''}>da</option>
          </select>
        </label>
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
      if (!form.bezeichnung.value.trim()) { form.bezeichnung.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await speicherTeil({
          id: t?.id,
          bezeichnung: form.bezeichnung.value.trim(),
          bestand: +form.bestand.value,
          soll_bestand: form.soll_bestand.value ? +form.soll_bestand.value : null,
          einzelwert: form.einzelwert.value ? +form.einzelwert.value : null,
          status: form.status.value,
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

- [ ] **Schritt 2: `bestellen.js` anlegen**

`js/module/finanzen/bestellen.js` – 1:1 aus
`js/module/lager/bestellen.js` übernommen:

```js
import { setzeStatus } from './daten.js';
import { merkliste, naechsterStatus } from './berechnung.js';

const STATUS_TEXT = { fehlt: 'fehlt', bestellt: 'bestellt', da: 'da' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeBestellen(container, zustand, aktualisieren) {
  const liste = merkliste(zustand.teile);

  if (liste.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Nichts zu bestellen – alles da.';
    container.appendChild(p);
    return;
  }

  const box = document.createElement('div');
  box.className = 'punkt-liste';
  container.appendChild(box);

  for (const t of liste) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.bezeichnung)}</strong>
        <small>${t.soll_bestand != null ? `Bestand ${t.bestand} / Soll ${t.soll_bestand}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${t.status}">${STATUS_TEXT[t.status]} →</button>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(t.id, naechsterStatus(t.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    box.appendChild(zeile);
  }
}
```

- [ ] **Schritt 3: `finanzen/index.js` – Tabs erweitern**

`TABS`-Zeile ersetzen durch:

```js
const TABS = [['ausgaben', 'Ausgaben'], ['kontostand', 'Kontostand'], ['monat', 'Monat'],
  ['abos', 'Abos'], ['teile', 'Teile'], ['bestellen', 'Bestellen']];
```

`LADER`-Objekt ersetzen durch:

```js
const LADER = {
  ausgaben: () => import('./ausgaben.js').then((m) => m.zeigeAusgaben),
  kontostand: () => import('./kontostand.js').then((m) => m.zeigeKontostand),
  monat: () => import('./monat.js').then((m) => m.zeigeMonat),
  abos: () => import('./abos.js').then((m) => m.zeigeAbos),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};
```

- [ ] **Schritt 4: `finanzen/kontostand.js` – unechten Kontostand anzeigen**

Import-Zeile ersetzen durch:

```js
import { kontostand, unechterKontostand, summeProMonat } from './berechnung.js';
```

Im `if (gesetzt)`-Zweig direkt nach der Zeile
`const ausgabenMonat = summeProMonat(...)` einfügen:

```js
    const unecht = unechterKontostand(zustand.settings, zustand.expenses, zustand.teile, heute());
```

Und den `box.innerHTML`-Template-String um eine Zeile ergänzen (nach der
`betrag-minus`-Zeile):

```js
      <span>${stand.toFixed(2)} €</span>
      <small class="betrag-minus">-${ausgabenMonat.toFixed(2)} € Ausgaben diesen Monat</small>
      <small>${unecht.toFixed(2)} € inkl. Warenwert (unechter Kontostand)</small>`;
```

(Die erste `<span>`/`<small class="betrag-minus">`-Zeile bleibt
unverändert, nur die neue `<small>`-Zeile wird davor eingefügt in den
bestehenden Template-String.)

- [ ] **Schritt 5: Lager-Modul und dessen Test entfernen**

```bash
git rm -r js/module/lager
git rm test/lager-berechnung.test.js
```

- [ ] **Schritt 6: `js/app.js` – Lager-Import entfernen**

Zeile `import './module/lager/index.js';` löschen.

- [ ] **Schritt 7: Test laufen lassen**

Run: `npm test`
Expected: alle Tests PASS (Lager-Tests sind jetzt Teil von
`finanzen-berechnung.test.js` aus Task 1, `lager-berechnung.test.js`
existiert nicht mehr).

- [ ] **Schritt 8: Manueller Testlauf**

Lokalen Server starten (`python -m http.server 8000`), einloggen,
Finanzen öffnen: Tabs Ausgaben/Kontostand/Monat/Abos/Teile/Bestellen alle
erreichbar. Kontostand zeigt jetzt zusätzlich den unechten Kontostand.
Teile anlegen/bearbeiten/entfernen funktioniert wie vorher im
Lager-Modul. Kachel-Raster/Nav zeigt keinen "Lager"-Eintrag mehr (das ist
zu diesem Zeitpunkt noch die alte, automodul-basierte Nav aus Task 6 –
Lager verschwindet trotzdem schon jetzt, weil es nicht mehr registriert
ist).

- [ ] **Schritt 9: Commit**

```bash
git add js/module/finanzen js/app.js
git commit -m "feat: Lager-UI in Finanzen verschoben, Lager-Modul entfernt"
```

---

### Task 3: Neues Modul "Suche"

**Files:**
- Create: `js/module/suche/berechnung.js`
- Create: `js/module/suche/daten.js`
- Create: `js/module/suche/index.js`
- Test: `test/suche-berechnung.test.js`

**Interfaces:**
- Konsumiert: `ladeAlles` aus `finanzen/daten.js`, `todos/daten.js`,
  `sendungen/daten.js` (jeweils bestehend, unverändert).
- Produziert: `sucheAlles(zustand, suchtext): { typ, titel, info, ziel }[]`
  mit `zustand = { expenses, todosOffen, todosErledigt, sendungen, termine }`.
  Wird von `js/module/suche/index.js` konsumiert.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/suche-berechnung.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sucheAlles } from '../js/module/suche/berechnung.js';

const zustand = {
  expenses: [{ id: 'e1', notiz: 'Netflix Abo', betrag: 15.99, datum: '2026-09-01' }],
  todosOffen: [{ id: 't1', text: 'Steuererklärung machen' }],
  todosErledigt: [{ id: 't2', text: 'Netflix kündigen' }],
  sendungen: [{ id: 's1', haendler: 'DHL', beschreibung: 'Netflix-Werbepaket' }],
  termine: [{ id: 'te1', titel: 'Zahnarzt-Termin' }],
};

test('sucheAlles: findet Treffer ueber alle vier Quellen, case-insensitiv', () => {
  const treffer = sucheAlles(zustand, 'netflix');
  assert.equal(treffer.length, 3);
  assert.deepEqual(treffer.map((t) => t.typ).sort(), ['expense', 'sendung', 'todo']);
});

test('sucheAlles: leerer Suchtext liefert keine Treffer', () => {
  assert.deepEqual(sucheAlles(zustand, ''), []);
  assert.deepEqual(sucheAlles(zustand, '   '), []);
});

test('sucheAlles: kein Treffer bei unbekanntem Begriff', () => {
  assert.deepEqual(sucheAlles(zustand, 'xyzabc'), []);
});

test('sucheAlles: Termine werden durchsucht und liefern eine Sprung-Route', () => {
  const treffer = sucheAlles(zustand, 'zahnarzt');
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].typ, 'termin');
  assert.equal(treffer[0].ziel, '#/sendungen/termine');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL – Modul `js/module/suche/berechnung.js` existiert nicht.

- [ ] **Schritt 3: `suche/berechnung.js` schreiben**

```js
// Reine Suchlogik. Kein Netz, keine DOM.

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
  for (const t of [...zustand.todosOffen, ...zustand.todosErledigt]) {
    if (treffer(t.text, suchtext)) {
      ergebnisse.push({ typ: 'todo', titel: t.text, info: '', ziel: '#/todos' });
    }
  }
  for (const s of zustand.sendungen) {
    if (treffer(s.haendler, suchtext) || treffer(s.beschreibung, suchtext)) {
      ergebnisse.push({ typ: 'sendung', titel: s.haendler, info: s.beschreibung ?? '', ziel: '#/sendungen/pakete' });
    }
  }
  for (const t of zustand.termine) {
    if (treffer(t.titel, suchtext)) {
      ergebnisse.push({ typ: 'termin', titel: t.titel, info: '', ziel: '#/sendungen/termine' });
    }
  }
  return ergebnisse;
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `suche/daten.js` schreiben**

```js
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(),
  ]);
  return {
    expenses: finanzen.expenses,
    todosOffen: todos.offen,
    todosErledigt: todos.erledigt,
    sendungen: sendungen.sendungen,
    termine: sendungen.termine,
  };
}
```

- [ ] **Schritt 6: `suche/index.js` schreiben**

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
    if (!zustand) await ladeZustand();
    container.innerHTML = `
      <header class="modul-kopf"><h2>Suche</h2></header>
      <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …" style="width:100%">
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

- [ ] **Schritt 7: Commit**

```bash
git add js/module/suche test/suche-berechnung.test.js
git commit -m "feat: neues Modul Suche (Volltextsuche ueber Ausgaben/To-dos/Sendungen/Termine)"
```

---

### Task 4: Neues Modul "Home"

**Files:**
- Create: `js/module/home/daten.js`
- Create: `js/module/home/index.js`

**Interfaces:**
- Konsumiert: `ladeAlles` (`finanzen/daten.js`, `todos/daten.js`,
  `sendungen/daten.js`); `kontostand`, `unechterKontostand`,
  `summeProMonat` (`finanzen/berechnung.js`); `sortiereOffeneTodos`
  (`todos/planung.js`); `sortiereSendungen`, `sortiereTermine`
  (`sendungen/berechnung.js`).
- Produziert: registriertes Modul `id: 'home'`.

Kein `berechnung.js` nötig – reine Zusammenstellung bestehender
Berechnungsfunktionen, keine neue Logik, daher kein eigener Test (siehe
`js/module/README.md`: reine Logik nur, wenn es welche gibt).

- [ ] **Schritt 1: `home/daten.js` schreiben**

```js
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(),
  ]);
  return { finanzen, todos, sendungen };
}
```

- [ ] **Schritt 2: `home/index.js` schreiben**

```js
import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { kontostand, unechterKontostand } from '../finanzen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';
import { sortiereSendungen, sortiereTermine } from '../sendungen/berechnung.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function abschnitt(titel, ziel, zeilenHtml) {
  return `
    <div class="section-head"><h2>${titel}</h2><a href="${ziel}" class="link-muted">Alle anzeigen</a></div>
    <div class="punkt-liste">${zeilenHtml || '<p class="lade">Nichts Offenes.</p>'}</div>`;
}

registriere({
  id: 'home',
  titel: 'Home',
  icon: HOME_ICON,
  async init(container) {
    if (!zustand) await ladeZustand();
    const { finanzen, todos, sendungen } = zustand;
    const gesetzt = finanzen.settings.kontostand_start !== undefined;
    const stand = gesetzt ? kontostand(finanzen.settings, finanzen.expenses, heute()) : null;
    const unecht = gesetzt ? unechterKontostand(finanzen.settings, finanzen.expenses, finanzen.teile, heute()) : null;

    const termineHtml = sortiereTermine(sendungen.termine).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
      .join('');
    const sendungenHtml = sortiereSendungen(sendungen.sendungen).filter((s) => s.status !== 'zugestellt').slice(0, 3)
      .map((s) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(s.haendler)}</strong><small>${s.status}</small></div></div>`)
      .join('');
    const todosHtml = sortiereOffeneTodos(todos.offen, heute()).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
      .join('');

    container.innerHTML = `
      <header class="modul-kopf"><h2>Home</h2></header>
      <div class="stat-karte gross">
        <small>Kontostand</small>
        <span>${gesetzt ? stand.toFixed(2) + ' €' : '–'}</span>
        ${gesetzt ? `<small>${unecht.toFixed(2)} € inkl. Warenwert</small>` : ''}
      </div>
      <section>${abschnitt('Nächste Termine', '#/sendungen/termine', termineHtml)}</section>
      <section>${abschnitt('Aktuelle Sendungen', '#/sendungen/pakete', sendungenHtml)}</section>
      <section>${abschnitt('Offene To-dos', '#/todos', todosHtml)}</section>`;
  },
});
```

- [ ] **Schritt 3: Manueller Testlauf**

`node --check js/module/home/daten.js js/module/home/index.js` (Syntax).
Voller Browser-Test folgt in Task 6, wenn Home tatsächlich in der Nav
erreichbar ist.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/home
git commit -m "feat: neues Modul Home (Kontostand-Ueberblick + Termine/Sendungen/To-dos-Vorschau)"
```

---

### Task 5: Neues Modul "Profil"

**Files:**
- Create: `js/module/profil/index.js`
- Modify: `index.html`
- Modify: `js/app.js`

**Interfaces:**
- Konsumiert: `holeSession`, `meldeAb` (`js/auth.js`, bestehend).
- Produziert: registriertes Modul `id: 'profil'`.

- [ ] **Schritt 1: `profil/index.js` schreiben**

```js
import { registriere } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';

registriere({
  id: 'profil',
  titel: 'Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    container.innerHTML = `
      <header class="modul-kopf"><h2>Profil</h2></header>
      <p>Angemeldet als <strong>${session?.user?.email ?? '–'}</strong></p>
      <p class="lade">Hell/Dunkel-Umschalter findest du oben rechts im Header.</p>
      <button id="profil-abmelden" class="listen-neu">Abmelden</button>`;
    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
```

- [ ] **Schritt 2: `index.html` – globalen Logout-Button entfernen**

Zeile

```html
<button id="logout">Abmelden</button>
```

aus dem `<div class="kopf-aktionen">`-Block in `#dashboard-ansicht`
löschen.

- [ ] **Schritt 3: `js/app.js` – Logout-Listener entfernen, Profil-Modul importieren**

Import-Block um `import './module/profil/index.js';` ergänzen (nach der
`suche`/`home`-Import-Zeile, siehe Task 6 für die endgültige
Import-Reihenfolge).

Den Block

```js
document.getElementById('logout').addEventListener('click', async () => {
  await meldeAb();
  location.hash = '';
  route();
});
```

komplett löschen (Abmelden läuft ab jetzt nur noch über den
Profil-Screen). `meldeAb` bleibt im Import aus `./auth.js` **nur**, wenn
es noch woanders in `js/app.js` gebraucht wird – nach dem Löschen dieses
Blocks prüfen, ob `meldeAb` noch verwendet wird; falls nicht, aus dem
Import in `js/app.js` entfernen (Profil-Modul importiert es selbst
direkt aus `../../auth.js`).

- [ ] **Schritt 4: Commit**

```bash
git add js/module/profil index.html js/app.js
git commit -m "feat: neues Modul Profil, globalen Header-Logout-Button entfernt"
```

---

### Task 6: Navigation umstellen, Ausbildung umbenennen, Ernährung aus Nav entfernen

**Files:**
- Modify: `js/app.js`
- Modify: `js/module/berichtsheft/index.js`

**Interfaces:**
- Konsumiert: alle in Task 2-5 registrierten Module (`home`, `suche`,
  `profil`) plus bestehende (`finanzen`, `berichtsheft`).

- [ ] **Schritt 1: Import-Reihenfolge in `js/app.js` festlegen**

Die Import-Zeilen für Module oben in `js/app.js` durch diese Liste
ersetzen (Ernährung/Todos/Sendungen bleiben registriert, nur nicht mehr
in der Nav-Liste unten; Lager-Import ist in Task 2 schon entfernt):

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

- [ ] **Schritt 2: Feste Nav-Liste einführen**

Nach der bestehenden `import`-Sektion (vor `const loginAnsicht = ...`)
einfügen:

```js
const NAV_MODULE = ['home', 'finanzen', 'berichtsheft', 'suche', 'profil'];
```

- [ ] **Schritt 3: `rendereTabLeiste` auf die feste Liste umstellen**

Die Funktion

```js
function rendereTabLeiste(aktivId) {
  tabLeiste.innerHTML = '';
  for (const modul of alleModule()) {
    const tab = document.createElement('button');
    tab.className = modul.id === aktivId ? 'aktiv' : '';
    tab.innerHTML = `${modul.icon || ''}<span>${modul.titel}</span>`;
    tab.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
    tabLeiste.appendChild(tab);
  }
}
```

ersetzen durch:

```js
function rendereTabLeiste(aktivId) {
  tabLeiste.innerHTML = '';
  for (const modulId of NAV_MODULE) {
    const modul = holeModul(modulId);
    if (!modul) continue;
    const tab = document.createElement('button');
    tab.className = modul.id === aktivId ? 'aktiv' : '';
    tab.innerHTML = `${modul.icon || ''}<span>${modul.titel}</span>`;
    tab.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
    tabLeiste.appendChild(tab);
  }
}
```

- [ ] **Schritt 4: Default-Modul auf `home` umstellen**

In `route()` die Zeile

```js
  const gewaehlt = (modul ? holeModul(modul) : null) || alleModule()[0];
```

ersetzen durch:

```js
  const gewaehlt = (modul ? holeModul(modul) : null) || holeModul('home');
```

Der Import von `alleModule` aus `./registry.js` bleibt bestehen, falls er
sonst nirgends mehr in der Datei gebraucht wird, aus der Import-Zeile
entfernen (`import { holeModul } from './registry.js';` reicht dann).

- [ ] **Schritt 5: Berichtsheft umbenennen und Icon austauschen**

In `js/module/berichtsheft/index.js` die Zeile `titel: 'Berichtsheft',`
ersetzen durch `titel: 'Ausbildung',` (interne Modul-ID bleibt
`berichtsheft`, nur der Anzeigename in der Nav/Kopfzeile ändert sich).

Die bestehende `icon`-Zeile (aktuell ein Dokument-Symbol)

```js
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/></svg>',
```

ersetzen durch einen Doktorhut (Spec Abschnitt 6):

```js
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5-10-5Z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5"/><path d="M22 9v6"/></svg>',
```

- [ ] **Schritt 6: Tests laufen lassen**

Run: `npm test`
Expected: alle Tests PASS (keine reine Logik in diesem Task geändert).

- [ ] **Schritt 7: Manueller Gesamttest**

Lokalen Server starten, einloggen: Bottom-Nav zeigt genau 5 Punkte in der
Reihenfolge Home/Finanzen/Ausbildung/Suche/Profil. Ohne Hash öffnet sich
Home. Ernährung/To-dos/Sendungen sind nicht in der Nav, aber über
`#/ernaehrung`, `#/todos`, `#/sendungen` weiterhin erreichbar. Auf Home:
"Alle anzeigen"-Links bei Termine/Sendungen/To-dos springen zu den
richtigen Screens. Auf Profil: Abmelden funktioniert und führt zurück
zum Login.

- [ ] **Schritt 8: Commit**

```bash
git add js/app.js js/module/berichtsheft/index.js
git commit -m "feat: feste Bottom-Nav (Home/Finanzen/Ausbildung/Suche/Profil)"
```

---

### Task 7: Dokumentation, Merge, Push

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` – neuen Abschnitt oben einfügen**

Neuer Abschnitt nach dem Was/Warum/Entscheidungen/Stand-danach/Offene-
Punkte-Muster. Inhaltlich mindestens: neue Nav-Struktur, Lager-Absorption
in Finanzen, drei neue Module (Home/Suche/Profil), Ernährung nur aus Nav
entfernt (Daten/Code bleiben), globaler Logout-Button entfernt (jetzt in
Profil). Unter "Offene Punkte": Kalender-Feature (Marks Idee, noch nicht
bewertet) und der Sendungen-Mehrfachzeilen-Bug in der
E-Mail-Automatisierung (siehe Spec Abschnitt 2) als eigene, noch nicht
angegangene Themen nennen.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

- Abschnitt "Aufbau": `js/module/lager/` aus der Liste entfernen,
  `js/module/finanzen/` um Teile/Bestellen-Tabs + die vier
  übernommenen Berechnungsfunktionen ergänzen, drei neue Einträge für
  `js/module/home/`, `js/module/suche/`, `js/module/profil/` hinzufügen.
- Test-Liste um `finanzen-berechnung` (jetzt inkl. Lager-Fälle) und
  `suche-berechnung` aktualisieren, `lager-berechnung` entfernen,
  Testanzahl korrigieren (`npm test` Ausgabe abschreiben).
- Nav-Abschnitt ergänzen: feste Bottom-Nav-Reihenfolge
  Home/Finanzen/Ausbildung/Suche/Profil, Ernährung/To-dos/Sendungen nur
  per Hash erreichbar.

- [ ] **Schritt 3: Commit, Merge, Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Etappe 8 (v2) Redesign im Log und in CLAUDE.md dokumentiert"
git checkout main
git merge --no-ff <branch> -m "merge: Etappe 8 (v2) Redesign nach main"
```

Push an Mark übergeben (`!git push`), falls der Push in dieser Session
blockiert wird.

## Definition of Done

- [ ] Alle 7 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Bottom-Nav zeigt genau Home/Finanzen/Ausbildung/Suche/Profil.
- [ ] Lager als eigenes Modul entfernt, Teile/Bestellen als Finanzen-Tabs
      funktionsfähig.
- [ ] Finanzen zeigt echten und unechten Kontostand.
- [ ] Home, Suche, Profil funktionieren im manuellen Test.
- [ ] Ernährung/To-dos/Sendungen weiterhin per Hash erreichbar.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktuell, nach `main` gemergt,
      gepusht.
