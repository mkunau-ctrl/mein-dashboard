import { test } from 'node:test';
import assert from 'node:assert/strict';
import { baueBaeume } from '../js/module/ki/baum.js';

function aufgabe(id, elternId, status, erstellt) {
  return { id, eltern_id: elternId, status, erstellt_am: erstellt, eingabe: `Eingabe ${id}` };
}

test('baueBaeume: Wurzel mit Kindern, Kinder bleiben zugeordnet', () => {
  const baum = baueBaeume([
    aufgabe('a', null, 'COMPLETED', '2026-11-21T10:00:00Z'),
    aufgabe('b', 'a', 'RUNNING', '2026-11-21T10:01:00Z'),
    aufgabe('c', 'a', 'QUEUED', '2026-11-21T10:02:00Z'),
  ]);
  assert.equal(baum.length, 1);
  assert.equal(baum[0].id, 'a');
  assert.deepEqual(baum[0].kinder.map((k) => k.id), ['b', 'c']);
});

test('baueBaeume: offene/laufende Wurzeln vor abgeschlossenen, danach neueste zuerst', () => {
  const baum = baueBaeume([
    aufgabe('alt', null, 'COMPLETED', '2026-11-21T08:00:00Z'),
    aufgabe('neu', null, 'COMPLETED', '2026-11-21T11:00:00Z'),
    aufgabe('laeuft', null, 'RUNNING', '2026-11-21T09:00:00Z'),
    aufgabe('wartet', null, 'QUEUED', '2026-11-21T10:00:00Z'),
  ]);
  assert.deepEqual(baum.map((a) => a.id), ['laeuft', 'wartet', 'neu', 'alt']);
});

test('baueBaeume: verwaiste Kinder werden eigene Wurzel', () => {
  const baum = baueBaeume([
    aufgabe('kind', 'fehlt', 'RUNNING', '2026-11-21T10:00:00Z'),
    aufgabe('wurzel', null, 'COMPLETED', '2026-11-21T10:00:00Z'),
  ]);
  assert.equal(baum.length, 2);
  assert.deepEqual(baum.map((a) => a.id), ['kind', 'wurzel']);
  assert.deepEqual(baum[0].kinder, []);
});

test('baueBaeume: Zyklus erzeugt keine Endlosschleife, jede Aufgabe genau einmal', () => {
  const baum = baueBaeume([
    aufgabe('a', 'b', 'RUNNING', '2026-11-21T10:00:00Z'),
    aufgabe('b', 'a', 'RUNNING', '2026-11-21T10:00:00Z'),
    aufgabe('c', 'b', 'QUEUED', '2026-11-21T10:00:00Z'),
  ]);
  const ids = [];
  const sammle = (knoten) => { ids.push(knoten.id); knoten.kinder.forEach(sammle); };
  baum.forEach(sammle);
  assert.deepEqual(ids.sort(), ['a', 'b', 'c']);
  assert.equal(new Set(ids).size, 3);
});

test('baueBaeume: leere Liste, null und Eintraege ohne id', () => {
  assert.deepEqual(baueBaeume([]), []);
  assert.deepEqual(baueBaeume(null), []);
  const baum = baueBaeume([{ status: 'RUNNING' }, null]);
  assert.equal(baum.length, 1);
  assert.equal(baum[0].status, 'RUNNING');
});

test('baueBaeume: Kinder werden ebenfalls sortiert', () => {
  const baum = baueBaeume([
    aufgabe('w', null, 'RUNNING', '2026-11-21T10:00:00Z'),
    aufgabe('k1', 'w', 'COMPLETED', '2026-11-21T10:03:00Z'),
    aufgabe('k2', 'w', 'RUNNING', '2026-11-21T10:01:00Z'),
    aufgabe('k3', 'w', 'QUEUED', '2026-11-21T10:02:00Z'),
  ]);
  assert.deepEqual(baum[0].kinder.map((k) => k.id), ['k2', 'k3', 'k1']);
});
