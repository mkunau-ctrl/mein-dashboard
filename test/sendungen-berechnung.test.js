import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus, STATUS_PRIORITAET }
  from '../js/module/sendungen/berechnung.js';

const sendungen = [
  { haendler: 'Hermes', status: 'zugestellt' },
  { haendler: 'DHL', status: 'unterwegs' },
  { haendler: 'Amazon', status: 'unbekannt' },
  { haendler: 'DPD', status: 'abholbereit' },
];

test('sortiereSendungen: unterwegs vor abholbereit vor unbekannt vor zugestellt', () => {
  assert.deepEqual(sortiereSendungen(sendungen).map((s) => s.haendler),
    ['DHL', 'DPD', 'Amazon', 'Hermes']);
});

test('offeneSendungen: zaehlt alles ausser zugestellt', () => {
  assert.equal(offeneSendungen(sendungen), 3);
});

test('sortiereTermine: nur offene, nach Faelligkeit aufsteigend', () => {
  const termine = [
    { titel: 'B', faellig_am: '2026-10-01', erledigt: false },
    { titel: 'A', faellig_am: '2026-09-20', erledigt: false },
    { titel: 'C', faellig_am: '2026-09-01', erledigt: true },
  ];
  assert.deepEqual(sortiereTermine(termine).map((t) => t.titel), ['A', 'B']);
});

test('naechsterSendungStatus: zyklisch unterwegs -> abholbereit -> zugestellt -> unterwegs, unbekannt -> unterwegs', () => {
  assert.equal(naechsterSendungStatus('unterwegs'), 'abholbereit');
  assert.equal(naechsterSendungStatus('abholbereit'), 'zugestellt');
  assert.equal(naechsterSendungStatus('zugestellt'), 'unterwegs');
  assert.equal(naechsterSendungStatus('unbekannt'), 'unterwegs');
});

test('STATUS_PRIORITAET: unterwegs < abholbereit < unbekannt < zugestellt', () => {
  assert.ok(STATUS_PRIORITAET.unterwegs < STATUS_PRIORITAET.abholbereit);
  assert.ok(STATUS_PRIORITAET.abholbereit < STATUS_PRIORITAET.unbekannt);
  assert.ok(STATUS_PRIORITAET.unbekannt < STATUS_PRIORITAET.zugestellt);
});
