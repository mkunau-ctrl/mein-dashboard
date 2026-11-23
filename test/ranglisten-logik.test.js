import test from 'node:test';
import assert from 'node:assert/strict';
import {
  benutzerZuEmail, listenId, listenTitel, bereinigeAuswahl, wechselMarkierungen,
  pruefeMatch, zahlOderNull, matchText,
} from '../ranglisten/logik.js';

test('benutzerZuEmail: Benutzername wird interne Adresse, Unsinn abgelehnt', () => {
  assert.equal(benutzerZuEmail(' Liste '), 'liste@rangliste.local');
  assert.equal(benutzerZuEmail(''), null);
  assert.equal(benutzerZuEmail('a b'), null);
  assert.equal(benutzerZuEmail('x@y'), null);
});

test('listenId und listenTitel passen zu den 26 Listen der Datenbank', () => {
  assert.equal(listenId({ gruppe: 'm', klasse: 'u80', alter: 'ue16', arm: 'r' }), 'm-u80-ue16-r');
  assert.equal(listenId({ gruppe: 'm', klasse: 'ue115', alter: 'u16', arm: 'l' }), 'm-ue115-u16-l');
  assert.equal(listenId({ gruppe: 'f', klasse: 'u70', alter: 'u16', arm: 'l' }), 'f-offen-l');
  assert.equal(listenTitel({ gruppe: 'm', klasse: 'ue115', alter: 'u16', arm: 'l' }), 'Ü115 · U16 · Links');
  assert.equal(listenTitel({ gruppe: 'f', arm: 'r' }), 'Frauen · Rechts');
});

test('bereinigeAuswahl: unbekannte Werte fallen auf Standard zurück', () => {
  assert.deepEqual(bereinigeAuswahl({ klasse: 'u999', arm: 'x' }), { gruppe: 'm', klasse: 'u80', alter: 'ue16', arm: 'r' });
  assert.deepEqual(bereinigeAuswahl(null), { gruppe: 'm', klasse: 'u80', alter: 'ue16', arm: 'r' });
});

test('wechselMarkierungen: Sieger von 4 auf 2, Plätze 3 und 4 rutschen', () => {
  const plaetze = [
    { person_id: 'A', platz: 1 }, { person_id: 'D', platz: 2 },
    { person_id: 'B', platz: 3 }, { person_id: 'C', platz: 4 }, { person_id: 'E', platz: 5 },
  ];
  const m = wechselMarkierungen(plaetze, { sieger_id: 'D', sieger_platz_vorher: 4, verlierer_platz_vorher: 2 });
  assert.deepEqual(m, { D: '↑ von 4', B: '↓ 1', C: '↓ 1' });
});

test('wechselMarkierungen: gewinnt der Höhere, gibt es keine Markierung', () => {
  assert.deepEqual(wechselMarkierungen([{ person_id: 'A', platz: 1 }], { sieger_id: 'A', sieger_platz_vorher: 1, verlierer_platz_vorher: 2 }), {});
  assert.deepEqual(wechselMarkierungen([], null), {});
});

test('pruefeMatch: gültig und typische Fehler', () => {
  const ok = { a_name: 'Anton', b_name: 'Bert', runden: '3', sieger: 'a', a_gewicht: '79,5', b_gewicht: '', a_alter: '20', b_alter: '' };
  assert.equal(pruefeMatch(ok), null);
  assert.match(pruefeMatch({ ...ok, b_name: ' ' }), /beide Namen/);
  assert.match(pruefeMatch({ ...ok, b_name: 'anton' }), /verschiedene/);
  assert.match(pruefeMatch({ ...ok, runden: '0' }), /Runden/);
  assert.match(pruefeMatch({ ...ok, runden: '2.5' }), /Runden/);
  assert.match(pruefeMatch({ ...ok, sieger: '' }), /Sieger/);
  assert.match(pruefeMatch({ ...ok, a_gewicht: 'viel' }), /Zahl/);
});

test('zahlOderNull: Komma, leer, Unsinn', () => {
  assert.equal(zahlOderNull('79,5'), 79.5);
  assert.equal(zahlOderNull(''), null);
  assert.equal(zahlOderNull('abc'), null);
});

test('matchText: Sieger schlägt Verlierer mit Runden', () => {
  const namen = { a: 'Anton', b: 'Bert' };
  assert.equal(matchText({ a_id: 'a', b_id: 'b', sieger_id: 'b', runden: 1 }, namen), 'Bert schlägt Anton · 1 Runde');
  assert.equal(matchText({ a_id: 'a', b_id: 'b', sieger_id: 'a', runden: 3 }, namen), 'Anton schlägt Bert · 3 Runden');
});
