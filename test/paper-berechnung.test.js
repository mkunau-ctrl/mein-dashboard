import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  gewinnVerlust, sortierePositionen, positionProzent, formatBetrag, kurvenPunkte, PAPER_START,
} from '../js/module/finanzen/paper-berechnung.js';

test('gewinnVerlust: Betrag und Prozent gegen Startkapital', () => {
  assert.deepEqual(gewinnVerlust(105000), { betrag: 5000, prozent: 5 });
  assert.deepEqual(gewinnVerlust(95000), { betrag: -5000, prozent: -5 });
  assert.equal(gewinnVerlust(PAPER_START).betrag, 0);
});

test('sortierePositionen: nach Marktwert absteigend, mutiert nicht', () => {
  const eingabe = [{ symbol: 'A', market_value: '100' }, { symbol: 'B', market_value: '300' }, { symbol: 'C' }];
  assert.deepEqual(sortierePositionen(eingabe).map((p) => p.symbol), ['B', 'A', 'C']);
  assert.equal(eingabe[0].symbol, 'A');
  assert.deepEqual(sortierePositionen(null), []);
});

test('positionProzent: Bruchteil wird zu Prozent, ungueltig wird 0', () => {
  assert.equal(positionProzent({ unrealized_plpc: '0.05' }), 5);
  assert.equal(positionProzent({ unrealized_plpc: 'x' }), 0);
  assert.equal(positionProzent({}), 0);
});

test('formatBetrag: deutsche Schreibweise', () => {
  assert.equal(formatBetrag(1234.5), '1.234,50');
});

test('kurvenPunkte: leer unter 2 Werten, sonst aelteste zuerst und im Rahmen', () => {
  assert.equal(kurvenPunkte([{ erstellt_am: '2026-11-24T10:00:00Z', equity: 100000 }]), '');
  const punkte = kurvenPunkte([
    { erstellt_am: '2026-11-24T12:00:00Z', equity: 101000 },
    { erstellt_am: '2026-11-24T10:00:00Z', equity: 100000 },
  ], 100, 50).split(' ');
  assert.equal(punkte.length, 2);
  assert.ok(punkte[0].startsWith('0.0,'));
  assert.ok(punkte[1].startsWith('100.0,'));
  const y0 = Number(punkte[0].split(',')[1]);
  const y1 = Number(punkte[1].split(',')[1]);
  assert.ok(y1 < y0); // hoeherer Wert = weiter oben
});
