import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wetterUrl, wettercodeZuText, istCacheGueltig, tageAusAntwort } from '../js/module/home/wetter-logik.js';

test('wetterUrl: enthaelt Koordinaten, Tage und Zeitzone', () => {
  const url = wetterUrl(52.0333, 8.9, 3);
  assert.ok(url.startsWith('https://api.open-meteo.com/v1/forecast?'));
  assert.ok(url.includes('latitude=52.0333'));
  assert.ok(url.includes('longitude=8.9'));
  assert.ok(url.includes('forecast_days=3'));
  assert.ok(url.includes('timezone=Europe/Berlin'));
  assert.ok(url.includes('daily=temperature_2m_max,temperature_2m_min,weathercode'));
});

test('wettercodeZuText: bekannte Codes und Fallback', () => {
  assert.equal(wettercodeZuText(0).text, 'Klar');
  assert.equal(wettercodeZuText(61).text, 'Regen');
  assert.equal(wettercodeZuText(95).text, 'Gewitter');
  assert.equal(wettercodeZuText(12345).text, 'Sonstiges');
  assert.ok(wettercodeZuText(0).symbol);
});

test('istCacheGueltig: unter 30 Minuten gueltig, danach nicht', () => {
  const jetzt = 1_000_000_000_000;
  assert.equal(istCacheGueltig(jetzt - 29 * 60 * 1000, jetzt), true);
  assert.equal(istCacheGueltig(jetzt - 30 * 60 * 1000, jetzt), false);
  assert.equal(istCacheGueltig(undefined, jetzt), false);
  assert.equal(istCacheGueltig(jetzt + 5000, jetzt), false);
});

test('tageAusAntwort: baut Tagesliste, ungueltige Antwort ergibt null', () => {
  const antwort = { daily: { time: ['2026-09-29', '2026-09-30'], temperature_2m_max: [18.4, 16.2],
    temperature_2m_min: [9.1, 8.7], weathercode: [0, 61] } };
  const tage = tageAusAntwort(antwort);
  assert.equal(tage.length, 2);
  assert.deepEqual(tage[0], { datum: '2026-09-29', max: 18, min: 9, code: 0 });
  assert.equal(tage[1].code, 61);
  assert.equal(tageAusAntwort({}), null);
  assert.equal(tageAusAntwort(null), null);
});
