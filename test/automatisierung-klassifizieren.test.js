import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKlassifikation } from '../automatisierung/klassifizieren.js';

test('parseKlassifikation: gueltiger Beleg', () => {
  const ergebnis = parseKlassifikation(
    '{"typ":"beleg","haendler":"REWE","betrag":12.5,"datum":"2026-09-10","kategorie":"lebensmittel"}');
  assert.deepEqual(ergebnis, {
    typ: 'beleg', haendler: 'REWE', betrag: 12.5, datum: '2026-09-10', kategorie: 'lebensmittel',
  });
});

test('parseKlassifikation: entfernt Markdown-Codeblock', () => {
  const ergebnis = parseKlassifikation('```json\n{"typ":"sonstiges"}\n```');
  assert.equal(ergebnis.typ, 'sonstiges');
});

test('parseKlassifikation: Sendung ohne Haendler ist unvollstaendig', () => {
  assert.throws(() => parseKlassifikation('{"typ":"sendung","trackingnummer":"123"}'), /unvollständig/);
});

test('parseKlassifikation: Termin ohne Faelligkeit ist unvollstaendig', () => {
  assert.throws(() => parseKlassifikation('{"typ":"termin","titel":"Pruefung"}'), /unvollständig/);
});

test('parseKlassifikation: unbekannter Typ wirft Fehler', () => {
  assert.throws(() => parseKlassifikation('{"typ":"werbung"}'), /Unbekannter Typ/);
});

test('parseKlassifikation: kein JSON wirft Fehler', () => {
  assert.throws(() => parseKlassifikation('Das ist keine Werbung.'), /kein gültiges JSON/);
});
