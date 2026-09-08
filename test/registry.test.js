import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registriere, alleModule, holeModul, leereRegistry } from '../js/registry.js';

beforeEach(() => leereRegistry());

test('registriertes Modul ist auffindbar', () => {
  registriere({ id: 'ernaehrung', titel: 'Ernährung' });
  assert.equal(holeModul('ernaehrung').titel, 'Ernährung');
  assert.equal(alleModule().length, 1);
});

test('Reihenfolge bleibt erhalten', () => {
  registriere({ id: 'a', titel: 'A' });
  registriere({ id: 'b', titel: 'B' });
  assert.deepEqual(alleModule().map((m) => m.id), ['a', 'b']);
});

test('doppelte id überschreibt nicht, sondern wirft', () => {
  registriere({ id: 'a', titel: 'A' });
  assert.throws(() => registriere({ id: 'a', titel: 'A2' }));
});
