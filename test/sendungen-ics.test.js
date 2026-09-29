import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zuIcsDatei } from '../js/module/sendungen/ics.js';

const JETZT = new Date('2026-09-29T10:00:00Z');

test('zuIcsDatei: gueltiger Rahmen mit CRLF und ein VEVENT pro Eintrag', () => {
  const s = zuIcsDatei([{ titel: 'A', datum: '2026-10-07' }, { titel: 'B', datum: '2026-10-08' }], JETZT);
  assert.ok(s.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(s.endsWith('END:VCALENDAR\r\n'));
  assert.equal(s.split('BEGIN:VEVENT').length - 1, 2);
});

test('zuIcsDatei: Termin ohne Uhrzeit ist ganztaegig mit DTEND am Folgetag', () => {
  const s = zuIcsDatei([{ titel: 'Jungschar', datum: '2026-10-31' }], JETZT);
  assert.ok(s.includes('DTSTART;VALUE=DATE:20261031'));
  assert.ok(s.includes('DTEND;VALUE=DATE:20261101'));
});

test('zuIcsDatei: Uhrzeit ergibt Zeittermin von einer Stunde, Ort und Notiz werden uebernommen', () => {
  const s = zuIcsDatei([{ titel: 'Arzt', datum: '2026-10-05', uhrzeit: '14:30', ort: 'Hauptstr. 1, Wien', notiz: 'Karte mitbringen' }], JETZT);
  assert.ok(s.includes('DTSTART:20261005T143000'));
  assert.ok(s.includes('DTEND:20261005T153000'));
  assert.ok(s.includes('LOCATION:Hauptstr. 1\\, Wien'));
  assert.ok(s.includes('DESCRIPTION:Karte mitbringen'));
});

test('zuIcsDatei: UID ist stabil (gleicher Termin, gleicher Export) und unterscheidet Termine', () => {
  const a = zuIcsDatei([{ titel: 'A', datum: '2026-10-07' }], JETZT);
  const b = zuIcsDatei([{ titel: 'A', datum: '2026-10-07' }], new Date('2027-01-01T00:00:00Z'));
  const c = zuIcsDatei([{ titel: 'A', datum: '2026-10-08' }], JETZT);
  const uid = (t) => /UID:(\S+)/.exec(t)[1];
  assert.equal(uid(a), uid(b));
  assert.notEqual(uid(a), uid(c));
});

test('zuIcsDatei: Sonderzeichen werden maskiert, lange Zeilen gefaltet', () => {
  const s = zuIcsDatei([{ titel: 'a;b,c\\d\ne', datum: '2026-10-07', notiz: 'x'.repeat(200) }], JETZT);
  assert.ok(s.includes('SUMMARY:a\\;b\\,c\\\\d\\ne'));
  for (const zeile of s.split('\r\n')) assert.ok(zeile.length <= 75);
});

test('zuIcsDatei: ungueltige Uhrzeit faellt auf ganztaegig zurueck', () => {
  const s = zuIcsDatei([{ titel: 'X', datum: '2026-10-07', uhrzeit: 'abends' }], JETZT);
  assert.ok(s.includes('DTSTART;VALUE=DATE:20261007'));
});
