import test from 'node:test';
import assert from 'node:assert/strict';
import { baueMeldungen, inRuhezeit, minutenAusUhrzeit } from '../supabase/functions/push-senden/logik.js';

const basis = { termine: [], todos: [], rechnungen: [], sendungen: [], funde: [], heute: '2026-10-03', minuten: 9 * 60, jetztMs: Date.parse('2026-10-03T07:00:00Z') };
const mit = (teil) => baueMeldungen({ ...basis, ...teil });

test('minutenAusUhrzeit', () => {
  assert.equal(minutenAusUhrzeit('14:30'), 870);
  assert.equal(minutenAusUhrzeit('7:05'), 425);
  assert.equal(minutenAusUhrzeit('abends'), null);
  assert.equal(minutenAusUhrzeit(null), null);
});

test('inRuhezeit: normal und ueber Mitternacht', () => {
  assert.equal(inRuhezeit(23 * 60, '22:00', '07:00'), true);
  assert.equal(inRuhezeit(3 * 60, '22:00', '07:00'), true);
  assert.equal(inRuhezeit(12 * 60, '22:00', '07:00'), false);
  assert.equal(inRuhezeit(13 * 60, '12:00', '14:00'), true);
  assert.equal(inRuhezeit(15 * 60, '12:00', '14:00'), false);
});

test('Termin mit Uhrzeit: nur im Fenster 0-60 Min vorher', () => {
  const t = { id: 'a', titel: 'Zahnarzt', faellig_am: '2026-10-03', uhrzeit: '09:45', ort: 'Lemgo', erledigt: false };
  const m = mit({ termine: [t] });
  assert.equal(m.length, 1);
  assert.equal(m[0].kategorie, 'termine');
  assert.equal(m[0].schluessel, 'termin:a:2026-10-03:09:45');
  assert.match(m[0].titel, /09:45/);
  assert.equal(mit({ termine: [{ ...t, uhrzeit: '11:00' }] }).length, 0);
  assert.equal(mit({ termine: [{ ...t, uhrzeit: '08:30' }] }).length, 0);
  assert.equal(mit({ termine: [{ ...t, erledigt: true }] }).length, 0);
});

test('Termin ohne Uhrzeit: ab 8 Uhr am Tag selbst', () => {
  const t = { id: 'b', titel: 'Abgabe', faellig_am: '2026-10-03', uhrzeit: null, erledigt: false };
  assert.equal(mit({ termine: [t] }).length, 1);
  assert.equal(mit({ termine: [t], minuten: 7 * 60 }).length, 0);
  assert.equal(mit({ termine: [{ ...t, faellig_am: '2026-10-04' }] }).length, 0);
});

test('To-do: heute faellig und ueberfaellig', () => {
  const heute = { id: 'c', text: 'Müll', faellig: '2026-10-03', erledigt: false };
  const alt = { id: 'd', text: 'Steuer', faellig: '2026-10-01', erledigt: false };
  const m = mit({ todos: [heute, alt, { id: 'e', text: 'x', faellig: null, erledigt: false }, { ...heute, id: 'f', erledigt: true }] });
  assert.equal(m.length, 2);
  assert.ok(m.every((x) => x.kategorie === 'termine'));
  assert.ok(m.find((x) => x.schluessel === 'todo:d:ueberfaellig'));
});

test('Rechnung: bald faellig (0-2 Tage) und ueberfaellig, bezahlte nie', () => {
  const r = (id, f, status = 'offen') => ({ id, haendler: 'Strom', betrag: 50, faellig_am: f, status });
  const m = mit({ rechnungen: [r('1', '2026-10-05'), r('2', '2026-10-09'), r('3', '2026-10-01'), r('4', '2026-10-03', 'bezahlt')] });
  assert.deepEqual(m.map((x) => x.schluessel).sort(), ['rechnung:1:bald', 'rechnung:3:ueberfaellig']);
  assert.ok(m.every((x) => x.kategorie === 'rechnungen'));
});

test('Sendung: zugestellt in den letzten 24h, alte nicht', () => {
  const s = (id, std) => ({ id, haendler: 'Amazon', beschreibung: 'Kabel', status: 'zugestellt', letzte_aktualisierung: new Date(basis.jetztMs - std * 3600e3).toISOString(), abholcode: null });
  const m = mit({ sendungen: [s('1', 2), s('2', 30)] });
  assert.equal(m.length, 1);
  assert.equal(m[0].schluessel, 'sendung:1:zugestellt');
});

test('Funde: nur neue der letzten 3h, mehrere werden gebuendelt', () => {
  const f = (id, std) => ({ id, titel: 'iPhone 14', preis: 300, ort: 'Köln', status: 'neu', erstellt_am: new Date(basis.jetztMs - std * 3600e3).toISOString() });
  const einer = mit({ funde: [f('1', 1), f('2', 5)] });
  assert.equal(einer.length, 1);
  assert.equal(einer[0].schluessel, 'fund:1');
  const zwei = mit({ funde: [f('1', 1), f('3', 2)] });
  assert.equal(zwei.length, 1);
  assert.match(zwei[0].titel, /2/);
  assert.equal(mit({ funde: [{ ...f('4', 1), status: 'verworfen' }] }).length, 0);
});

import { zaehleOffen } from '../supabase/functions/push-senden/logik.js';
test('zaehleOffen: Termine heute + To-dos bis heute + Rechnungen bis in 2 Tagen', () => {
  const n = zaehleOffen({
    heute: '2026-10-03',
    termine: [{ faellig_am: '2026-10-03', erledigt: false }, { faellig_am: '2026-10-04', erledigt: false }],
    todos: [{ faellig: '2026-10-02', erledigt: false }, { faellig: '2026-10-09', erledigt: false }, { faellig: '2026-10-03', erledigt: true }],
    rechnungen: [{ faellig_am: '2026-10-05', status: 'offen' }, { faellig_am: '2026-10-05', status: 'bezahlt' }],
  });
  assert.equal(n, 3);
});
