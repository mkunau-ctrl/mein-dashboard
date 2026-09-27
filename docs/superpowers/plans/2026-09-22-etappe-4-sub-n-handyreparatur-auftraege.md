# Etappe 4, Sub-Etappe N: Handyreparatur-Aufträge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nutzer-Vorgabe (bestätigt für diese Session, siehe Sub-Etappen R/S):
> immer nur 4 Tasks bauen, dann stoppen und auf Freigabe warten**,
> bevor der nächste Block startet. Batches: **1-4**, dann stoppen;
> **5-8**, dann stoppen (Ende).

**Goal:** Ankauf-Reparatur-Weiterverkauf von Handys als eigenes Modul
abbilden: Aufträge erfassen, Warenwert-Integration in die bestehende
Kontostand-Berechnung, erwarteter/tatsächlicher Gewinn, automatische
Einnahme beim Verkauf.

**Architecture:** Neues, eigenständiges Modul `js/module/handyreparatur/`
nach dem Vorbild von `js/module/rechnungen/` (kein Bottom-Nav-/
Finanzen-Tab-Eintrag, Erreichbarkeit über Suche). `warenwert()` in
`finanzen/berechnung.js` wird um einen optionalen zweiten Parameter für
offene Reparatur-Aufträge erweitert — rückwärtskompatibel, bestehende
Aufrufer ohne Änderung lauffähig, gezielt erweiterte Aufrufer (Home,
Finanzen-Übersicht) zeigen den korrekten Gesamt-Warenwert inkl. Handys.

**Tech Stack:** Vanilla JS/ESM, `node:test`, kein Framework, Supabase.

**Spec:** `docs/superpowers/specs/2026-09-22-etappe-4-sub-n-handyreparatur-auftraege-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`/reine Logik-Dateien bekommen `node:test`-Tests.
- Statusübergänge: **offen → fertig → verkauft** (bestätigt, kein
  Kunden-Reparaturservice — Ankauf-Reparatur-Weiterverkauf, s. Spec
  Abschnitt 0).
- Kein Kundenname-Feld. `verkaeufer`/`kaeufer` sind optionale Freitextfelder.
- Direkt auf `main`, kein Feature-Branch. Nach jeder Task
  `git push origin main`.
- Alle neuen Supabase-Tabellen: RLS nach Projekt-Standard
  (`user_id = auth.uid()`, `for all to authenticated`, Spalte
  `user_id default auth.uid()`).
- `USER_ID` = `df0b24a6-6a74-4830-995c-84015161dcc3` für Chat-Diktat-
  Inserts per Supabase-MCP.

---

### Task 1: Datenbank-Migration

**Files:** keine Code-Dateien — Supabase-Schema-Änderung per
Supabase-MCP (`apply_migration` oder `execute_sql`, Projekt-ID
`vogztxoaqbnuciboughd`).

**Interfaces:**
- Produziert: Tabelle `handyreparatur_auftraege` — konsumiert von
  Task 4 (`daten.js`).

- [ ] **Schritt 1: Migration anwenden**

```sql
create table handyreparatur_auftraege (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id),
  geraet text not null,
  notiz text,
  status text not null default 'offen' check (status in ('offen','fertig','verkauft')),
  warenwert numeric not null,
  voraussichtlicher_verkaufspreis numeric,
  tatsaechlicher_verkaufspreis numeric,
  verkaeufer text,
  kaeufer text,
  verkauft_am date,
  erstellt_am timestamptz not null default now()
);

alter table handyreparatur_auftraege enable row level security;

create policy "handyreparatur_auftraege: eigene Zeilen" on handyreparatur_auftraege
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
```

(Exaktes Vorbild: dieselbe Struktur wie die bestehende `rechnungen`-
Tabelle — `check`-Constraint auf `status`, `user_id`-FK auf
`auth.users`, identisches RLS-Policy-Muster.)

- [ ] **Schritt 2: Verifizieren**

Per Supabase-MCP `execute_sql`:
```sql
select column_name, data_type from information_schema.columns
where table_schema='public' and table_name='handyreparatur_auftraege'
order by ordinal_position;
```
Expected: 11 Zeilen, Spalten wie oben definiert.

Per Supabase-MCP `get_advisors` (Typ `security`): keine neuen
Sicherheits-Warnungen zur neuen Tabelle.

