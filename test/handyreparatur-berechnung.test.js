import { test } from 'node:test';
import assert from 'node:assert/strict';
import { naechsterAuftragStatus, erwarteterGewinn, istGewinnImMonat, sortiereAuftraege }
  from '../js/module/handyreparatur/berechnung.js';

test('naechsterAuftragStatus: zyklisch offen -> fertig -> verkauft -> offen', () => {
  assert.equal(naechsterAuftragStatus('offen'), 'fertig');
  assert.equal(naechsterAuftragStatus('fertig'), 'verkauft');
  assert.equal(naechsterAuftragStatus('verkauft'), 'offen');
});

test('erwarteterGewinn: Summe (voraussichtlicher Verkaufspreis minus Warenwert) ueber offene Auftraege mit hinterlegtem Preis', () => {
  const auftraege = [
    { status: 'offen', warenwert: 305, voraussichtlicher_verkaufspreis: 370 },
    { status: 'fertig', warenwert: 450, voraussichtlicher_verkaufspreis: 550 },
    { status: 'offen', warenwert: 200, voraussichtlicher_verkaufspreis: null },
    { status: 'verkauft', warenwert: 130, voraussichtlicher_verkaufspreis: 160 },
  ];
  assert.equal(erwarteterGewinn(auftraege), (370 - 305) + (550 - 450));
});

test('istGewinnImMonat: Summe (tatsaechlicher Verkaufspreis minus Warenwert) ueber im Monat verkaufte Auftraege', () => {
  const auftraege = [
    { status: 'verkauft', warenwert: 130, tatsaechlicher_verkaufspreis: 160, verkauft_am: '2026-09-15' },
    { status: 'verkauft', warenwert: 200, tatsaechlicher_verkaufspreis: 220, verkauft_am: '2026-08-01' },
    { status: 'offen', warenwert: 305, tatsaechlicher_verkaufspreis: null, verkauft_am: null },
  ];
  assert.equal(istGewinnImMonat(auftraege, 2026, 9), 160 - 130);
});

test('sortiereAuftraege: offen vor fertig vor verkauft, sonst neueste zuerst', () => {
  const auftraege = [
    { id: 'a1', status: 'verkauft', erstellt_am: '2026-09-01T00:00:00Z' },
    { id: 'a2', status: 'offen', erstellt_am: '2026-09-05T00:00:00Z' },
    { id: 'a3', status: 'fertig', erstellt_am: '2026-09-03T00:00:00Z' },
    { id: 'a4', status: 'offen', erstellt_am: '2026-09-10T00:00:00Z' },
  ];
  const ids = sortiereAuftraege(auftraege).map((a) => a.id);
  assert.deepEqual(ids, ['a4', 'a2', 'a3', 'a1']);
});
