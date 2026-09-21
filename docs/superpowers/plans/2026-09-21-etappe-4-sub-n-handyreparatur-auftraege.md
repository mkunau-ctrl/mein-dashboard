# Etappe 4, Sub-Etappe N: Handyreparatur-Aufträge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Handyreparatur-Aufträge erfassen (nur Chat-Diktat), Status-
Zyklus offen→fertig→abgeholt, bei "abgeholt" automatisch eine Einnahme
und optional einen Teile-Bestand um 1 senken.

**Architecture:** Neuer Tab `auftraege` im bestehenden Finanzen-Modul
(kein eigenes Modul). Neue Tabelle `auftraege`. `setzeAuftragStatus`
ruft bei "abgeholt" die bereits vorhandene `legeEinnahmeAn` (aus
Sub-Etappe A) direkt auf und aktualisiert optional `parts.bestand`.

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase, kein Framework.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-n-handyreparatur-auftraege-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`-Funktionen bekommen automatisierte Tests.
- **Kein App-Formular** — Erfassung ausschließlich per Chat-Diktat,
  `legeAuftragAn` ist die Schnittstelle für Claude (Supabase-MCP).
- Status bewegt sich nur vorwärts (`offen → fertig → abgeholt`), **kein
  Rücksprung** wie beim zyklischen Teile-Status.

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, reine DB-Aktion):**

1. Tabelle `auftraege` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null default auth.uid()
   references auth.users`, `kunde text not null`, `geraet text not
   null`, `problem text`, `preis numeric not null`, `status text not
   null default 'offen'` (Check: `status in
   ('offen','fertig','abgeholt')`), `teil_id uuid references parts`,
   `erstellt_am timestamptz not null default now()`. RLS wie überall.

---

### Task 1: Berechnungen

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `naechsterAuftragStatus(status): string|null`,
  `sortiereAuftraege(auftraege): array` — werden von Task 3
  (`auftraege.js`) importiert.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

Import-Zeile in `test/finanzen-berechnung.test.js` um
`naechsterAuftragStatus, sortiereAuftraege` erweitern, am Ende der
Datei ergänzen:

```js
const auftraege = [
  { id: 'a1', kunde: 'Max', geraet: 'iPhone 13', preis: 80, status: 'offen', erstellt_am: '2026-09-01T10:00:00Z' },
  { id: 'a2', kunde: 'Lisa', geraet: 'Samsung S22', preis: 60, status: 'fertig', erstellt_am: '2026-09-05T10:00:00Z' },
  { id: 'a3', kunde: 'Tom', geraet: 'iPad', preis: 100, status: 'abgeholt', erstellt_am: '2026-08-20T10:00:00Z' },
];

test('naechsterAuftragStatus: offen -> fertig -> abgeholt -> kein weiterer Schritt', () => {
  assert.equal(naechsterAuftragStatus('offen'), 'fertig');
  assert.equal(naechsterAuftragStatus('fertig'), 'abgeholt');
  assert.equal(naechsterAuftragStatus('abgeholt'), null);
});

test('sortiereAuftraege: offen/fertig vor abgeholt, innerhalb gleicher Gruppe neueste zuerst', () => {
  const namen = sortiereAuftraege(auftraege).map((a) => a.kunde);
  assert.deepEqual(namen, ['Lisa', 'Max', 'Tom']);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — beide Funktionen sind keine Exports.

- [ ] **Schritt 3: Implementieren**

Am Ende von `js/module/finanzen/berechnung.js` ergänzen:

```js
export function naechsterAuftragStatus(status) {
  const zyklus = { offen: 'fertig', fertig: 'abgeholt' };
  return zyklus[status] || null;
}

