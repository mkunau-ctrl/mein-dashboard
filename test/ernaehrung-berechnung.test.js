import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tageImZeitraum, letzteErledigungVor, tagesStatus,
  streak, quoteProPunkt, prognose, heatmapDaten,
} from '../js/module/ernaehrung/berechnung.js';

const item = (o) => ({
  id: o.id, label: o.id, kategorie: 'ernaehrung', pflicht: o.pflicht ?? true,
  aktiv: true, plan_typ: o.plan_typ ?? 'taeglich',
  plan_wochentage: o.plan_wochentage ?? null,
  plan_intervall_tage: o.plan_intervall_tage ?? null,
  sortierung: o.sortierung ?? 0,
  erstellt_am: o.erstellt_am ?? '2026-01-01T00:00:00Z',
});
const log = (datum, item_id, erledigt = true) => ({ datum, item_id, erledigt });

test('tageImZeitraum inkl. Enden', () => {
  assert.deepEqual(tageImZeitraum('2026-09-08', '2026-09-10'),
    ['2026-09-08', '2026-09-09', '2026-09-10']);
});

test('letzteErledigungVor findet das jüngste erledigte Datum davor', () => {
  const logs = [log('2026-09-01', 'a'), log('2026-09-05', 'a'),
                log('2026-09-07', 'a', false), log('2026-09-09', 'a')];
  assert.equal(letzteErledigungVor('a', '2026-09-09', logs), '2026-09-05');
  assert.equal(letzteErledigungVor('a', '2026-09-02', logs), '2026-09-01');
  assert.equal(letzteErledigungVor('a', '2026-08-01', logs), null);
});

test('tagesStatus: keine fälligen Pflicht-Punkte -> keine', () => {
  const items = [item({ id: 'x', plan_typ: 'wochentage', plan_wochentage: [1] })];
  assert.equal(tagesStatus('2026-09-08', items, []), 'keine'); // Di
});

test('tagesStatus: alle erledigt -> erfuellt', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' })];
  const logs = [log('2026-09-09', 'a'), log('2026-09-09', 'b')];
  assert.equal(tagesStatus('2026-09-09', items, logs), 'erfuellt');
});

test('tagesStatus: teils erledigt -> teilweise; nichts -> offen', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' })];
  assert.equal(tagesStatus('2026-09-09', items, [log('2026-09-09', 'a')]), 'teilweise');
  assert.equal(tagesStatus('2026-09-09', items, []), 'offen');
});

test('tagesStatus ignoriert Nicht-Pflicht-Punkte', () => {
  const items = [item({ id: 'a' }), item({ id: 'b', pflicht: false })];
  assert.equal(tagesStatus('2026-09-09', items, [log('2026-09-09', 'a')]), 'erfuellt');
});

test('streak: aktuelle und längste Serie', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const logs = ['2026-09-01', '2026-09-02', '2026-09-04', '2026-09-05', '2026-09-06']
    .map((d) => log(d, 'a'));
  const r = streak(items, logs, '2026-09-07'); // bewertet bis 06.
  assert.equal(r.aktuell, 3);   // 4,5,6
  assert.equal(r.laengste, 3);
});

test('streak: gebrochen wenn gestern offen', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const logs = [log('2026-09-01', 'a'), log('2026-09-02', 'a')];
  const r = streak(items, logs, '2026-09-05'); // 3.,4. offen
  assert.equal(r.aktuell, 0);
  assert.equal(r.laengste, 2);
});

test('quoteProPunkt: fällige vs. erledigte Tage', () => {
  const items = [
    item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z', sortierung: 1 }),
    item({ id: 'l', plan_typ: 'wochentage', plan_wochentage: [1],
           erstellt_am: '2026-09-01T00:00:00Z', sortierung: 2 }),
  ];
  const logs = [
    ...['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05'].map((d) => log(d, 'a')),
    log('2026-09-07', 'l'), // 07.09. ist der fällige Montag
  ];
  const r = quoteProPunkt(items, logs, '2026-09-08');
  const a = r.find((x) => x.itemId === 'a');
  const l = r.find((x) => x.itemId === 'l');
  assert.equal(a.faelligeTage, 7);   // 01.-07.09., täglich
  assert.equal(a.erledigteTage, 5);
  assert.equal(l.faelligeTage, 1);   // nur Mo 07.09.
  assert.equal(l.erledigteTage, 1);
  assert.equal(l.quote, 1);
});

test('quoteProPunkt: zeitraumTage begrenzt', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-01-01T00:00:00Z', sortierung: 1 })];
  const logs = [log('2026-09-06', 'a'), log('2026-09-07', 'a')];
  const r = quoteProPunkt(items, logs, '2026-09-08', 3); // 05,06,07
  assert.equal(r[0].faelligeTage, 3);
  assert.equal(r[0].erledigteTage, 2);
});

test('prognose: Quote der letzten Tage hochgerechnet', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-08-01T00:00:00Z' })];
  const logs = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04',
                '2026-09-05', '2026-09-06', '2026-09-07'].map((d) => log(d, 'a'));
  const r = prognose(items, logs, '2026-09-15', 14, 30);
  assert.equal(r.quote, 0.5);
  assert.equal(r.erwartet, 15);
  assert.equal(r.zielTage, 30);
});

test('heatmapDaten: Status je Tag, Zukunft abgeschnitten', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const logs = [log('2026-09-01', 'a')];
  const r = heatmapDaten(2026, 9, items, logs);
  assert.equal(r[0].datum, '2026-09-01');
  assert.equal(r[0].status, 'erfuellt');
  assert.ok(r.length <= 30);
  assert.ok(r.every((x) => x.datum <= '2026-09-30'));
});
