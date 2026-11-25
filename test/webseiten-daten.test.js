import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEBSEITEN, GRUPPEN, istSichereUrl, kurzeAdresse, gruppiere,
} from '../js/module/webseiten/daten.js';

test('alle Einträge haben Name, sichere URL und bekannte Gruppe', () => {
  const gruppen = new Set(GRUPPEN.map((g) => g.id));
  for (const s of WEBSEITEN) {
    assert.ok(s.name && s.name.trim(), `Name fehlt: ${s.url}`);
    assert.ok(istSichereUrl(s.url), `unsichere URL: ${s.url}`);
    assert.ok(gruppen.has(s.gruppe), `unbekannte Gruppe bei ${s.name}`);
  }
});

test('keine doppelten Adressen', () => {
  const urls = WEBSEITEN.map((s) => s.url.replace(/\/$/, '').toLowerCase());
  assert.equal(new Set(urls).size, urls.length);
});

test('istSichereUrl lässt nur http und https zu', () => {
  assert.equal(istSichereUrl('https://a.de'), true);
  assert.equal(istSichereUrl('http://a.de'), true);
  assert.equal(istSichereUrl('javascript:alert(1)'), false);
  assert.equal(istSichereUrl('data:text/html,x'), false);
  assert.equal(istSichereUrl('kaputt'), false);
  assert.equal(istSichereUrl(null), false);
});

test('kurzeAdresse zeigt Host und Pfad ohne Protokoll', () => {
  assert.equal(kurzeAdresse('https://portal-start.vercel.app/dashboard'), 'portal-start.vercel.app/dashboard');
  assert.equal(kurzeAdresse('https://www.doenerexpress-lemgo.de/'), 'www.doenerexpress-lemgo.de');
});

test('gruppiere ohne Suche gibt alle Gruppen in fester Reihenfolge', () => {
  const g = gruppiere();
  assert.deepEqual(g.map((x) => x.id), ['apps', 'kunden', 'weitere']);
  assert.equal(g.reduce((n, x) => n + x.eintraege.length, 0), WEBSEITEN.length);
});

test('gruppiere filtert nach Name, Adresse und Hinweis, ohne Groß/Klein', () => {
  assert.deepEqual(gruppiere(WEBSEITEN, 'MISTER').flatMap((g) => g.eintraege.map((e) => e.name)), ['Mister X Jagd']);
  assert.ok(gruppiere(WEBSEITEN, 'netlify.app').length === 1);
  assert.ok(gruppiere(WEBSEITEN, 'akquise').flatMap((g) => g.eintraege).length >= 2);
  assert.deepEqual(gruppiere(WEBSEITEN, 'gibt-es-nicht-xyz'), []);
});

test('gruppiere blendet Einträge mit unsicherer URL aus', () => {
  const liste = [
    { gruppe: 'apps', name: 'Gut', url: 'https://gut.de' },
    { gruppe: 'apps', name: 'Böse', url: 'javascript:alert(1)' },
  ];
  assert.deepEqual(gruppiere(liste).flatMap((g) => g.eintraege.map((e) => e.name)), ['Gut']);
});
