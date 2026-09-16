import { test } from 'node:test';
import assert from 'node:assert/strict';
import { naechsteFaelligkeit, sortiereOffeneTodos, istUeberfaellig }
  from '../js/module/todos/planung.js';

test('taeglich: naechster Tag', () => {
  const v = { plan_typ: 'taeglich' };
  assert.equal(naechsteFaelligkeit(v, '2026-09-16'), '2026-09-17');
});

test('wochentage: naechster Tag aus der Liste, auch ueber die Woche hinweg', () => {
  const v = { plan_typ: 'wochentage', plan_wochentage: [1, 4] }; // Mo, Do
  assert.equal(naechsteFaelligkeit(v, '2026-09-16'), '2026-09-17'); // Mi -> Do
  assert.equal(naechsteFaelligkeit(v, '2026-09-17'), '2026-09-21'); // Do -> naechster Mo
});

test('monatlich: naechster Monatstag, Folgemonat wenn ueberschritten', () => {
  const v = { plan_typ: 'monatlich', plan_tag_im_monat: 15 };
  assert.equal(naechsteFaelligkeit(v, '2026-09-01'), '2026-09-15');
  assert.equal(naechsteFaelligkeit(v, '2026-09-15'), '2026-10-15');
});

test('monatlich: Tag existiert im Zielmonat nicht -> Monatsletzter', () => {
  const v = { plan_typ: 'monatlich', plan_tag_im_monat: 31 };
  assert.equal(naechsteFaelligkeit(v, '2026-01-31'), '2026-02-28');
});

test('istUeberfaellig: nur wenn faellig vor heute und nicht erledigt', () => {
  assert.equal(istUeberfaellig({ faellig: '2026-09-01', erledigt: false }, '2026-09-16'), true);
  assert.equal(istUeberfaellig({ faellig: '2026-09-01', erledigt: true }, '2026-09-16'), false);
  assert.equal(istUeberfaellig({ faellig: '2026-09-20', erledigt: false }, '2026-09-16'), false);
  assert.equal(istUeberfaellig({ faellig: null, erledigt: false }, '2026-09-16'), false);
});

test('sortiereOffeneTodos: ueberfaellig (aelteste zuerst), dann nach Faelligkeit, ohne Datum zuletzt', () => {
  const todos = [
    { id: 'a', faellig: '2026-09-20', erstellt_am: '2026-09-01T00:00:00Z' },
    { id: 'b', faellig: null, erstellt_am: '2026-09-02T00:00:00Z' },
    { id: 'c', faellig: '2026-09-10', erstellt_am: '2026-09-03T00:00:00Z' },
    { id: 'd', faellig: '2026-09-05', erstellt_am: '2026-09-04T00:00:00Z' },
  ];
  const sortiert = sortiereOffeneTodos(todos, '2026-09-16').map((t) => t.id);
  assert.deepEqual(sortiert, ['d', 'c', 'a', 'b']);
});
