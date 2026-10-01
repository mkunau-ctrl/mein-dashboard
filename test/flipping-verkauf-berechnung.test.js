import test from 'node:test';
import assert from 'node:assert/strict';
import { teileKaufinteresse, gruppenNachKategorie } from '../js/module/flipping/verkauf-berechnung.js';

test('teileKaufinteresse trennt kaufinteresse von Rest', () => {
  const nachrichten = [
    { id: 1, status: 'beantwortet', kaufinteresse: false },
    { id: 2, status: 'kaufinteresse', kaufinteresse: false },
    { id: 3, status: 'eskaliert_offen', kaufinteresse: true },
  ];
  const { kaufinteresse, rest } = teileKaufinteresse(nachrichten);
  assert.deepEqual(kaufinteresse.map((n) => n.id), [2, 3]);
  assert.deepEqual(rest.map((n) => n.id), [1]);
});

test('gruppenNachKategorie gruppiert und laesst leere Gruppen weg', () => {
  const r = gruppenNachKategorie([
    { anzeige_kategorie: 'Matratzenschoner', id: 1 },
    { anzeige_kategorie: 'Matratzenschoner', id: 2 },
    { anzeige_kategorie: 'Handyteile', id: 3 },
  ]);
  assert.deepEqual(r.map(([kat]) => kat), ['Matratzenschoner', 'Handyteile']);
  assert.equal(r[0][1].length, 2);
});
