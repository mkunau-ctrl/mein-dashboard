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
