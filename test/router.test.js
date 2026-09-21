import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/router.js';

test('leerer Hash -> nichts', () => {
  assert.deepEqual(parseHash(''), { modul: null, unterseite: null, detail: null });
  assert.deepEqual(parseHash('#/'), { modul: null, unterseite: null, detail: null });
});

test('Modul ohne Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung'), { modul: 'ernaehrung', unterseite: null, detail: null });
});

test('Modul mit Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik'),
    { modul: 'ernaehrung', unterseite: 'statistik', detail: null });
});

test('unbekannte Formen -> nichts', () => {
  assert.deepEqual(parseHash('#quatsch'), { modul: null, unterseite: null, detail: null });
});

test('dritte Ebene wird erkannt', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik/extra'),
    { modul: 'ernaehrung', unterseite: 'statistik', detail: 'extra' });
});

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