- [ ] **Schritt 3: Keine Commit nötig** (reine DB-Änderung, kein
      Code-Diff) — wird in Task 8 zusammen mit dem Rest dokumentiert.

---

### Task 2: `warenwert()` um Reparatur-Aufträge erweitern

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `warenwert(teile, reparaturAuftraege?: {status,warenwert}[]): number`
  — geänderte Signatur, zweiter Parameter optional mit Default `[]`.
  Konsumiert von Task 7 (`home/index.js`, `finanzen/uebersicht.js`).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `test/finanzen-berechnung.test.js` ist bereits ein Test
`'warenwert: Summe bestand mal einzelwert, fehlender Wert zaehlt als 0'`
vorhanden (prüft nur den ersten Parameter) — dieser bleibt unverändert
gültig, da der zweite Parameter optional ist. Direkt danach einen
neuen Test ergänzen:

```js
test('warenwert: zweiter Parameter zaehlt offene Reparatur-Auftraege mit, verkaufte nicht', () => {
  const auftraege = [
    { status: 'offen', warenwert: 305 },
    { status: 'fertig', warenwert: 450 },
    { status: 'verkauft', warenwert: 200 },
  ];
  assert.equal(warenwert(teile, auftraege), (2 * 60 + 0 * 25 + 1 * 15 + 5 * 0) + 305 + 450);
});

test('warenwert: ohne zweiten Parameter unveraendert (Rueckwaertskompatibilitaet)', () => {
  assert.equal(warenwert(teile), 2 * 60 + 0 * 25 + 1 * 15 + 5 * 0);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `warenwert` ignoriert aktuell einen zweiten Parameter
komplett, der erste neue Test schlägt fehl (Ergebnis enthält die
Reparatur-Werte nicht).

- [ ] **Schritt 3: Implementieren**

In `js/module/finanzen/berechnung.js`, Zeilen 76-78:
Von:
```js
export function warenwert(teile) {
  return teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
}
```
Zu:
```js
export function warenwert(teile, reparaturAuftraege = []) {
  const lager = teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
  const reparaturen = reparaturAuftraege
    .filter((a) => a.status !== 'verkauft')
    .reduce((s, a) => s + a.warenwert, 0);
  return lager + reparaturen;
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS (113).

- [ ] **Schritt 5: Commit**

```bash
git add js/module/finanzen/berechnung.js test/finanzen-berechnung.test.js
git commit -m "feat: warenwert() bezieht offene Handyreparatur-Auftraege mit ein"
git push origin main
```

---

### Task 3: `js/module/handyreparatur/berechnung.js`

**Files:**
- Create: `js/module/handyreparatur/berechnung.js`
- Test: `test/handyreparatur-berechnung.test.js`

**Interfaces:**
- Produziert: `naechsterAuftragStatus(status): string`,
  `erwarteterGewinn(auftraege): number`,
  `istGewinnImMonat(auftraege, jahr, monat): number`,
  `sortiereAuftraege(auftraege): array` — alle konsumiert von Task 5
  (`index.js`).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { naechsterAuftragStatus, erwarteterGewinn, istGewinnImMonat, sortiereAuftraege }
  from '../js/module/handyreparatur/berechnung.js';

test('naechsterAuftragStatus: zyklisch offen -> fertig -> verkauft -> offen', () => {
  assert.equal(naechsterAuftragStatus('offen'), 'fertig');
  assert.equal(naechsterAuftragStatus('fertig'), 'verkauft');
  assert.equal(naechsterAuftragStatus('verkauft'), 'offen');
});

test('erwarteterGewinn: Summe (voraussichtlicher Verkaufspreis minus Warenwert) ueber offene Auftraege mit hinterlegtem Preis', () => {
  const auftraege = [
    { status: 'offen', warenwert: 305, voraussichtlicher_verkaufspreis: 370 },
    { status: 'fertig', warenwert: 450, voraussichtlicher_verkaufspreis: 550 },
    { status: 'offen', warenwert: 200, voraussichtlicher_verkaufspreis: null },
    { status: 'verkauft', warenwert: 130, voraussichtlicher_verkaufspreis: 160 },
  ];
  assert.equal(erwarteterGewinn(auftraege), (370 - 305) + (550 - 450));
});

test('istGewinnImMonat: Summe (tatsaechlicher Verkaufspreis minus Warenwert) ueber im Monat verkaufte Auftraege', () => {
  const auftraege = [
    { status: 'verkauft', warenwert: 130, tatsaechlicher_verkaufspreis: 160, verkauft_am: '2026-09-15' },
    { status: 'verkauft', warenwert: 200, tatsaechlicher_verkaufspreis: 220, verkauft_am: '2026-08-01' },
    { status: 'offen', warenwert: 305, tatsaechlicher_verkaufspreis: null, verkauft_am: null },
  ];
  assert.equal(istGewinnImMonat(auftraege, 2026, 9), 160 - 130);
});

test('sortiereAuftraege: offen vor fertig vor verkauft, sonst neueste zuerst', () => {
  const auftraege = [
    { id: 'a1', status: 'verkauft', erstellt_am: '2026-09-01T00:00:00Z' },
    { id: 'a2', status: 'offen', erstellt_am: '2026-09-05T00:00:00Z' },
    { id: 'a3', status: 'fertig', erstellt_am: '2026-09-03T00:00:00Z' },
    { id: 'a4', status: 'offen', erstellt_am: '2026-09-10T00:00:00Z' },
  ];
  const ids = sortiereAuftraege(auftraege).map((a) => a.id);
  assert.deepEqual(ids, ['a4', 'a2', 'a3', 'a1']);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `js/module/handyreparatur/berechnung.js` existiert
noch nicht.

- [ ] **Schritt 3: Implementieren**

```js
// Reine Berechnungen fuers Handyreparatur-Modul. Kein Netz, keine DOM.

const STATUS_ZYKLUS = { offen: 'fertig', fertig: 'verkauft', verkauft: 'offen' };
const STATUS_RANG = { offen: 0, fertig: 1, verkauft: 2 };

export function naechsterAuftragStatus(status) {
  return STATUS_ZYKLUS[status];
}

export function erwarteterGewinn(auftraege) {
  return auftraege
    .filter((a) => a.status !== 'verkauft' && a.voraussichtlicher_verkaufspreis != null)
    .reduce((s, a) => s + (a.voraussichtlicher_verkaufspreis - a.warenwert), 0);
}

export function istGewinnImMonat(auftraege, jahr, monat) {
  return auftraege
    .filter((a) => a.status === 'verkauft' && a.verkauft_am
      && Number(a.verkauft_am.slice(0, 4)) === jahr && Number(a.verkauft_am.slice(5, 7)) === monat)
    .reduce((s, a) => s + (a.tatsaechlicher_verkaufspreis - a.warenwert), 0);
}

export function sortiereAuftraege(auftraege) {
  return [...auftraege].sort((a, b) => {
    const rang = STATUS_RANG[a.status] - STATUS_RANG[b.status];
    if (rang !== 0) return rang;
    return a.erstellt_am < b.erstellt_am ? 1 : -1;
  });
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS (117).

- [ ] **Schritt 5: Commit**

```bash
git add js/module/handyreparatur/berechnung.js test/handyreparatur-berechnung.test.js
git commit -m "feat: reine Berechnungen fuers Handyreparatur-Modul"
git push origin main
```

---

### Task 4: `js/module/handyreparatur/daten.js`

**Files:**
- Create: `js/module/handyreparatur/daten.js`

**Interfaces:**
- Konsumiert: `legeEinnahmeAn` (bestehend, `js/module/finanzen/daten.js`).
- Produziert: `ladeAlles(): Promise<{auftraege}>`,
  `legeAuftragAn({geraet,notiz,warenwert,voraussichtlicher_verkaufspreis}): Promise<void>`,
  `setzeAuftragStatus(auftrag, neuerStatus, {tatsaechlicherVerkaufspreis, kontoId}?): Promise<void>`,
  `entferneAuftrag(id): Promise<void>` — alle konsumiert von Task 5
  (`index.js`) und Task 7 (`home/daten.js`, `finanzen/daten.js`
  importieren nur `ladeAlles`).

- [ ] **Schritt 1: Implementieren**

```js
import { supabase } from '../../supabase.js';
import { legeEinnahmeAn } from '../finanzen/daten.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('handyreparatur_auftraege').select('*').order('erstellt_am', { ascending: false });
  if (error) throw fehler('Handyreparatur-Auftraege laden', error);
  return { auftraege: data };
}

export async function legeAuftragAn({ geraet, notiz, warenwert, voraussichtlicher_verkaufspreis }) {
  const { error } = await supabase.from('handyreparatur_auftraege').insert({
    geraet, notiz: notiz || null, warenwert,
    voraussichtlicher_verkaufspreis: voraussichtlicher_verkaufspreis || null,
  });
  if (error) throw fehler('Handyreparatur-Auftrag anlegen', error);
}

export async function setzeAuftragStatus(auftrag, neuerStatus, { tatsaechlicherVerkaufspreis, kontoId } = {}) {
  if (neuerStatus === 'verkauft') {
    const { error } = await supabase.from('handyreparatur_auftraege').update({
      status: 'verkauft',
      verkauft_am: new Date().toISOString().slice(0, 10),
      tatsaechlicher_verkaufspreis: tatsaechlicherVerkaufspreis,
    }).eq('id', auftrag.id);
    if (error) throw fehler('Auftrag als verkauft markieren', error);
    await legeEinnahmeAn({
      betrag: tatsaechlicherVerkaufspreis, bezeichnung: auftrag.geraet,
      quelle: 'manuell', konto_id: kontoId,
    });
    return;
  }
  const { error } = await supabase.from('handyreparatur_auftraege').update({ status: neuerStatus }).eq('id', auftrag.id);
  if (error) throw fehler('Auftrag-Status aendern', error);
}

export async function entferneAuftrag(id) {
  const { error } = await supabase.from('handyreparatur_auftraege').delete().eq('id', id);
  if (error) throw fehler('Handyreparatur-Auftrag entfernen', error);
}
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/handyreparatur/daten.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (117 — reine Netzwerk-Datei, kein
Test nach Projekt-Konvention).

- [ ] **Schritt 3: Commit**

```bash
git add js/module/handyreparatur/daten.js
git commit -m "feat: Datenzugriff fuers Handyreparatur-Modul inkl. Einnahme-Erzeugung bei Verkauf"
git push origin main
```

**Nach diesem Commit: STOPPEN.** Tasks 5-8 erst nach expliziter
Nutzer-Freigabe für den nächsten Block beginnen.

---

### Task 5: `js/module/handyreparatur/index.js` (UI)

**Files:**
- Create: `js/module/handyreparatur/index.js`

**Interfaces:**
- Konsumiert: `ladeAlles, legeAuftragAn, setzeAuftragStatus, entferneAuftrag`
  (Task 4), `naechsterAuftragStatus, erwarteterGewinn, sortiereAuftraege`
  (Task 3), `registriere` (`js/registry.js`).

- [ ] **Schritt 1: Implementieren**

```js
import { registriere } from '../../registry.js';
import { ladeAlles, legeAuftragAn, setzeAuftragStatus, entferneAuftrag } from './daten.js';
import { naechsterAuftragStatus, erwarteterGewinn, sortiereAuftraege } from './berechnung.js';

const HANDY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const FILTER = ['alle', 'offen', 'fertig', 'verkauft'];
const FILTER_TEXT = { alle: 'Alle', offen: 'Offen', fertig: 'Fertig', verkauft: 'Verkauft' };
const STATUS_TEXT = { offen: 'Offen', fertig: 'Fertig', verkauft: 'Verkauft' };
const STATUS_KLASSE = { offen: 'status-fehlt', fertig: 'status-bestellt', verkauft: 'status-da' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let zustand = null;
let filter = 'alle';

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="geraet" type="text" placeholder="Gerät (z. B. iPhone 14 Pro)" required>
    <input name="warenwert" type="number" step="0.01" placeholder="Warenwert (€)" required>
    <input name="voraussichtlich" type="number" step="0.01" placeholder="Voraussichtlicher Verkaufspreis (€, optional)">
    <input name="notiz" type="text" placeholder="Notiz (optional)">
    <button type="submit">+ Auftrag anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeAuftragAn({
        geraet: daten.get('geraet'),
        warenwert: Number(daten.get('warenwert')),
        voraussichtlicher_verkaufspreis: daten.get('voraussichtlich') ? Number(daten.get('voraussichtlich')) : null,
        notiz: daten.get('notiz'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

function zeichneListe(container, aktualisieren) {
  const gefiltert = sortiereAuftraege(zustand.auftraege).filter((a) => filter === 'alle' || a.status === filter);
  const liste = container.querySelector('#hr-liste');
  liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Aufträge in dieser Ansicht.</p>' : '';
  for (const a of gefiltert) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${HANDY_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(a.geraet)}</strong>
        <small>Warenwert ${a.warenwert.toFixed(2)} €${a.voraussichtlicher_verkaufspreis ? ` · voraussichtlich ${a.voraussichtlicher_verkaufspreis.toFixed(2)} €` : ''}</small>
      </div>
      <span class="status-badge ${STATUS_KLASSE[a.status]}">${STATUS_TEXT[a.status]}</span>
      <div class="punkt-aktionen">
        ${a.status !== 'verkauft' ? '<button data-a="weiter">›</button>' : ''}
        <button data-a="weg">✕</button>
      </div>`;
    if (a.status !== 'verkauft') {
      zeile.querySelector('[data-a=weiter]').addEventListener('click', async () => {
        const neuerStatus = naechsterAuftragStatus(a.status);
        try {
          if (neuerStatus === 'verkauft') {
            const vorschlag = a.voraussichtlicher_verkaufspreis ?? a.warenwert;
            const preisText = prompt('Tatsächlicher Verkaufspreis (€):', vorschlag);
            if (preisText === null) return;
            const kontoId = zustand.konten?.[0]?.id;
            await setzeAuftragStatus(a, 'verkauft', { tatsaechlicherVerkaufspreis: Number(preisText), kontoId });
          } else {
            await setzeAuftragStatus(a, neuerStatus);
          }
          await aktualisieren();
        } catch (err) { alert(err.message); }
      });
    }
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Auftrag „${a.geraet}" entfernen?`)) return;
      try { await entferneAuftrag(a.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}

registriere({
  id: 'handyreparatur',
  titel: 'Handyreparaturen',
  async init(container) {
    if (!zustand) await ladeZustand();
    const aktualisieren = async () => { await ladeZustand(); render(); };

    function render() {
      container.innerHTML = `
        <div class="modul-kopf">
          <button id="hr-zurueck" type="button">‹ Zurück</button>
        </div>
        <div class="stat-karte gross">
          <small>Erwarteter Gewinn</small>
          <span>${erwarteterGewinn(zustand.auftraege).toFixed(2)} €</span>
        </div>
        <div class="chips">
          ${FILTER.map((f) => `<button type="button" class="chip${f === filter ? ' aktiv' : ''}" data-f="${f}">${FILTER_TEXT[f]}</button>`).join('')}
        </div>
        <div class="punkt-liste" id="hr-liste"></div>`;
      container.querySelector('#hr-zurueck').addEventListener('click', () => { history.back(); });
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

(`zustand.konten` wird für die Konto-Zuordnung beim Verkauf gebraucht —
das erfordert, dass `daten.js`s `ladeAlles()` **zusätzlich** die
`konten`-Tabelle lädt. Da das nur für den Verkaufsfall gebraucht wird,
wird das in Schritt 2 nachgezogen.)

- [ ] **Schritt 2: `daten.js`s `ladeAlles()` um `konten` ergänzen**

In `js/module/handyreparatur/daten.js`, `ladeAlles()` anpassen von:
```js
export async function ladeAlles() {
  const { data, error } = await supabase.from('handyreparatur_auftraege').select('*').order('erstellt_am', { ascending: false });
  if (error) throw fehler('Handyreparatur-Auftraege laden', error);
  return { auftraege: data };
}
```
zu:
```js
export async function ladeAlles() {
  const [auftraege, konten] = await Promise.all([
    supabase.from('handyreparatur_auftraege').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('konten').select('id').order('erstellt_am').limit(1),
  ]);
  if (auftraege.error) throw fehler('Handyreparatur-Auftraege laden', auftraege.error);
  if (konten.error) throw fehler('Konten laden', konten.error);
  return { auftraege: auftraege.data, konten: konten.data };
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/handyreparatur/index.js && node --check js/module/handyreparatur/daten.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/handyreparatur/index.js js/module/handyreparatur/daten.js
git commit -m "feat: UI fuers Handyreparatur-Modul (Liste, Formular, Statuswechsel)"
git push origin main
```

---

### Task 6: Verdrahtung (app.js-Import, Suche-Schnelleinstieg)

**Files:**
- Modify: `js/app.js`
- Modify: `js/module/suche/index.js`

**Interfaces:** keine.

- [ ] **Schritt 1: `js/app.js` — Modul importieren**

Nach der Zeile `import './module/rechnungen/index.js';` ergänzen:
```js
import './module/handyreparatur/index.js';
```

- [ ] **Schritt 2: `js/module/suche/index.js` — Schnelleinstieg
      ergänzen**

Am Dateianfang, im `SCHNELLEINSTIEGE`-Array, ein neues Icon und einen
neuen Eintrag ergänzen. Neue Icon-Konstante nach `KALENDER_ICON`:
```js
const HANDY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
```
Im `SCHNELLEINSTIEGE`-Array (nach dem "Berichtsheft"-Eintrag)
ergänzen:
```js
  { label: 'Handyreparaturen', icon: HANDY_ICON, ziel: '#/handyreparatur' },
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/app.js && node --check js/module/suche/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Manuell prüfen**

App im Browser öffnen, Suche öffnen: neuer Schnelleinstieg
"Handyreparaturen" erscheint, Klick öffnet das neue Modul, "‹ Zurück"
springt zur Suche zurück.

- [ ] **Schritt 5: Commit**

```bash
git add js/app.js js/module/suche/index.js
git commit -m "feat: Handyreparatur-Modul verdrahtet, Suche-Schnelleinstieg ergaenzt"
git push origin main
```

---

### Task 7: Warenwert-Anbindung in Home und Finanzen-Übersicht

**Files:**
- Modify: `js/module/home/daten.js`
- Modify: `js/module/home/index.js`
- Modify: `js/module/finanzen/daten.js`
- Modify: `js/module/finanzen/uebersicht.js`

**Interfaces:**
- Konsumiert: `ladeAlles` aus `js/module/handyreparatur/daten.js`
  (Task 4), `warenwert(teile, reparaturAuftraege)` (Task 2).

- [ ] **Schritt 1: `js/module/home/daten.js` — vierte Quelle laden**

Von:
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
Zu:
```js
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';
import { ladeAlles as ladeHandyreparatur } from '../handyreparatur/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen, handyreparatur] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(), ladeHandyreparatur(),
  ]);
  return { finanzen, todos, sendungen, handyreparatur };
}
```

- [ ] **Schritt 2: `js/module/home/index.js` — `warenwert`-Aufruf
      erweitern**

`unechterGesamtKontostand` ruft intern bereits `warenwert(teile)` auf
— das bleibt unverändert (dieser Aufruf zeigt weiterhin nur
Lager-Warenwert, da `unechterGesamtKontostand`s eigene Signatur nicht
Teil dieser Task ist). Stattdessen wird die **Home-Startseite**
gezielt erweitert: `renderHome` bekommt Zugriff auf
`zustand.handyreparatur.auftraege` und zeigt den korrekten
Gesamt-Warenwert separat an. In `renderHome`, nach der Zeile:
```js
  const { finanzen, todos, sendungen } = zustand;
```
ergänzen:
```js
  const { finanzen, todos, sendungen, handyreparatur } = zustand;
```
Import-Zeile am Dateianfang um `warenwert` ergänzen:
```js
import { gesamtKontostand, unechterGesamtKontostand, summeProMonat, warenwert } from '../finanzen/berechnung.js';
```
In der `container.innerHTML`-Vorlage, den bestehenden
"Unecht"-Stat-Eintrag
```html
      <div class="stat"><div class="icon-badge">${BOX_ICON}</div>
        <div class="stat-lbl">Unecht</div>
        <div class="stat-val">${gesetzt ? unecht.toFixed(2) + ' €' : '–'}</div></div>
```
inhaltlich unverändert lassen (zeigt weiterhin den bestehenden Wert),
aber direkt davor die Berechnung von `unecht` anpassen: die bestehende
Zeile
```js
  const unecht = gesetzt ? unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heute()) : null;
```
zu
```js
  const unecht = gesetzt
    ? gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute())
      + warenwert(finanzen.teile, handyreparatur.auftraege)
    : null;
```
(`unechterGesamtKontostand` selbst nicht anfassen — hier direkt die
erweiterte `warenwert()`-Variante inline zusammengesetzt, damit
Handyreparaturen mit in den "Unecht"-Wert einfließen, ohne die
gemeinsame Helper-Funktion für alle anderen, unveränderten Aufrufer
mit anzufassen.)

- [ ] **Schritt 3: `js/module/finanzen/daten.js` — `handyreparatur_auftraege`
      mitladen**

Von:
```js
export async function ladeAlles() {
  const [expenses, settings, teile, konten, einnahmen, einnahmenVorlagen, schulden, zahlungen, ausgabenVorlagen] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
    supabase.from('konten').select('*').order('erstellt_am'),
    supabase.from('einnahmen').select('*').order('datum', { ascending: false }),
    supabase.from('einnahmen_vorlagen').select('*').eq('aktiv', true),
    supabase.from('schulden').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('schulden_zahlungen').select('*'),
    supabase.from('ausgaben_vorlagen').select('*').eq('aktiv', true),
  ]);
  for (const [name, r] of Object.entries({
    Ausgaben: expenses, Einstellungen: settings, Teile: teile, Konten: konten,
    Einnahmen: einnahmen, 'Einnahmen-Vorlagen': einnahmenVorlagen, Schulden: schulden,
    'Schulden-Zahlungen': zahlungen, 'Ausgaben-Vorlagen': ausgabenVorlagen,
  })) {
    if (r.error) throw fehler(`${name} laden`, r.error);
  }
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return {
    expenses: expenses.data, settings: settingsObj, teile: teile.data,
    konten: konten.data, einnahmen: einnahmen.data, einnahmenVorlagen: einnahmenVorlagen.data,
    schulden: schulden.data, zahlungen: zahlungen.data, ausgabenVorlagen: ausgabenVorlagen.data,
  };
}
```
Zu:
```js
export async function ladeAlles() {
  const [expenses, settings, teile, konten, einnahmen, einnahmenVorlagen, schulden, zahlungen, ausgabenVorlagen, handyreparaturAuftraege] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
    supabase.from('konten').select('*').order('erstellt_am'),
    supabase.from('einnahmen').select('*').order('datum', { ascending: false }),
    supabase.from('einnahmen_vorlagen').select('*').eq('aktiv', true),
    supabase.from('schulden').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('schulden_zahlungen').select('*'),
    supabase.from('ausgaben_vorlagen').select('*').eq('aktiv', true),
    supabase.from('handyreparatur_auftraege').select('status,warenwert'),
  ]);
  for (const [name, r] of Object.entries({
    Ausgaben: expenses, Einstellungen: settings, Teile: teile, Konten: konten,
    Einnahmen: einnahmen, 'Einnahmen-Vorlagen': einnahmenVorlagen, Schulden: schulden,
    'Schulden-Zahlungen': zahlungen, 'Ausgaben-Vorlagen': ausgabenVorlagen,
    'Handyreparatur-Auftraege': handyreparaturAuftraege,
  })) {
    if (r.error) throw fehler(`${name} laden`, r.error);
  }
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return {
    expenses: expenses.data, settings: settingsObj, teile: teile.data,
    konten: konten.data, einnahmen: einnahmen.data, einnahmenVorlagen: einnahmenVorlagen.data,
    schulden: schulden.data, zahlungen: zahlungen.data, ausgabenVorlagen: ausgabenVorlagen.data,
    handyreparaturAuftraege: handyreparaturAuftraege.data,
  };
}
```

- [ ] **Schritt 4: `js/module/finanzen/uebersicht.js` — Warenwert-Zeile
      erweitern**

Import-Zeile bleibt (`warenwert` ist bereits importiert, aus
Sub-Etappe S Task 10). Die bestehende Zeile
```js
  const warenwertBetrag = warenwert(zustand.teile);
