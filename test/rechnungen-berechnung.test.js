import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istUeberfaellig, sortiereRechnungen, summeOffenerRechnungen }
  from '../js/module/rechnungen/berechnung.js';

const rechnungen = [
  { id: 'r1', haendler: 'E.ON', betrag: 148.32, faellig_am: '2026-08-29', status: 'offen' },
  { id: 'r2', haendler: 'Telekom', betrag: 39.95, faellig_am: '2026-09-05', status: 'offen' },
  { id: 'r3', haendler: 'Fitnessstudio', betrag: 24.90, faellig_am: '2026-09-15', status: 'bezahlt', bezahlt_am: '2026-09-10' },
  { id: 'r4', haendler: 'Internet', betrag: 29.99, faellig_am: '2026-10-05', status: 'offen' },
];

test('istUeberfaellig: offen und Faelligkeit vor heute', () => {
  assert.equal(istUeberfaellig(rechnungen[0], '2026-09-21'), true);
  assert.equal(istUeberfaellig(rechnungen[3], '2026-09-21'), false);
  assert.equal(istUeberfaellig(rechnungen[2], '2026-09-21'), false);
});

test('sortiereRechnungen: ueberfaellige (nach Faelligkeit) vor offenen (nach Faelligkeit) vor bezahlten (nach bezahlt_am absteigend)', () => {
  const namen = sortiereRechnungen(rechnungen, '2026-09-21').map((r) => r.haendler);
  assert.deepEqual(namen, ['E.ON', 'Telekom', 'Internet', 'Fitnessstudio']);
});

test('summeOffenerRechnungen: nur status offen', () => {
  assert.equal(summeOffenerRechnungen(rechnungen), 148.32 + 39.95 + 29.99);
});
