import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/router.js';

test('leerer Hash -> kein Modul', () => {
  assert.deepEqual(parseHash(''), { modul: null });
  assert.deepEqual(parseHash('#/'), { modul: null });
});

test('Modul-Hash wird erkannt', () => {
  assert.deepEqual(parseHash('#/ernaehrung'), { modul: 'ernaehrung' });
});

test('unbekannte Formen -> kein Modul', () => {
  assert.deepEqual(parseHash('#quatsch'), { modul: null });
  assert.deepEqual(parseHash('#/ernaehrung/extra'), { modul: 'ernaehrung' });
});
