import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GEMEINSAM, gueltigerAgent, hashText, parseTags, parseNotiz, baueNotiz, dateiName, pfadFuer,
  extrahiereLinks, notizAusDatei, planeSync,
} from '../js/module/agenten/obsidian.js';

const notiz = (o = {}) => ({
  titel: 'Mindestpreise', agent: 'flipping', tags: ['regel', 'flipping'], status: 'aktiv',
  vertrauen: 'eigen', quelle: 'obsidian', inhalt: '16 Pro mindestens 450 EUR.\nSiehe [[Preislogik]].', ...o,
});

test('hashText: stabil, unterscheidet Inhalte, ignoriert Zeilenende-Unterschiede', () => {
  assert.equal(hashText('abc'), hashText('abc'));
  assert.notEqual(hashText('abc'), hashText('abd'));
  assert.equal(hashText('a\r\nb'), hashText('a\nb'));
  assert.match(hashText('x'), /^[0-9a-f]{14}$/);
});

test('gueltigerAgent', () => {
  assert.equal(gueltigerAgent('flipping'), true);
  assert.equal(gueltigerAgent(GEMEINSAM), true);
  assert.equal(gueltigerAgent('A'), false);
  assert.equal(gueltigerAgent('../x'), false);
  assert.equal(gueltigerAgent(''), false);
});

test('parseTags: Liste in eckigen Klammern, Raute, Duplikate', () => {
  assert.deepEqual(parseTags('[regel, #flipping, regel]'), ['regel', 'flipping']);
  assert.deepEqual(parseTags(''), []);
});

test('baueNotiz und parseNotiz: Runde ergibt dieselbe Notiz', () => {
  const text = baueNotiz(notiz());
  const { meta, inhalt } = parseNotiz(text);
  assert.equal(meta.titel, 'Mindestpreise');
  assert.equal(meta.agent, 'flipping');
  assert.deepEqual(meta.tags, ['regel', 'flipping']);
  assert.equal(meta.status, 'aktiv');
  assert.equal(inhalt, '16 Pro mindestens 450 EUR.\nSiehe [[Preislogik]].');
  assert.equal(baueNotiz(notizAusDatei('Agenten/flipping/Mindestpreise.md', text)), text);
});

test('parseNotiz: Tags als Aufzählung und Datei ohne Kopfzeile', () => {
  const a = parseNotiz('---\ntitel: X\ntags:\n  - a\n  - b\n---\nText');
  assert.deepEqual(a.meta.tags, ['a', 'b']);
  assert.equal(a.inhalt, 'Text');
  const b = parseNotiz('Nur Text\nzweite Zeile');
  assert.deepEqual(b.meta, {});
  assert.equal(b.inhalt, 'Nur Text\nzweite Zeile');
});

test('notizAusDatei: Agent und Titel aus Pfad, wenn die Kopfzeile fehlt; ungültige Werte fallen zurück', () => {
  const n = notizAusDatei('Agenten/trading/Haltedauer.md', 'Text');
  assert.equal(n.agent, 'trading');
  assert.equal(n.titel, 'Haltedauer');
  assert.equal(n.status, 'aktiv');
  assert.equal(n.quelle, 'obsidian');
  const k = notizAusDatei('Agenten/x/y.md', '---\nstatus: kaputt\nvertrauen: egal\n---\nT');
  assert.equal(k.status, 'aktiv');
  assert.equal(k.vertrauen, 'eigen');
});

test('dateiName und pfadFuer: verbotene Zeichen raus, nie leer', () => {
  assert.equal(dateiName('Regel: A/B? "x"'), 'Regel A B x');
  assert.equal(dateiName('..'), 'Notiz');
  assert.equal(dateiName(''), 'Notiz');
  assert.equal(pfadFuer('flipping', 'Marge & Wert'), 'Agenten/flipping/Marge & Wert.md');
  assert.ok(dateiName('a'.repeat(300)).length <= 120);
});

test('extrahiereLinks: Alias, Abschnitt, Duplikate', () => {
  assert.deepEqual(extrahiereLinks('[[A]] und [[B|Alias]] und [[C#Teil]] und [[A]]'), ['A', 'B', 'C']);
  assert.deepEqual(extrahiereLinks('kein Link'), []);
});