export function sortiereAuftraege(auftraege) {
  return [...auftraege].sort((a, b) => {
    const aAbgeholt = a.status === 'abgeholt';
    const bAbgeholt = b.status === 'abgeholt';
    if (aAbgeholt !== bAbgeholt) return aAbgeholt ? 1 : -1;
    return b.erstellt_am < a.erstellt_am ? -1 : 1;
  });
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/finanzen/berechnung.js test/finanzen-berechnung.test.js
git commit -m "feat: Auftrags-Status-Zyklus und Sortierung fuer Handyreparatur-Auftraege"
```

---

### Task 2: Datenzugriff

**Files:**
- Modify: `js/module/finanzen/daten.js`

**Interfaces:**
- Konsumiert: `legeEinnahmeAn` (bereits in derselben Datei vorhanden,
  Sub-Etappe A — kein neuer Import nötig).
- Produziert: `legeAuftragAn({kunde,geraet,problem,preis,teil_id}):
  Promise<void>`, `setzeAuftragStatus(auftrag, neuerStatus):
  Promise<void>`, `entferneAuftrag(id): Promise<void>` — werden von
  Task 3 (`auftraege.js`) importiert. `ladeAlles()` liefert zusätzlich
  `zustand.auftraege`.

- [ ] **Schritt 1: `ladeAlles` erweitern**

Lies die aktuelle `ladeAlles`-Funktion in `js/module/finanzen/daten.js`
(Stand kann sich durch Sub-Etappe B verändert haben — `Promise.all`-
Array, Fehler-Schleife und Rückgabe-Objekt müssen an drei Stellen
synchron erweitert werden). Füge jeweils einen Eintrag für `auftraege`
hinzu:

- Im `Promise.all([...])`-Array: `supabase.from('auftraege').select('*')`.
- In der Fehler-Prüfungsschleife: `Auftraege: auftraege` (mit dem
  tatsächlichen Variablennamen, den du dem `Promise.all`-Ergebnis
  gibst).
- Im Rückgabe-Objekt: `auftraege: auftraege.data`.

- [ ] **Schritt 2: Auftrags-Funktionen ergänzen**

Am Dateiende ergänzen:

```js
export async function legeAuftragAn({ kunde, geraet, problem, preis, teil_id }) {
  const { error } = await supabase.from('auftraege').insert({
    kunde, geraet, problem: problem || null, preis, teil_id: teil_id || null,
  });
  if (error) throw fehler('Auftrag anlegen', error);
}

export async function setzeAuftragStatus(auftrag, neuerStatus) {
  const { error } = await supabase.from('auftraege').update({ status: neuerStatus }).eq('id', auftrag.id);
  if (error) throw fehler('Auftragsstatus ändern', error);
  if (neuerStatus !== 'abgeholt') return;

  const { data: konten, error: kErr } = await supabase.from('konten')
    .select('id').order('erstellt_am').limit(1);
  if (kErr) throw fehler('Hauptkonto laden', kErr);
  const kontoId = konten?.[0]?.id;
  if (kontoId) {
    await legeEinnahmeAn({
      betrag: auftrag.preis, bezeichnung: `Reparatur ${auftrag.geraet}`, konto_id: kontoId,
    });
  }

  if (auftrag.teil_id) {
    const { data: teil, error: tErr } = await supabase.from('parts')
      .select('bestand').eq('id', auftrag.teil_id).single();
    if (tErr) throw fehler('Teil laden', tErr);
    const neuerBestand = Math.max(0, (teil?.bestand ?? 0) - 1);
    const { error: uErr } = await supabase.from('parts')
      .update({ bestand: neuerBestand }).eq('id', auftrag.teil_id);
    if (uErr) throw fehler('Teile-Bestand aktualisieren', uErr);
  }
}

export async function entferneAuftrag(id) {
  const { error } = await supabase.from('auftraege').delete().eq('id', id);
  if (error) throw fehler('Auftrag entfernen', error);
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/daten.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (`daten.js` ist ungetestet,
bestehende Konvention).

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/daten.js
git commit -m "feat: Datenzugriff fuer Handyreparatur-Auftraege inkl. Einnahme+Lager bei Abholung"
```

---

### Task 3: UI-Tab "Aufträge"

**Files:**
- Create: `js/module/finanzen/auftraege.js`
- Modify: `js/module/finanzen/index.js`

**Interfaces:**
- Konsumiert: `setzeAuftragStatus`, `entferneAuftrag` (Task 2,
  `./daten.js`); `sortiereAuftraege`, `naechsterAuftragStatus`
  (Task 1, `./berechnung.js`).
- Produziert: `zeigeAuftraege(container, zustand, aktualisieren):
  Promise<void>` — wird von `index.js` importiert.

- [ ] **Schritt 1: Datei anlegen**

```js
import { setzeAuftragStatus, entferneAuftrag } from './daten.js';
import { sortiereAuftraege, naechsterAuftragStatus } from './berechnung.js';

const HANDY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const STATUS_TEXT = { offen: 'offen', fertig: 'fertig', abgeholt: 'abgeholt' };
const STATUS_KLASSE = { offen: 'status-fehlt', fertig: 'status-bestellt', abgeholt: 'status-da' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeAuftraege(container, zustand, aktualisieren) {
  if (!zustand.auftraege || zustand.auftraege.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Aufträge.';
    container.appendChild(p);
    return;
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const a of sortiereAuftraege(zustand.auftraege)) {
    const naechster = naechsterAuftragStatus(a.status);
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${HANDY_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(a.kunde)} · ${esc(a.geraet)}</strong>
        <small>${a.problem ? esc(a.problem) + ' · ' : ''}${a.preis.toFixed(2)} €</small>
      </div>
      ${naechster
        ? `<button data-a="status" class="status-badge ${STATUS_KLASSE[a.status]}">${STATUS_TEXT[a.status]}</button>`
        : `<span class="status-badge ${STATUS_KLASSE[a.status]}">${STATUS_TEXT[a.status]}</span>`}
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    if (naechster) {
      zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try { await setzeAuftragStatus(a, naechster); await aktualisieren(); }
        catch (err) { alert(err.message); e.target.disabled = false; }
      });
    }
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Auftrag „${a.kunde} · ${a.geraet}" entfernen?`)) return;
      try { await entferneAuftrag(a.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
```

(`status-fehlt`/`status-bestellt`/`status-da` sind die bestehenden
Status-Farb-Klassen aus dem Teile-Modul — rot/blau/grün — hier
zweckentfremdet für offen/fertig/abgeholt, um keine neue CSS zu
brauchen.)

- [ ] **Schritt 2: `index.js` — Tab ergänzen**

Lies die aktuelle `TABS`-Zeile in `js/module/finanzen/index.js` (Stand
kann sich durch Sub-Etappe B stark verändert haben) und ergänze einen
Eintrag `['auftraege', 'Aufträge']` am Ende des Arrays. Ergänze in
`LADER` einen passenden Eintrag:

```js
  auftraege: () => import('./auftraege.js').then((m) => m.zeigeAuftraege),
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/auftraege.js && node --check js/module/finanzen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/auftraege.js js/module/finanzen/index.js
git commit -m "feat: Auftraege-Tab (Status-Zyklus, Loeschen)"
```

---

### Task 4: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum), Was/Entscheidungen/Stand-danach-Muster.
Inhalt: neuer Auftraege-Tab, neue Tabelle, Verknüpfung Einnahme+Lager
bei Abholung, bewusst kein Formular (Chat-Diktat-only, Nutzer-
Entscheidung).

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe N als fertig markieren.
Finanzen-Modul-Beschreibung im "Aufbau"-Teil um `auftraege.js` +
Tabelle `auftraege` ergänzen. Chat-Diktat-Konventionen-Abschnitt um
"Handyreparatur-Aufträge" als weiteres per Chat diktierbares Objekt
ergänzen (analog zu Ausgaben/Berichtsheft/Einnahmen). `npm test`-
Ausgabe tatsächlich ausführen, echte Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe N (Handyreparatur-Auftraege) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Tabelle `auftraege` angelegt, RLS gesetzt.
- [ ] Alle 4 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Auftrag per Chat-Diktat anlegen funktioniert.
- [ ] Status-Zyklus offen→fertig→abgeholt funktioniert, kein
      Rücksprung möglich.
- [ ] Bei "abgeholt" entsteht automatisch eine Einnahme und (falls
      verknüpft) sinkt der Teile-Bestand um 1.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
