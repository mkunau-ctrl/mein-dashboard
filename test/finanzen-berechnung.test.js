import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kontostand, summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus, unechterKontostand }
  from '../js/module/finanzen/berechnung.js';

const expenses = [
  { betrag: 20, kategorie: 'tanken', datum: '2026-09-01' },
  { betrag: 50, kategorie: 'lebensmittel', datum: '2026-09-05' },
  { betrag: 15, kategorie: 'lebensmittel', datum: '2026-09-10' },
  { betrag: 100, kategorie: 'tanken', datum: '2026-08-20' }, // vor stand_datum
];

test('kontostand: Start minus Summe seit stand_datum bis heute', () => {
  const settings = { kontostand_start: 500, stand_datum: '2026-09-01' };
  assert.equal(kontostand(settings, expenses, '2026-09-16'), 500 - 20 - 50 - 15);
});

test('kontostand: Ausgaben nach "heute" zaehlen nicht', () => {
  const settings = { kontostand_start: 500, stand_datum: '2026-09-01' };
  assert.equal(kontostand(settings, expenses, '2026-09-04'), 500 - 20);
});

test('summeProMonat: nur der angegebene Monat', () => {
  assert.equal(summeProMonat(expenses, 2026, 9), 20 + 50 + 15);
  assert.equal(summeProMonat(expenses, 2026, 8), 100);
});

test('summenProKategorie: absteigend sortiert, nur der Monat', () => {
  assert.deepEqual(summenProKategorie(expenses, 2026, 9), [
    { kategorie: 'lebensmittel', summe: 65 },
    { kategorie: 'tanken', summe: 20 },
  ]);
});

test('erkenneAbos: erkennt monatlich wiederkehrende gleiche Notiz', () => {
  const abo = [
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-07-15' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-08-14' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-09-15' },
  ];
  const ergebnis = erkenneAbos(abo);
  assert.equal(ergebnis.length, 1);
  assert.equal(ergebnis[0].haendler, 'Netflix');
  assert.equal(ergebnis[0].betrag, 15.99);
});

test('erkenneAbos: ignoriert unregelmaessige Abstaende', () => {
  const unregelmaessig = [
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-01-05' },
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-06-20' },
  ];
  assert.deepEqual(erkenneAbos(unregelmaessig), []);
});

test('erkenneAbos: ignoriert einmalige Ausgaben ohne Wiederholung', () => {
  assert.deepEqual(erkenneAbos([
    { betrag: 50, kategorie: 'lebensmittel', notiz: 'Rewe', datum: '2026-09-01' },
  ]), []);
});

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

test('unechterKontostand: echter Kontostand plus Warenwert', () => {
  const settings = { kontostand_start: 500, stand_datum: '2026-09-01' };
  const expenses = [{ betrag: 20, kategorie: 'tanken', datum: '2026-09-05' }];
  // echter Kontostand: 500 - 20 = 480; Warenwert der 4 Testteile: 2*60+0*25+1*15+5*0 = 135
  assert.equal(unechterKontostand(settings, expenses, teile, '2026-09-16'), 480 + 135);
});