```
zu
```js
  const warenwertBetrag = warenwert(zustand.teile, zustand.handyreparaturAuftraege);
```

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/home/daten.js && node --check js/module/home/index.js && node --check js/module/finanzen/daten.js && node --check js/module/finanzen/uebersicht.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Manuell prüfen**

Nach dem Eintragen der Rohdaten (Task 8): Home-Screen "Unecht"-Wert
und Finanzen-Übersicht "Warenwert" sollten beide um die Summe der
offenen Handyreparatur-Warenwerte höher liegen als vorher.

- [ ] **Schritt 7: Commit**

```bash
git add js/module/home/daten.js js/module/home/index.js js/module/finanzen/daten.js js/module/finanzen/uebersicht.js
git commit -m "feat: Warenwert auf Home und Finanzen-Uebersicht bezieht Handyreparatur-Auftraege ein"
git push origin main
```

---

### Task 8: Rohdaten eintragen + Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: Rohdaten per Supabase-MCP eintragen**

Die acht in `CLAUDE.md` unter Punkt N gesicherten Rohdaten-Zeilen
eintragen (`execute_sql` oder äquivalentes Insert, Projekt-ID
`vogztxoaqbnuciboughd`, `user_id` implizit über RLS/Session oder
explizit `df0b24a6-6a74-4830-995c-84015161dcc3`):

```sql
insert into handyreparatur_auftraege (user_id, geraet, warenwert, voraussichtlicher_verkaufspreis) values
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 14 Pro', 305, 370),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 16 Pro', 450, 550),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 13 mini', 200, null),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 14', 130, null),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 14', 160, 220);

