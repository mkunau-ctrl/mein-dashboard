import { test } from 'node:test';
import assert from 'node:assert/strict';
import { warenwert, sortiereTeile, merkliste, naechsterStatus }
  from '../js/module/lager/berechnung.js';

const teile = [
  { bezeichnung: 'Display iPhone 15', bestand: 2, einzelwert: 60, status: 'da' },
  { bezeichnung: 'Akku iPhone 13', bestand: 0, einzelwert: 25, status: 'fehlt' },
  { bezeichnung: 'Rückglas iPhone 14', bestand: 1, einzelwert: 15, status: 'bestellt' },
  { bezeichnung: 'Schraubenset', bestand: 5, status: 'da' }, // kein einzelwert
];

test('warenwert: Summe bestand mal einzelwert, fehlender Wert zaehlt als 0', () => {
  assert.equal(warenwert(teile), 2 * 60 + 0 * 25 + 1 * 15 + 5 * 0);
});

test('sortiereTeile: fehlt vor bestellt vor da, sonst alphabetisch', () => {
  const namen = sortiereTeile(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, [
    'Akku iPhone 13', 'Rückglas iPhone 14', 'Display iPhone 15', 'Schraubenset',
  ]);
});

test('merkliste: nur status != da', () => {
  const namen = merkliste(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, ['Akku iPhone 13', 'Rückglas iPhone 14']);
});

test('naechsterStatus: zyklisch fehlt -> bestellt -> da -> fehlt', () => {
  assert.equal(naechsterStatus('fehlt'), 'bestellt');
  assert.equal(naechsterStatus('bestellt'), 'da');
  assert.equal(naechsterStatus('da'), 'fehlt');
});
