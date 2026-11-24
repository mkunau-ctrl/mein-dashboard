import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROFILE, zielGroesse, zielFps, formatiereGroesse, formatiereDauer, ersparnisText,
  videoPfad, sortiereVideos, schaetzeGroesse, effektiveBitrates, MAX_UPLOAD_BYTES, ZIEL_BYTES,
} from '../js/module/videos/berechnung.js';

test('zielGroesse: skaliert 1080p-Querformat auf 720p, gerade Zahlen', () => {
  assert.deepEqual(zielGroesse(1920, 1080, 720), { breite: 1280, hoehe: 720, skaliert: true });
});

test('zielGroesse: Hochkant (iPhone) begrenzt die kurze Seite', () => {
  const g = zielGroesse(1080, 1920, 720);
  assert.deepEqual(g, { breite: 720, hoehe: 1280, skaliert: true });
});

test('zielGroesse: nie hochskalieren', () => {
  assert.deepEqual(zielGroesse(640, 360, 720), { breite: 640, hoehe: 360, skaliert: false });
});

test('zielGroesse: ungerade Werte werden gerade, ungueltig = null', () => {
  const g = zielGroesse(853, 481, 480);
  assert.equal(g.breite % 2, 0);
  assert.equal(g.hoehe % 2, 0);
  assert.equal(zielGroesse(0, 100, 480), null);
  assert.equal(zielGroesse(NaN, 100, 480), null);
});

test('zielFps: nicht mehr als das Original', () => {
  assert.equal(zielFps(24, 30), 24);
  assert.equal(zielFps(24, 10), 10);
  assert.equal(zielFps(15, 59.94), 15);
  assert.equal(zielFps(15, undefined), 15);
});

test('formatiereGroesse und formatiereDauer', () => {
  assert.equal(formatiereGroesse(512), '512 B');
  assert.equal(formatiereGroesse(1536), '1,5 KB');
  assert.equal(formatiereGroesse(5 * 1024 * 1024), '5,0 MB');
  assert.equal(formatiereGroesse(-1), '–');
  assert.equal(formatiereDauer(65), '1:05');
  assert.equal(formatiereDauer(3725), '1:02:05');
  assert.equal(formatiereDauer(NaN), '–');
});

test('ersparnisText', () => {
  assert.equal(ersparnisText(100, 8), '−92 %');
  assert.equal(ersparnisText(100, 120), 'nicht kleiner');
  assert.equal(ersparnisText(0, 5), '');
});

test('videoPfad: Ordner, UUID, bereinigter Name, Endung', () => {
  assert.equal(videoPfad('u1', 'Mein Video (äöü).MOV', 'abc', 'mp4'), 'u1/abc-Mein_Video_aou.mp4');
  assert.equal(videoPfad('u1', '../../evil.mov', 'abc', 'webm'), 'u1/abc-evil.webm');
  assert.equal(videoPfad('u1', '', 'abc', ''), 'u1/abc-video.mp4');
  assert.ok(!videoPfad('u1', 'a b.mov', 'x', 'mp4').includes(' '));
});

test('sortiereVideos: neueste zuerst, ohne das Original zu aendern', () => {
  const v = [{ erstellt_am: '2026-11-01' }, { erstellt_am: '2026-11-03' }];
  assert.equal(sortiereVideos(v)[0].erstellt_am, '2026-11-03');
  assert.equal(v[0].erstellt_am, '2026-11-01');
});

test('effektiveBitrates: kurzes Video bleibt unveraendert', () => {
  const b = effektiveBitrates(120, PROFILE.lesbar);
  assert.equal(b.videoBitrate, PROFILE.lesbar.videoBitrate);
  assert.equal(b.gedrosselt, false);
});

test('effektiveBitrates: 10 Minuten Lesbar werden gedrosselt und bleiben unter dem Limit', () => {
  assert.ok(schaetzeGroesse(600, PROFILE.lesbar) > MAX_UPLOAD_BYTES); // ungedrosselt zu gross
  const b = effektiveBitrates(600, PROFILE.lesbar);
  assert.equal(b.gedrosselt, true);
  assert.equal(b.zu_lang, false);
  assert.ok(b.videoBitrate < PROFILE.lesbar.videoBitrate);
  assert.ok(schaetzeGroesse(600, b) <= ZIEL_BYTES);
});

test('effektiveBitrates: extrem lange Videos werden als zu lang markiert', () => {
  const b = effektiveBitrates(4 * 3600, PROFILE.lesbar);
  assert.equal(b.zu_lang, true);
  assert.equal(b.videoBitrate, 120_000);
});

test('schaetzeGroesse: ohne Dauer null', () => {
  assert.equal(schaetzeGroesse(0, PROFILE.lesbar), null);
});
