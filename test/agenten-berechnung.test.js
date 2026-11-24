import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortiereProfile, zaehleWissen, filtereWissen, listeAusText, listeZuText, tagsAusText,
  agentAusSegment, segmentFuerAgent, pruefeProfil, pruefeWissen,
} from '../js/module/agenten/berechnung.js';

test('sortiereProfile: aktive zuerst, AURORA-Reihenfolge, dann alphabetisch', () => {
  const p = [
    { agent: 'flipping', aktiv: true }, { agent: 'qa', aktiv: true }, { agent: 'ceo', aktiv: true },
    { agent: 'dashboard', aktiv: true }, { agent: 'alt', aktiv: false },
  ];
  assert.deepEqual(sortiereProfile(p).map((x) => x.agent), ['ceo', 'qa', 'dashboard', 'flipping', 'alt']);
});

test('zaehleWissen: je Agent und Status', () => {
  const z = zaehleWissen([
    { agent: 'a', status: 'aktiv' }, { agent: 'a', status: 'aktiv' }, { agent: 'a', status: 'vorschlag' },
    { agent: 'b', status: 'archiv' }, { agent: 'b', status: 'unbekannt' },
  ]);
  assert.deepEqual(z.a, { aktiv: 2, vorschlag: 1, archiv: 0 });
  assert.deepEqual(z.b, { aktiv: 0, vorschlag: 0, archiv: 1 });
});

test('filtereWissen: Status, Suchtext in Titel/Inhalt/Tags, neueste zuerst', () => {
  const w = [
    { titel: 'Mindestpreise', inhalt: '450 EUR', tags: ['regel'], status: 'aktiv', aktualisiert_am: '2026-11-01' },
    { titel: 'Idee', inhalt: 'Kabel fragen', tags: ['flipping'], status: 'vorschlag', aktualisiert_am: '2026-11-03' },
    { titel: 'Alt', inhalt: 'x', tags: [], status: 'archiv', aktualisiert_am: '2026-11-02' },
  ];
  assert.equal(filtereWissen(w, { status: 'aktiv' }).length, 1);
  assert.deepEqual(filtereWissen(w).map((x) => x.titel), ['Idee', 'Alt', 'Mindestpreise']);
  assert.equal(filtereWissen(w, { text: 'kabel' })[0].titel, 'Idee');
  assert.equal(filtereWissen(w, { text: 'FLIPPING' })[0].titel, 'Idee');
  assert.equal(filtereWissen(w, { text: 'gibtsnicht' }).length, 0);
});

test('Listen und Tags aus Text', () => {
  assert.deepEqual(listeAusText('a, b\nc, a'), ['a', 'b', 'c']);
  assert.equal(listeZuText(['x', 'y']), 'x, y');
  assert.equal(listeZuText(null), '');
  assert.deepEqual(tagsAusText('#a, b'), ['a', 'b']);
});

test('URL-Segment und Agent-Kennung', () => {
  assert.equal(agentAusSegment('gemeinsam'), '_gemeinsam');
  assert.equal(agentAusSegment('flipping'), 'flipping');
  assert.equal(segmentFuerAgent('_gemeinsam'), 'gemeinsam');
});

test('pruefeProfil und pruefeWissen', () => {
  assert.equal(pruefeProfil({ agent: 'kalender', titel: 'Kalender' }).ok, true);
  assert.equal(pruefeProfil({ agent: 'Kal-ender', titel: 'x' }).ok, false);
  assert.equal(pruefeProfil({ agent: 'ab', titel: ' ' }).ok, false);
  assert.equal(pruefeWissen({ titel: 'T', inhalt: 'x' }).ok, true);
  assert.equal(pruefeWissen({ titel: ' ', inhalt: '' }).ok, false);
  assert.equal(pruefeWissen({ titel: 'a'.repeat(121), inhalt: '' }).ok, false);
});