insert into handyreparatur_auftraege (user_id, geraet, notiz, warenwert) values
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 15 Pro', '2 Rückseiten', 50),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 15', 'Kamera', 30),
('df0b24a6-6a74-4830-995c-84015161dcc3', 'iPhone 14', 'Kamera', 38);
```

- [ ] **Schritt 2: Verifizieren**

```sql
select geraet, notiz, warenwert, voraussichtlicher_verkaufspreis, status from handyreparatur_auftraege order by erstellt_am;
```
Expected: 8 Zeilen wie oben, alle `status = 'offen'`.

- [ ] **Schritt 3: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben
      einfügen**

Was/Entscheidungen/Stand-danach-Muster. Inhalt: alle 8 Tasks
zusammenfassen. Explizit die Korrektur zum ursprünglichen
Backlog-Eintrag erwähnen (Ankauf-Reparatur-Weiterverkauf statt
Kunden-Reparaturservice, per Rückfrage im Brainstorming aufgedeckt —
Doku-Rigor-Regel: auch diese Design-Korrektur festhalten). Die acht
eingetragenen Rohdaten-Zeilen als erledigt vermerken.

- [ ] **Schritt 4: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe N als fertig markieren,
"Reihenfolge ab jetzt" auf "als Nächstes O" umstellen. Die
Rohdaten-Notiz unter Punkt N (aus der Sitzung vom 2026-09-22) als
"eingetragen, s. PROJEKT-LOG" kennzeichnen statt sie zu löschen
(Doku-Rigor: Verlauf nachvollziehbar halten). `npm test`-Ausgabe
tatsächlich ausführen, echte Testanzahl übernehmen. Im
"Aufbau"-Abschnitt einen neuen Eintrag für `js/module/handyreparatur/`
ergänzen (analog zum bestehenden Eintrag für `js/module/rechnungen/`),
Supabase-Tabellenliste um `handyreparatur_auftraege` ergänzen.

- [ ] **Schritt 5: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe N (Handyreparatur-Auftraege) dokumentiert, Rohdaten eingetragen"
git push origin main
```

## Definition of Done

- [ ] Alle 8 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Tabelle `handyreparatur_auftraege` existiert mit RLS.
- [ ] `warenwert()` bezieht offene Reparatur-Aufträge mit ein,
      rückwärtskompatibel für bestehende Aufrufer.
- [ ] Neues Modul über Suche-Schnelleinstieg "Handyreparaturen"
      erreichbar, nicht in Bottom-Nav/Finanzen-Tabs.
- [ ] Aufträge anlegen, Status weiterschalten (offen→fertig→verkauft),
      bei "verkauft" wird automatisch eine Einnahme angelegt.
- [ ] Home und Finanzen-Übersicht zeigen den erweiterten Warenwert
      inkl. Handyreparaturen.
- [ ] Alle 8 realen Rohdaten-Zeilen eingetragen und verifiziert.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
