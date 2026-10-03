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
  assert.equal(treffer[0].ziel, '#/sendungen/termine/te1');
});

test('sucheAlles: Treffer zeigen auf Detailrouten mit ID', () => {
  const treffer = sucheAlles(zustand, 'netflix');
  const todo = treffer.find((t) => t.typ === 'todo');
  const sendung = treffer.find((t) => t.typ === 'sendung');
  assert.equal(todo.ziel, '#/todos/erledigt/t2');
  assert.equal(sendung.ziel, '#/sendungen/pakete/s1');
});

test('sucheAlles: findet Notizen in Titel und Text, ohne notizen im Zustand kein Fehler', () => {
  const mitNotizen = { ...zustand, notizen: [{ id: 'n1', titel: 'Ideen', text: 'Kamera-Glas bestellen' }, { id: 'n2', titel: 'Kamera', text: '' }] };
  const t = sucheAlles(mitNotizen, 'kamera');
  assert.deepEqual(t.map((x) => x.typ), ['notiz', 'notiz']);
  assert.equal(t[0].ziel, '#/notizen/n1');
  assert.doesNotThrow(() => sucheAlles(zustand, 'netflix'));
});
