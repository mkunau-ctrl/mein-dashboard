import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus }
  from '../js/module/sendungen/berechnung.js';

const sendungen = [
  { haendler: 'Hermes', status: 'zugestellt' },
  { haendler: 'DHL', status: 'unterwegs' },
  { haendler: 'Amazon', status: 'unbekannt' },
];

test('sortiereSendungen: unterwegs vor unbekannt vor zugestellt', () => {
  assert.deepEqual(sortiereSendungen(sendungen).map((s) => s.haendler),
    ['DHL', 'Amazon', 'Hermes']);
});

test('offeneSendungen: zaehlt alles ausser zugestellt', () => {
  assert.equal(offeneSendungen(sendungen), 2);
});

test('sortiereTermine: nur offene, nach Faelligkeit aufsteigend', () => {
  const termine = [
    { titel: 'B', faellig_am: '2026-10-01', erledigt: false },
    { titel: 'A', faellig_am: '2026-09-20', erledigt: false },
    { titel: 'C', faellig_am: '2026-09-01', erledigt: true },
  ];
  assert.deepEqual(sortiereTermine(termine).map((t) => t.titel), ['A', 'B']);
});

test('naechsterSendungStatus: zyklisch unterwegs -> zugestellt -> unterwegs, unbekannt -> unterwegs', () => {
  assert.equal(naechsterSendungStatus('unterwegs'), 'zugestellt');
  assert.equal(naechsterSendungStatus('zugestellt'), 'unterwegs');
  assert.equal(naechsterSendungStatus('unbekannt'), 'unterwegs');
});
