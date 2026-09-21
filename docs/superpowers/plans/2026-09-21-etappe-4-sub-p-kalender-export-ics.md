# Etappe 4, Sub-Etappe P: Kalender-Export (ICS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Termine (`sendungen.termine` + offene To-dos mit Fälligkeit)
als `.ics`-Datei exportierbar machen.

**Architecture:** Eine neue, reine Funktion `zuIcsDatei` baut den
ICS-Dateiinhalt. Ein neuer Knopf im Termine-Tab sammelt die Daten und
löst den Download aus (Blob + Klick, wie der CSV-Export aus
Sub-Etappe B).

**Tech Stack:** Vanilla JS/ESM, `node:test`, kein Framework.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-p-kalender-export-ics-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`/reine Logik-Dateien bekommen automatisierte Tests.
- Ganztägige Termine (`DTSTART;VALUE=DATE`), keine Uhrzeit.
- Reine Einbahnstraße (Export), kein Rück-Import, kein abonnierbarer Link.

---

### Task 1: ICS-Erzeugung (reine Logik)

**Files:**
- Create: `js/module/sendungen/ics.js`
- Test: `test/sendungen-ics.test.js`

**Interfaces:**
- Produziert: `zuIcsDatei(termine: {titel,datum}[]): string` — wird von
  Task 2 (`termine.js`) importiert.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zuIcsDatei } from '../js/module/sendungen/ics.js';

test('zuIcsDatei: baut gueltigen ICS-Aufbau mit einem VEVENT pro Termin', () => {
  const ics = zuIcsDatei([{ titel: 'Berichtsheft abgeben', datum: '2026-09-25' }]);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('BEGIN:VEVENT'));
  assert.ok(ics.includes('SUMMARY:Berichtsheft abgeben'));
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20260925'));
  assert.ok(ics.trim().endsWith('END:VCALENDAR'));
});

test('zuIcsDatei: UID ist stabil bei gleichem Titel+Datum (kein Duplikat bei erneutem Export)', () => {
  const ics1 = zuIcsDatei([{ titel: 'Test Termin', datum: '2026-09-25' }]);
  const ics2 = zuIcsDatei([{ titel: 'Test Termin', datum: '2026-09-25' }]);
  const uid1 = ics1.match(/UID:(.+)/)[1];
  const uid2 = ics2.match(/UID:(.+)/)[1];
  assert.equal(uid1, uid2);
});

test('zuIcsDatei: Sonderzeichen im Titel werden escaped', () => {
  const ics = zuIcsDatei([{ titel: 'Termin, mit; Komma', datum: '2026-09-25' }]);
  assert.ok(ics.includes('SUMMARY:Termin\\, mit\\; Komma'));
});

test('zuIcsDatei: leere Liste ergibt gueltigen, leeren Kalender', () => {
  const ics = zuIcsDatei([]);
  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('END:VCALENDAR'));
  assert.ok(!ics.includes('BEGIN:VEVENT'));
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `js/module/sendungen/ics.js` existiert noch nicht.

- [ ] **Schritt 3: Implementieren**

```js
// Reine ICS-Datei-Erzeugung. Kein Netz, keine DOM.

function icsEscape(text) {
  return String(text).replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
}

function stabileUid(titel, datum) {
  const basis = `${titel}-${datum}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${basis}@mein-dashboard`;
}

