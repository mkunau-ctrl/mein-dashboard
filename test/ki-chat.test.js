import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatZustand, pruefeEingabe, chatStatusText } from '../js/module/ki/chat.js';

function zeile(id, rolle, status, zeit) {
  return { id, agent: 'orchestrator', rolle, text: `Text ${id}`, status, erstellt_am: zeit };
}

test('chatZustand: sortiert aufsteigend nach Zeit', () => {
  const zustand = chatZustand([
    zeile('2', 'nutzer', 'fertig', '2026-11-21T10:02:00Z'),
    zeile('1', 'agent', 'fertig', '2026-11-21T10:01:00Z'),
    zeile('3', 'system', 'fertig', '2026-11-21T10:03:00Z'),
  ]);
  assert.deepEqual(zustand.verlauf.map((z) => z.id), ['1', '2', '3']);
});

test('chatZustand: wartet auf Antwort, solange letzte Nachricht vom Nutzer offen ist', () => {
  for (const status of ['neu', 'angenommen', 'in_arbeit']) {
    const zustand = chatZustand([
      zeile('1', 'agent', 'fertig', '2026-11-21T10:00:00Z'),
      zeile('2', 'nutzer', status, '2026-11-21T10:01:00Z'),
    ]);
    assert.equal(zustand.wartetAufAntwort, true, status);
    assert.equal(zustand.letzterNutzer.id, '2');
  }
});

test('chatZustand: keine Wartezeit, wenn der Agent danach antwortet oder der Status fertig/fehler ist', () => {
  assert.equal(chatZustand([
    zeile('1', 'nutzer', 'neu', '2026-11-21T10:00:00Z'),
    zeile('2', 'agent', 'fertig', '2026-11-21T10:01:00Z'),
  ]).wartetAufAntwort, false);
  assert.equal(chatZustand([zeile('1', 'nutzer', 'fertig', '2026-11-21T10:00:00Z')]).wartetAufAntwort, false);
  assert.equal(chatZustand([zeile('1', 'nutzer', 'fehler', '2026-11-21T10:00:00Z')]).wartetAufAntwort, false);
});

test('chatZustand: leere Liste, null und fehlende Felder', () => {
  assert.deepEqual(chatZustand([]), { verlauf: [], letzterNutzer: null, statusLetzterNutzer: null, wartetAufAntwort: false });
  assert.deepEqual(chatZustand(null), { verlauf: [], letzterNutzer: null, statusLetzterNutzer: null, wartetAufAntwort: false });
  const zustand = chatZustand([{ rolle: 'nutzer' }, null]);
  assert.equal(zustand.verlauf.length, 1);
  assert.equal(zustand.wartetAufAntwort, true);
});

test('pruefeEingabe: trimmt und akzeptiert 1..4000 Zeichen', () => {
  assert.deepEqual(pruefeEingabe('  Hallo AURORA  '), { ok: true, text: 'Hallo AURORA' });
  assert.deepEqual(pruefeEingabe('x'.repeat(4000)), { ok: true, text: 'x'.repeat(4000) });
});

test('pruefeEingabe: leere, zu lange und ungueltige Eingaben mit deutschem Fehlertext', () => {
  assert.equal(pruefeEingabe('   ').ok, false);
  assert.match(pruefeEingabe('x'.repeat(4001)).fehler, /4000/);
  assert.equal(pruefeEingabe(null).ok, false);
  assert.equal(pruefeEingabe(undefined).ok, false);
});

test('chatStatusText: Status der Nutzernachricht wird lesbar', () => {
  assert.equal(chatStatusText('neu'), 'gesendet');
  assert.equal(chatStatusText('angenommen'), 'angenommen');
  assert.equal(chatStatusText('in_arbeit'), 'arbeitet …');
  assert.equal(chatStatusText('fertig'), 'beantwortet');
  assert.equal(chatStatusText('fehler'), 'Fehler');
  assert.equal(chatStatusText('unbekannt'), 'unbekannt');
  assert.equal(chatStatusText(null), 'unbekannt');
});

test('pruefeEingabe: HTML bleibt reiner Text (kein Rendern)', () => {
  const ergebnis = pruefeEingabe('<script>alert(1)</script>');
  assert.equal(ergebnis.ok, true);
  assert.equal(ergebnis.text, '<script>alert(1)</script>');
});