const remoteZeile = (o = {}) => ({ id: 'id-1', agent: 'flipping', titel: 'Mindestpreise', tags: ['regel', 'flipping'], status: 'aktiv', vertrauen: 'eigen', quelle: 'obsidian', inhalt: '16 Pro mindestens 450 EUR.\nSiehe [[Preislogik]].', pfad: 'Agenten/flipping/Mindestpreise.md', ...o });
const datei = (o) => ({ pfad: 'Agenten/flipping/Mindestpreise.md', text: baueNotiz(notiz(o)) });

test('planeSync: neu im Vault -> hochladen, neu im Dashboard -> herunterladen', () => {
  const a = planeSync([datei()], [], {});
  assert.equal(a.length, 1);
  assert.equal(a[0].aktion, 'hochladen');
  assert.equal(a[0].notiz.titel, 'Mindestpreise');
  const b = planeSync([], [remoteZeile()], {});
  assert.equal(b[0].aktion, 'herunterladen');
  assert.match(b[0].text, /^---\ntitel: Mindestpreise/);
});

test('planeSync: gleich -> unveraendert (auch bei anderer Formatierung der Datei)', () => {
  const lokal = { pfad: 'Agenten/flipping/Mindestpreise.md', text: '---\ntitel: Mindestpreise\nagent: flipping\ntags:\n  - regel\n  - flipping\n---\n\n16 Pro mindestens 450 EUR.\r\nSiehe [[Preislogik]].\n\n\n' };
  const a = planeSync([lokal], [remoteZeile()], {});
  assert.equal(a[0].aktion, 'unveraendert');
});

test('planeSync: nur lokal geändert -> aktualisiere_remote, nur remote geändert -> aktualisiere_lokal', () => {
  const alt = baueNotiz(notiz());
  const zustand = { 'Agenten/flipping/Mindestpreise.md': hashText(alt) };
  const a = planeSync([datei({ inhalt: 'neuer Text' })], [remoteZeile()], zustand);
  assert.equal(a[0].aktion, 'aktualisiere_remote');
  assert.equal(a[0].id, 'id-1');
  const b = planeSync([datei()], [remoteZeile({ inhalt: 'Dashboard-Text' })], zustand);
  assert.equal(b[0].aktion, 'aktualisiere_lokal');
  assert.match(b[0].text, /Dashboard-Text/);
});

test('planeSync: beide Seiten geändert oder erster Abgleich mit Unterschied -> konflikt', () => {
  const alt = hashText(baueNotiz(notiz()));
  const zustand = { 'Agenten/flipping/Mindestpreise.md': alt };
  const a = planeSync([datei({ inhalt: 'lokal neu' })], [remoteZeile({ inhalt: 'remote neu' })], zustand);
  assert.equal(a[0].aktion, 'konflikt');
  const b = planeSync([datei({ inhalt: 'lokal' })], [remoteZeile({ inhalt: 'remote' })], {});
  assert.equal(b[0].aktion, 'konflikt');
});

test('planeSync: Freigabe in Obsidian (status vorschlag -> aktiv) wird hochgeladen', () => {
  const alt = baueNotiz(notiz({ status: 'vorschlag' }));
  const zustand = { 'Agenten/flipping/Mindestpreise.md': hashText(alt) };
  const a = planeSync([datei({ status: 'aktiv' })], [remoteZeile({ status: 'vorschlag' })], zustand);
  assert.equal(a[0].aktion, 'aktualisiere_remote');
  assert.equal(a[0].notiz.status, 'aktiv');
});

test('planeSync: löscht nie, meldet nur (auf einer Seite gelöscht)', () => {
  const zustand = { 'Agenten/flipping/Mindestpreise.md': hashText(baueNotiz(notiz())) };
  const a = planeSync([datei()], [], zustand);
  assert.equal(a[0].aktion, 'nur_remote_geloescht_oder_lokal_geloescht');
  const b = planeSync([], [remoteZeile()], zustand);
  assert.equal(b[0].aktion, 'nur_remote_geloescht_oder_lokal_geloescht');
});

test('planeSync: ungültiger Agent-Name wird gemeldet statt hochgeladen', () => {
  const a = planeSync([{ pfad: 'Agenten/X Y/n.md', text: '---\nagent: X Y\n---\nT' }], [], {});
  assert.equal(a[0].aktion, 'ungueltig');
});

test('planeSync: Zeile ohne pfad bekommt den Standardpfad und wird zugeordnet', () => {
  const a = planeSync([datei()], [remoteZeile({ pfad: null })], {});
  assert.equal(a[0].aktion, 'unveraendert');
});
