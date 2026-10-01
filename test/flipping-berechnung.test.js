import test from 'node:test';
import assert from 'node:assert/strict';
import { naechsterFundStatus, sortiereFunde, neueFunde, sicherHttp } from '../js/module/flipping/berechnung.js';

test('naechsterFundStatus laeuft im Kreis', () => {
  assert.equal(naechsterFundStatus('neu'), 'angeschrieben');
  assert.equal(naechsterFundStatus('verworfen'), 'neu');
});

test('sortiereFunde: neu zuerst, dann nach Datum absteigend', () => {
  const r = sortiereFunde([
    { status: 'verworfen', erstellt_am: '2026-10-03' },
    { status: 'neu', erstellt_am: '2026-10-01' },
    { status: 'neu', erstellt_am: '2026-10-02' },
  ]);
  assert.deepEqual(r.map((f) => f.erstellt_am), ['2026-10-02', '2026-10-01', '2026-10-03']);
});

test('neueFunde zaehlt nur Status neu', () => {
  assert.equal(neueFunde([{ status: 'neu' }, { status: 'gekauft' }]), 1);
});

test('sicherHttp laesst nur http(s) durch', () => {
  assert.equal(sicherHttp('https://a.de/x'), 'https://a.de/x');
  assert.equal(sicherHttp('javascript:alert(1)'), '#');
});
