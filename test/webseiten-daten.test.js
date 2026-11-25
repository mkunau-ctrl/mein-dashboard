import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEBSEITEN, GRUPPEN, istSichereUrl, kurzeAdresse, unterseitenUrl, gruppiere,
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

test('alle Unterseiten ergeben eine sichere Adresse auf demselben Host, ohne Doppelte', () => {
  for (const s of WEBSEITEN) {
    const gesehen = new Set();
    for (const u of s.unterseiten ?? []) {
      assert.ok(u.name && u.name.trim(), `Name fehlt bei Unterseite von ${s.name}`);
      const voll = unterseitenUrl(s.url, u.pfad);
      assert.ok(voll, `Unterseite ungültig: ${s.name} ${u.pfad}`);
      assert.ok(istSichereUrl(voll));
      assert.equal(new URL(voll).host, new URL(s.url).host);
      assert.ok(!gesehen.has(voll), `doppelte Unterseite: ${voll}`);
      gesehen.add(voll);
    }
  }
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

test('unterseitenUrl baut die Adresse und lehnt fremde Hosts ab', () => {
  assert.equal(unterseitenUrl('https://a.de', '/x/y.html'), 'https://a.de/x/y.html');
  assert.equal(unterseitenUrl('https://a.de/start', 'kontakt.html'), 'https://a.de/kontakt.html');
  assert.equal(unterseitenUrl('https://a.de', 'https://boese.de/x'), null);
  assert.equal(unterseitenUrl('https://a.de', '//boese.de/x'), null);
  assert.equal(unterseitenUrl('kaputt', '/x'), null);
});

test('gruppiere ohne Suche gibt alle Gruppen in fester Reihenfolge und alle Unterseiten', () => {
  const g = gruppiere();
  assert.deepEqual(g.map((x) => x.id), ['apps', 'kunden', 'weitere']);
  assert.equal(g.reduce((n, x) => n + x.eintraege.length, 0), WEBSEITEN.length);
  const visio = g.flatMap((x) => x.eintraege).find((e) => e.name === 'Visiomedia');
  assert.equal(visio.unterseiten.length, 17);
  assert.ok(visio.unterseiten.every((u) => u.url.startsWith('https://visiomedia-website.vercel.app/')));
});

test('gruppiere filtert nach Name, Adresse und Hinweis, ohne Groß/Klein', () => {
  assert.deepEqual(gruppiere(WEBSEITEN, 'MISTER').flatMap((g) => g.eintraege.map((e) => e.name)), ['Mister X Jagd']);
  assert.ok(gruppiere(WEBSEITEN, 'netlify.app').length === 1);
  assert.ok(gruppiere(WEBSEITEN, 'akquise').flatMap((g) => g.eintraege).length >= 2);
  assert.deepEqual(gruppiere(WEBSEITEN, 'gibt-es-nicht-xyz'), []);
});

test('Suche findet auch Unterseiten und zeigt dann nur die passenden', () => {
  const treffer = gruppiere(WEBSEITEN, 'quibic').flatMap((g) => g.eintraege);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].name, 'Visiomedia');
  assert.deepEqual(treffer[0].unterseiten.map((u) => u.name), ['Projekt: Quibic']);
  // Trifft der Name der Webseite, bleiben alle Unterseiten erhalten.
  const alle = gruppiere(WEBSEITEN, 'visiomedia').flatMap((g) => g.eintraege).find((e) => e.name === 'Visiomedia');
  assert.equal(alle.unterseiten.length, 17);
});

test('gruppiere blendet Einträge und Unterseiten mit unsicherer URL aus', () => {
  const liste = [
    { gruppe: 'apps', name: 'Gut', url: 'https://gut.de', unterseiten: [{ name: 'ok', pfad: '/a' }, { name: 'fremd', pfad: 'https://boese.de' }] },
    { gruppe: 'apps', name: 'Böse', url: 'javascript:alert(1)' },
  ];
  const ergebnis = gruppiere(liste).flatMap((g) => g.eintraege);
  assert.deepEqual(ergebnis.map((e) => e.name), ['Gut']);
  assert.deepEqual(ergebnis[0].unterseiten.map((u) => u.name), ['ok']);
});
