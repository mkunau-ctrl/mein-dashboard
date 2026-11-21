import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENTEN, CHAT_AGENTEN, istChatbar, statusInfo, aufgabenStatusInfo,
  istOffline, vorZeit, kuerze,
} from '../js/module/ki/status.js';

const JETZT = Date.parse('2026-11-21T12:00:00Z');

test('statusInfo: Agentenstatus wird deutsch, mit Farbe und Symbol', () => {
  assert.deepEqual(statusInfo('arbeitet'), { text: 'arbeitet', farbe: 'gruen', symbol: '●' });
  assert.deepEqual(statusInfo('wartet'), { text: 'wartet', farbe: 'gelb', symbol: '◐' });
  assert.deepEqual(statusInfo('fehler'), { text: 'Fehler', farbe: 'rot', symbol: '!' });
  assert.deepEqual(statusInfo('aus'), { text: 'aus', farbe: 'grau', symbol: '○' });
});

test('statusInfo: null/unbekannt faellt auf grau zurueck, wirft nicht', () => {
  assert.deepEqual(statusInfo(null), { text: 'unbekannt', farbe: 'grau', symbol: '·' });
  const info = statusInfo('voellig-neu');
  assert.equal(info.text, 'voellig-neu');
  assert.equal(info.farbe, 'grau');
});

test('aufgabenStatusInfo: alle neun Aufgabenstatus sind abgedeckt', () => {
  for (const status of ['CREATED', 'QUEUED', 'ASSIGNED', 'RUNNING', 'REVIEW',
    'COMPLETED', 'FAILED', 'RETRY_PENDING', 'BLOCKED', 'CANCELLED']) {
    const info = aufgabenStatusInfo(status);
    assert.ok(info.text && info.farbe && info.symbol, `Status ${status} unvollstaendig`);
  }
  assert.equal(aufgabenStatusInfo('RUNNING').farbe, 'gruen');
  assert.equal(aufgabenStatusInfo('FAILED').farbe, 'rot');
  assert.equal(aufgabenStatusInfo(null).farbe, 'grau');
});

test('istChatbar: monitor darf nicht chatten, die acht anderen schon', () => {
  assert.equal(CHAT_AGENTEN.length, 8);
  assert.equal(AGENTEN.length, 9);
  assert.equal(istChatbar('monitor'), false);
  assert.equal(istChatbar('orchestrator'), true);
  assert.equal(istChatbar('unbekannt'), false);
});

test('istOffline: null, kaputtes Datum und aelter als 90 s gelten als offline', () => {
  assert.equal(istOffline(null, JETZT), true);
  assert.equal(istOffline('kein-datum', JETZT), true);
  assert.equal(istOffline(new Date(JETZT - 89_000).toISOString(), JETZT), false);
  assert.equal(istOffline(new Date(JETZT - 91_000).toISOString(), JETZT), true);
});

test('vorZeit: Sekunden, Minuten, Stunden, Tage und Zukunft', () => {
  const iso = (sekunden) => new Date(JETZT - sekunden * 1000).toISOString();
  assert.equal(vorZeit(iso(0), JETZT), 'gerade eben');
  assert.equal(vorZeit(iso(5), JETZT), '5 s');
  assert.equal(vorZeit(iso(180), JETZT), '3 min');
  assert.equal(vorZeit(iso(7200), JETZT), '2 h');
  assert.equal(vorZeit(iso(2 * 86400), JETZT), '2 Tage');
  assert.equal(vorZeit(iso(-30), JETZT), 'gerade eben');
  assert.equal(vorZeit(null, JETZT), 'unbekannt');
});

test('kuerze: kuerzt lange Texte, normalisiert Zeilenumbrueche, null bleibt leer', () => {
  assert.equal(kuerze('  Hallo\nWelt  ', 40), 'Hallo Welt');
  assert.equal(kuerze('abcdefghij', 5), 'abcde…');
  assert.equal(kuerze('', 5), '');
  assert.equal(kuerze(null, 5), '');
  assert.equal(kuerze('<script>alert(1)</script>', 40), '<script>alert(1)</script>');
});
