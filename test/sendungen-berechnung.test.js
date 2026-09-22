import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus, STATUS_PRIORITAET, istStatusFortschritt, kategorisiereSendungIcon }
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

test('istStatusFortschritt: unbekannte neue Kategorie ist nie ein Fortschritt', () => {
  assert.equal(istStatusFortschritt('unterwegs', 'unbekannt'), false);
});

test('istStatusFortschritt: von unbekanntem/fehlendem Bestand ist jede erkannte Kategorie ein Fortschritt', () => {
  assert.equal(istStatusFortschritt('unbekannt', 'unterwegs'), true);
  assert.equal(istStatusFortschritt(null, 'abholbereit'), true);
  assert.equal(istStatusFortschritt(undefined, 'zugestellt'), true);
});

test('istStatusFortschritt: bewegt sich nur vorwaerts', () => {
  assert.equal(istStatusFortschritt('abholbereit', 'unterwegs'), false);
  assert.equal(istStatusFortschritt('zugestellt', 'unterwegs'), false);
  assert.equal(istStatusFortschritt('unterwegs', 'abholbereit'), true);
  assert.equal(istStatusFortschritt('unterwegs', 'unterwegs'), true);
});

test('istStatusFortschritt: unbekannter Fremdwert im Bestand blockiert nicht dauerhaft', () => {
  assert.equal(istStatusFortschritt('irgendwas_fremdes', 'unterwegs'), true);
});

test('kategorisiereSendungIcon: erkennt Handy/Kopfhoerer/Kleidung/Elektronik, sonst Box', () => {
  assert.equal(kategorisiereSendungIcon('iPhone 15 Pro'), 'handy');
  assert.equal(kategorisiereSendungIcon('AirPods Pro'), 'kopfhoerer');
  assert.equal(kategorisiereSendungIcon('T-Shirt'), 'kleidung');
  assert.equal(kategorisiereSendungIcon('Grafikkarte'), 'elektronik');
  assert.equal(kategorisiereSendungIcon('Irgendwas Unbekanntes'), 'box');
  assert.equal(kategorisiereSendungIcon(''), 'box');
});
