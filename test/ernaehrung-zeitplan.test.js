import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wochentagVon, istFaellig } from '../js/module/ernaehrung/zeitplan.js';

const basis = { erstellt_am: '2026-01-01T00:00:00Z' };

test('wochentagVon: Mo=1 .. So=7', () => {
  assert.equal(wochentagVon('2026-09-07'), 1); // Montag
  assert.equal(wochentagVon('2026-09-13'), 7); // Sonntag
});

test('taeglich ist immer fällig', () => {
  assert.equal(istFaellig({ ...basis, plan_typ: 'taeglich' }, '2026-09-09'), true);
});

test('wochentage: nur an gelisteten Tagen', () => {
  const leber = { ...basis, plan_typ: 'wochentage', plan_wochentage: [1, 4] };
  assert.equal(istFaellig(leber, '2026-09-07'), true);  // Mo
  assert.equal(istFaellig(leber, '2026-09-10'), true);  // Do
  assert.equal(istFaellig(leber, '2026-09-08'), false); // Di
});

test('intervall: nie erledigt -> fällig', () => {
  const d3 = { ...basis, plan_typ: 'intervall', plan_intervall_tage: 5 };
  assert.equal(istFaellig(d3, '2026-09-09', { letzteErledigung: null }), true);
});

test('intervall: vor Ablauf nicht fällig, ab Tag N wieder fällig', () => {
  const d3 = { ...basis, plan_typ: 'intervall', plan_intervall_tage: 5 };
  assert.equal(istFaellig(d3, '2026-09-13', { letzteErledigung: '2026-09-10' }), false); // 3 Tage
  assert.equal(istFaellig(d3, '2026-09-15', { letzteErledigung: '2026-09-10' }), true);  // 5 Tage
  assert.equal(istFaellig(d3, '2026-09-20', { letzteErledigung: '2026-09-10' }), true);  // überfällig
});

test('vor erstellt_am nie fällig', () => {
  const neu = { erstellt_am: '2026-09-09T12:00:00Z', plan_typ: 'taeglich' };
  assert.equal(istFaellig(neu, '2026-09-08'), false);
  assert.equal(istFaellig(neu, '2026-09-09'), true);
});
