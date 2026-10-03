import test from 'node:test';
import assert from 'node:assert/strict';
import { formatiereGroesse, sichererPfad, sortiereDateien } from '../js/module/dateien/berechnung.js';

test('formatiereGroesse', () => {
  assert.equal(formatiereGroesse(0), '0 B');
  assert.equal(formatiereGroesse(900), '900 B');
  assert.equal(formatiereGroesse(1536), '1,5 KB');
  assert.equal(formatiereGroesse(5 * 1024 * 1024), '5,0 MB');
});

test('sichererPfad: Ordner = user_id, Sonderzeichen raus, eindeutig', () => {
  const p = sichererPfad('u1', 'Mein Foto (1).png', 'abc');
  assert.equal(p, 'u1/abc-Mein_Foto_1.png');
  assert.equal(sichererPfad('u1', 'Rechnung äöü.pdf', 'abc'), 'u1/abc-Rechnung_aou.pdf');
  assert.equal(sichererPfad('u1', '../../etc/passwd', 'abc'), 'u1/abc-passwd');
  assert.match(p, /^u1\/abc-[A-Za-z0-9._-]+$/);
  assert.ok(p.endsWith('.png'));
  assert.ok(!p.includes(' '));
  assert.equal(sichererPfad('u1', '', 'x'), 'u1/x-datei');
});

test('sortiereDateien: neueste zuerst', () => {
  const l = sortiereDateien([{ erstellt_am: '2026-10-01T10:00:00Z' }, { erstellt_am: '2026-10-03T10:00:00Z' }]);
  assert.equal(l[0].erstellt_am, '2026-10-03T10:00:00Z');
});
