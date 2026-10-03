import test from 'node:test';
import assert from 'node:assert/strict';
import { monatsRaster, eintraegeProTag, monatsName, verschiebeMonat } from '../js/module/kalender/berechnung.js';

test('monatsRaster: Oktober 2026 beginnt am Donnerstag, Wochen ab Montag', () => {
  const r = monatsRaster(2026, 10);
  assert.equal(r.length % 7, 0);
  assert.deepEqual(r.slice(0, 4), [null, null, null, '2026-10-01']);
  assert.ok(r.includes('2026-10-31'));
  assert.equal(r.filter(Boolean).length, 31);
});

test('monatsRaster: Februar im Schaltjahr hat 29 Tage', () => {
  assert.equal(monatsRaster(2028, 2).filter(Boolean).length, 29);
});

test('verschiebeMonat und monatsName', () => {
  assert.deepEqual(verschiebeMonat(2026, 12, 1), { jahr: 2027, monat: 1 });
  assert.deepEqual(verschiebeMonat(2026, 1, -1), { jahr: 2025, monat: 12 });
  assert.equal(monatsName(10), 'Oktober');
});

test('eintraegeProTag: Termine, offene To-dos mit Frist, offene Rechnungen', () => {
  const m = eintraegeProTag({
    termine: [{ id: 't1', titel: 'Zahnarzt', faellig_am: '2026-10-05', uhrzeit: '09:00', erledigt: false }, { id: 't2', titel: 'Alt', faellig_am: '2026-10-05', erledigt: true }],
    todos: [{ id: 'd1', text: 'Müll', faellig: '2026-10-05', erledigt: false }, { id: 'd2', text: 'ohne Frist', faellig: null, erledigt: false }],
    rechnungen: [{ id: 'r1', haendler: 'Strom', betrag: 50, faellig_am: '2026-10-07', status: 'offen' }, { id: 'r2', haendler: 'Bezahlt', betrag: 1, faellig_am: '2026-10-07', status: 'bezahlt' }],
  });
  assert.deepEqual(Object.keys(m).sort(), ['2026-10-05', '2026-10-07']);
  assert.equal(m['2026-10-05'].length, 2);
  assert.equal(m['2026-10-05'][0].art, 'termin');
  assert.equal(m['2026-10-05'][0].uhrzeit, '09:00');
  assert.equal(m['2026-10-07'].length, 1);
  assert.equal(m['2026-10-07'][0].art, 'rechnung');
});

test('eintraegeProTag: Termine mit Uhrzeit kommen vor denen ohne, sortiert nach Zeit', () => {
  const m = eintraegeProTag({
    termine: [
      { id: 'a', titel: 'ohne', faellig_am: '2026-10-05', uhrzeit: null, erledigt: false },
      { id: 'b', titel: 'spaet', faellig_am: '2026-10-05', uhrzeit: '15:00', erledigt: false },
      { id: 'c', titel: 'frueh', faellig_am: '2026-10-05', uhrzeit: '08:30', erledigt: false },
    ], todos: [], rechnungen: [],
  });
  assert.deepEqual(m['2026-10-05'].map((e) => e.titel), ['frueh', 'spaet', 'ohne']);
});
