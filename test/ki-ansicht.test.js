import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NUR_ANSICHT_SCHLUESSEL, leseNurAnsicht, speichereNurAnsicht, letzteNachrichten, kurzfassung,
} from '../js/module/ki/ansicht.js';

function fakeSpeicher() {
  const daten = new Map();
  return {
    getItem: (k) => (daten.has(k) ? daten.get(k) : null),
    setItem: (k, v) => { daten.set(k, String(v)); },
    removeItem: (k) => { daten.delete(k); },
  };
}

test('leseNurAnsicht: Standard ist aus, auch ohne Speicher oder mit null', () => {
  assert.equal(leseNurAnsicht(fakeSpeicher()), false);
  assert.equal(leseNurAnsicht(undefined), false);
  assert.equal(leseNurAnsicht(null), false);
});

test('speichereNurAnsicht: an und aus bleiben erhalten', () => {
  const speicher = fakeSpeicher();
  speichereNurAnsicht(speicher, true);
  assert.equal(speicher.getItem(NUR_ANSICHT_SCHLUESSEL), '1');
  assert.equal(leseNurAnsicht(speicher), true);
  speichereNurAnsicht(speicher, false);
  assert.equal(leseNurAnsicht(speicher), false);
});

test('Speicher, der wirft, bringt die Ansicht nicht zum Absturz', () => {
  const kaputt = {
    getItem() { throw new Error('gesperrt'); },
    setItem() { throw new Error('gesperrt'); },
    removeItem() { throw new Error('gesperrt'); },
  };
  assert.equal(leseNurAnsicht(kaputt), false);
  assert.doesNotThrow(() => speichereNurAnsicht(kaputt, true));
  assert.doesNotThrow(() => speichereNurAnsicht(kaputt, false));
});

test('letzteNachrichten: nimmt die letzten n, aendert das Original nicht', () => {
  const verlauf = [1, 2, 3, 4];
  assert.deepEqual(letzteNachrichten(verlauf, 2), [3, 4]);
  assert.deepEqual(verlauf, [1, 2, 3, 4]);
  assert.deepEqual(letzteNachrichten(verlauf, 10), [1, 2, 3, 4]);
});

test('letzteNachrichten: leere Liste, null und ungueltiges n', () => {
  assert.deepEqual(letzteNachrichten([], 2), []);
  assert.deepEqual(letzteNachrichten(null, 2), []);
  assert.deepEqual(letzteNachrichten([1, 2], 0), []);
  assert.deepEqual(letzteNachrichten([1, 2], -1), []);
});

test('kurzfassung: kurzer Text bleibt, langer wird an der Grenze gekuerzt', () => {
  assert.deepEqual(kurzfassung('Hallo'), { text: 'Hallo', gekuerzt: false });
  const lang = 'a'.repeat(281);
  const ergebnis = kurzfassung(lang);
  assert.equal(ergebnis.gekuerzt, true);
  assert.equal(ergebnis.text, `${'a'.repeat(280)} …`);
  assert.equal(kurzfassung('a'.repeat(280)).gekuerzt, false);
});

test('kurzfassung: null, Zahl und <script> bleiben harmloser Text', () => {
  assert.deepEqual(kurzfassung(null), { text: '', gekuerzt: false });
  assert.deepEqual(kurzfassung(42), { text: '', gekuerzt: false });
  assert.equal(kurzfassung('<script>alert(1)</script>').text, '<script>alert(1)</script>');
});
