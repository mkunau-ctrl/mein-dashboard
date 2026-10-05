import test from 'node:test';
import assert from 'node:assert/strict';
import { zaehleUngelesen, zeitText, badgeText } from '../js/glocke-berechnung.js';

test('zaehleUngelesen', () => {
  assert.equal(zaehleUngelesen([{ gelesen: false }, { gelesen: true }, { gelesen: false }]), 2);
  assert.equal(zaehleUngelesen([]), 0);
});

test('badgeText: leer bei 0, 9+ ab 10', () => {
  assert.equal(badgeText(0), '');
  assert.equal(badgeText(3), '3');
  assert.equal(badgeText(9), '9');
  assert.equal(badgeText(10), '9+');
});

test('zeitText: relative Angaben', () => {
  const jetzt = Date.parse('2026-10-05T12:00:00Z');
  const vor = (min) => new Date(jetzt - min * 60000).toISOString();
  assert.equal(zeitText(vor(0), jetzt), 'gerade eben');
  assert.equal(zeitText(vor(5), jetzt), 'vor 5 Min.');
  assert.equal(zeitText(vor(180), jetzt), 'vor 3 Std.');
  assert.equal(zeitText(vor(30 * 60), jetzt), 'gestern');
  assert.match(zeitText(vor(5 * 24 * 60), jetzt), /^\d{2}\.\d{2}\.?$/);
});
