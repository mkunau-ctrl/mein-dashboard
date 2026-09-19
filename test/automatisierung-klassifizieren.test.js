import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseKlassifikation, kategorisiereStatus, baustePrompt } from '../automatisierung/klassifizieren.js';

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

test('kategorisiereStatus: erkennt zugestellt', () => {
  assert.equal(kategorisiereStatus('Ihre Sendung wurde zugestellt.'), 'zugestellt');
  assert.equal(kategorisiereStatus('Paket erfolgreich ausgeliefert'), 'zugestellt');
});

test('kategorisiereStatus: erkennt abholbereit', () => {
  assert.equal(kategorisiereStatus('Ihr Paket liegt zur Abholung bereit.'), 'abholbereit');
  assert.equal(kategorisiereStatus('in der Packstation hinterlegt und abholbereit'), 'abholbereit');
});

test('kategorisiereStatus: erkennt unterwegs', () => {
  assert.equal(kategorisiereStatus('Die Sendung ist unterwegs zu Ihnen.'), 'unterwegs');
  assert.equal(kategorisiereStatus('befindet sich im Sortierzentrum'), 'unterwegs');
});

test('kategorisiereStatus: Paketshop-Abgabe ist abholbereit, nicht zugestellt', () => {
  assert.equal(kategorisiereStatus('Ihr Paket wurde im Paketshop abgegeben.'), 'abholbereit');
});

test('kategorisiereStatus: "liegt zur Abholung bereit" ist abholbereit, auch wenn "zugestellt" im Satz vorkommt', () => {
  assert.equal(kategorisiereStatus('Konnte nicht zugestellt werden, liegt zur Abholung bereit.'), 'abholbereit');
});

test('kategorisiereStatus: kein Treffer oder leer -> unbekannt', () => {
  assert.equal(kategorisiereStatus('Vielen Dank für Ihre Bestellung.'), 'unbekannt');
  assert.equal(kategorisiereStatus(null), 'unbekannt');
  assert.equal(kategorisiereStatus(undefined), 'unbekannt');
});

test('baustePrompt: enthaelt die neuen optionalen Sendungsfelder', () => {
  const prompt = baustePrompt();
  for (const feld of ['statusText', 'ort', 'abholcode', 'abholadresse', 'abholzeiten']) {
    assert.ok(prompt.includes(feld), `Prompt sollte "${feld}" erwaehnen`);
  }
});
