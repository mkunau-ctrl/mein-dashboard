import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/router.js';

test('leerer Hash -> nichts', () => {
  assert.deepEqual(parseHash(''), { modul: null, unterseite: null });
  assert.deepEqual(parseHash('#/'), { modul: null, unterseite: null });
});

test('Modul ohne Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung'), { modul: 'ernaehrung', unterseite: null });
});

test('Modul mit Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik'),
    { modul: 'ernaehrung', unterseite: 'statistik' });
});

test('unbekannte Formen -> nichts', () => {
  assert.deepEqual(parseHash('#quatsch'), { modul: null, unterseite: null });
});

test('dritte Ebene wird ignoriert', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik/extra'),
    { modul: 'ernaehrung', unterseite: 'statistik' });
});
