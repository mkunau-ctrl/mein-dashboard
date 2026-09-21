import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wochenStart, gruppiereNachWoche, ausbildungsjahr, ausbildungsFortschritt }
  from '../js/module/berichtsheft/berechnung.js';

test('wochenStart: liefert den Montag der Woche', () => {
  assert.equal(wochenStart('2026-09-16'), '2026-09-14'); // Mittwoch -> Montag
  assert.equal(wochenStart('2026-09-14'), '2026-09-14'); // Montag -> sich selbst
  assert.equal(wochenStart('2026-09-13'), '2026-09-07'); // Sonntag -> Vorwoche-Montag
});

test('gruppiereNachWoche: neueste Woche zuerst, Tage je Woche aufsteigend sortiert', () => {
  const eintraege = [
    { datum: '2026-09-16', taetigkeiten: 'Mi' },
    { datum: '2026-09-14', taetigkeiten: 'Mo' },
    { datum: '2026-09-08', taetigkeiten: 'Di Vorwoche' },
  ];
  const gruppen = gruppiereNachWoche(eintraege);
  assert.equal(gruppen.length, 2);
  assert.equal(gruppen[0].start, '2026-09-14');
  assert.deepEqual(gruppen[0].eintraege.map((e) => e.datum), ['2026-09-14', '2026-09-16']);
  assert.equal(gruppen[1].start, '2026-09-07');
});

test('ausbildungsjahr: Differenz in ganzen Jahren ab Ausbildungsbeginn, ab 1', () => {
  assert.equal(ausbildungsjahr('2025-08-01', '2026-09-16'), 2);
  assert.equal(ausbildungsjahr('2025-08-01', '2026-07-31'), 1);
  assert.equal(ausbildungsjahr('2025-08-01', '2025-08-01'), 1);
});

test('ausbildungsFortschritt: Jahr und Prozent korrekt berechnet', () => {
  assert.deepEqual(ausbildungsFortschritt('2026-08-01', 3.5, '2026-09-21'), { jahr: 1, prozent: 4 });
});

test('ausbildungsFortschritt: Prozent wird bei Ueberschreiten auf 100 begrenzt', () => {
  assert.deepEqual(ausbildungsFortschritt('2020-08-01', 3.5, '2026-09-21'), { jahr: 7, prozent: 100 });
});
