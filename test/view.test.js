import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entscheideAnsicht } from '../js/view.js';

test('ohne Session -> login', () => {
  assert.equal(entscheideAnsicht(null), 'login');
  assert.equal(entscheideAnsicht(undefined), 'login');
});

test('mit Session -> dashboard', () => {
  assert.equal(entscheideAnsicht({ user: { id: 'abc' } }), 'dashboard');
});