export function zuIcsDatei(termine) {
  const jetzt = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const events = termine.map((t) => {
    const datumKompakt = t.datum.replace(/-/g, '');
    return [
      'BEGIN:VEVENT',
      `UID:${stabileUid(t.titel, t.datum)}`,
      `DTSTAMP:${jetzt}`,
      `DTSTART;VALUE=DATE:${datumKompakt}`,
      `SUMMARY:${icsEscape(t.titel)}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mein Dashboard//DE',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/sendungen/ics.js test/sendungen-ics.test.js
git commit -m "feat: ICS-Kalenderdatei-Erzeugung"
```

---

### Task 2: Export-Knopf im Termine-Tab

**Files:**
- Modify: `js/module/sendungen/daten.js`
- Modify: `js/module/sendungen/termine.js`

**Interfaces:**
- Konsumiert: `zuIcsDatei` (Task 1, `./ics.js`).
- Produziert: keine neuen Exporte — reine UI-Ergänzung.

- [ ] **Schritt 1: `daten.js` lädt offene To-dos zusätzlich**

Lies die aktuelle `ladeAlles`-Funktion in
`js/module/sendungen/daten.js` (Stand kann sich durch Sub-Etappe E+F
verändert haben, die dort bereits `sendungen_ereignisse` ergänzt hat).
Ergänze einen weiteren parallelen Ladevorgang:
`supabase.from('todos').select('*').eq('erledigt', false).not('faellig', 'is', null)`
als `todosOffen`, im Rückgabe-Objekt als `zustand.todosOffen`.

- [ ] **Schritt 2: `termine.js` — Export-Knopf ergänzen**

Lies die aktuelle Datei (Stand nach Sub-Etappe E+F, mit Detail-Klick-
Routing). Ergänze im zurückgegebenen HTML, direkt vor der
`punkt-liste`-`<div>`, einen Export-Knopf:

```html
<button type="button" id="term-export" class="knopf-neutral" style="margin-bottom:12px;">Kalender exportieren</button>
```

Ergänze nach dem bestehenden Event-Listener-Setup:

```js
const exportBtn = container.querySelector('#term-export');
if (exportBtn) {
  exportBtn.addEventListener('click', async () => {
    const { zuIcsDatei } = await import('./ics.js');
    const termineEintraege = zustand.termine.map((t) => ({ titel: t.titel, datum: t.faellig_am }));
    const todoEintraege = (zustand.todosOffen || []).map((t) => ({ titel: t.text, datum: t.faellig }));
    const ics = zuIcsDatei([...termineEintraege, ...todoEintraege]);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mein-dashboard-termine.ics';
    a.click();
    URL.revokeObjectURL(url);
  });
}
```

(Passe die genaue Einfügestelle an die tatsächliche Struktur der Datei
zum Zeitpunkt der Umsetzung an — falls die Funktion `detail`-Handling
aus Sub-Etappe E+F früh mit `return` verlässt, muss der Export-Knopf
nur im "Liste anzeigen"-Zweig erscheinen, nicht in der Detailansicht.)

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/sendungen/daten.js && node --check js/module/sendungen/termine.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Manuelle Verifikation dokumentieren**

Da der tatsächliche Kalender-Import (Apple Kalender/Google Kalender)
nicht automatisiert testbar ist: im Projekt-Log (Task 3) vermerken,
dass die heruntergeladene `.ics`-Datei einmal manuell in eine
Kalender-App importiert und als korrekt bestätigt werden sollte, sobald
der Nutzer dazu kommt — kein Blocker für diese Task.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/sendungen/daten.js js/module/sendungen/termine.js
git commit -m "feat: Kalender-Export-Knopf im Termine-Tab"
```

---

### Task 3: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum), Was/Entscheidungen/Stand-danach-Muster.
Inhalt: ICS-Export, stabile UIDs, Umfang (Sendungs-Termine + offene
To-dos mit Fälligkeit), Annahme aus der Spec (Download-Knopf statt
abonnierbarer Link) als getroffene Entscheidung dokumentieren. Vermerk,
dass der echte Kalender-Import noch manuell verifiziert werden sollte.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe P als fertig markieren.
Sendungen-Modul-Beschreibung im "Aufbau"-Teil um `ics.js` + den
Export-Knopf ergänzen. `npm test`-Ausgabe tatsächlich ausführen, echte
Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe P (Kalender-Export) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Alle 3 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Knopf im Termine-Tab lädt eine `.ics`-Datei mit allen Sendungs-
      Terminen und offenen To-dos mit Fälligkeitsdatum herunter.
- [ ] Erneuter Export erzeugt dieselben UIDs (kein Duplikat beim
      erneuten Kalender-Import).
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
