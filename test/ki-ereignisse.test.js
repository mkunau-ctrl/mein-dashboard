import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ereignisText, uhrzeit } from '../js/module/ki/ereignisse.js';

const aufgaben = [
  { id: 'a1', eingabe: 'Recherchiere Preise fuer iPhone 14', status: 'RUNNING' },
  { id: 'a2', eingabe: 'Bericht schreiben', status: 'QUEUED' },
];

function ereignis(werte) {
  return {
    aurora_id: 1, aufgabe_id: 'a1', zeitpunkt: '2026-11-21T10:00:00Z',
    akteur: 'orchestrator', art: 'status', von_status: null, nach_status: null,
    detail: '', ...werte,
  };
}

test('ereignisText: Statuswechsel mit Aufgabentitel, Akteur und deutschen Status', () => {
  const text = ereignisText(ereignis({ von_status: 'QUEUED', nach_status: 'ASSIGNED', akteur: 'orchestrator' }), aufgaben);
  assert.match(text, /orchestrator/);
  assert.match(text, /Recherchiere Preise/);
  assert.match(text, /In Warteschlange/);
  assert.match(text, /Zugewiesen/);
  assert.ok(text.includes('→'));
});

test('ereignisText: Aufgabentitel wird gekuerzt, Ergebnis-Text bleibt Text', () => {
  const lang = 'x'.repeat(200);
  const text = ereignisText(ereignis({ aufgabe_id: 'a2', von_status: 'CREATED', nach_status: 'QUEUED' }),
    [{ id: 'a2', eingabe: lang }]);
  assert.ok(text.length < 200);
  assert.ok(text.includes('Erstellt'));
  assert.ok(text.includes('In Warteschlange'));
});

test('ereignisText: unbekannte Aufgabe faellt auf kurze Kennung zurueck', () => {
  const text = ereignisText(ereignis({ aufgabe_id: 'ffffffff-1111-2222-3333-444444444444' }), []);
  assert.match(text, /ffffffff/);
  assert.equal(ereignisText(ereignis({ aufgabe_id: null }), null).length > 0, true);
});

test('ereignisText: ohne Statuswechsel bleibt Akteur, Art und Detail lesbar', () => {
  const text = ereignisText(ereignis({ akteur: 'ceo', art: 'plan', detail: 'Aufgabe zerlegt' }), aufgaben);
  assert.match(text, /ceo/);
  assert.match(text, /plan/);
  assert.match(text, /Aufgabe zerlegt/);
  assert.match(text, /Recherchiere Preise/);
});

test('ereignisText: fehlende Felder und HTML bleiben unkritisch', () => {
  const text = ereignisText({}, []);
  assert.equal(typeof text, 'string');
  assert.ok(text.length > 0);
  assert.ok(ereignisText(ereignis({ detail: '<script>alert(1)</script>' }), aufgaben)
    .includes('<script>alert(1)</script>'));
});

test('uhrzeit: HH:MM aus ISO, ungueltig leer', () => {
  assert.match(uhrzeit('2026-11-21T10:05:00Z'), /^\d{2}:\d{2}$/);
  assert.equal(uhrzeit(null), '');
  assert.equal(uhrzeit('kaputt'), '');
});
