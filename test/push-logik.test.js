import test from 'node:test';
import assert from 'node:assert/strict';
import { baueMeldungen, inRuhezeit, minutenAusUhrzeit } from '../supabase/functions/push-senden/logik.js';

const basis = { termine: [], todos: [], rechnungen: [], sendungen: [], funde: [], heute: '2026-10-03', minuten: 9 * 60, jetztMs: Date.parse('2026-10-03T07:00:00Z') };
const roh = (teil) => baueMeldungen({ ...basis, ...teil });
// ohne Morgen-Zusammenfassung, damit die Einzel-Ausloeser-Tests nur ihre eigenen Meldungen sehen
const mit = (teil) => roh(teil).filter((x) => x.art !== 'morgen');

test('minutenAusUhrzeit', () => {
  assert.equal(minutenAusUhrzeit('14:30'), 870);
  assert.equal(minutenAusUhrzeit('7:05'), 425);
  assert.equal(minutenAusUhrzeit('abends'), null);
  assert.equal(minutenAusUhrzeit(null), null);
});

test('inRuhezeit: normal und ueber Mitternacht', () => {
  assert.equal(inRuhezeit(23 * 60, '22:00', '07:00'), true);
  assert.equal(inRuhezeit(3 * 60, '22:00', '07:00'), true);
  assert.equal(inRuhezeit(12 * 60, '22:00', '07:00'), false);
  assert.equal(inRuhezeit(13 * 60, '12:00', '14:00'), true);
  assert.equal(inRuhezeit(15 * 60, '12:00', '14:00'), false);
});

test('Termin mit Uhrzeit: nur im Fenster 0-60 Min vorher', () => {
  const t = { id: 'a', titel: 'Zahnarzt', faellig_am: '2026-10-03', uhrzeit: '09:45', ort: 'Lemgo', erledigt: false };
  const m = mit({ termine: [t] });
  assert.equal(m.length, 1);
  assert.equal(m[0].art, 'termin_zeit');
  assert.equal(m[0].schluessel, 'termin:a:2026-10-03:09:45');
  assert.match(m[0].titel, /09:45/);
  assert.equal(mit({ termine: [{ ...t, uhrzeit: '11:00' }] }).length, 0);
  assert.equal(mit({ termine: [{ ...t, uhrzeit: '08:30' }] }).length, 0);
  assert.equal(mit({ termine: [{ ...t, erledigt: true }] }).length, 0);
});

test('Termin ohne Uhrzeit: ab 8 Uhr am Tag selbst', () => {
  const t = { id: 'b', titel: 'Abgabe', faellig_am: '2026-10-03', uhrzeit: null, erledigt: false };
  assert.equal(mit({ termine: [t] }).length, 1);
  assert.equal(mit({ termine: [t], minuten: 7 * 60 }).length, 0);
  assert.equal(mit({ termine: [{ ...t, faellig_am: '2026-10-04' }] }).length, 0);
});

test('To-do: heute faellig und ueberfaellig', () => {
  const heute = { id: 'c', text: 'Müll', faellig: '2026-10-03', erledigt: false };
  const alt = { id: 'd', text: 'Steuer', faellig: '2026-10-01', erledigt: false };
  const m = mit({ todos: [heute, alt, { id: 'e', text: 'x', faellig: null, erledigt: false }, { ...heute, id: 'f', erledigt: true }] });
  assert.equal(m.length, 2);
  assert.deepEqual(m.map((x) => x.art).sort(), ['todo_heute', 'todo_ueberfaellig']);
  assert.ok(m.find((x) => x.schluessel === 'todo:d:ueberfaellig'));
});

test('Rechnung: bald faellig (0-2 Tage) und ueberfaellig, bezahlte nie', () => {
  const r = (id, f, status = 'offen') => ({ id, haendler: 'Strom', betrag: 50, faellig_am: f, status });
  const m = mit({ rechnungen: [r('1', '2026-10-05'), r('2', '2026-10-09'), r('3', '2026-10-01'), r('4', '2026-10-03', 'bezahlt')] });
  assert.deepEqual(m.map((x) => x.schluessel).sort(), ['rechnung:1:bald', 'rechnung:3:ueberfaellig']);
  assert.deepEqual(m.map((x) => x.art).sort(), ['rechnung_bald', 'rechnung_ueberfaellig']);
});

test('Sendung: zugestellt in den letzten 24h, alte nicht', () => {
  const s = (id, std) => ({ id, haendler: 'Amazon', beschreibung: 'Kabel', status: 'zugestellt', letzte_aktualisierung: new Date(basis.jetztMs - std * 3600e3).toISOString(), abholcode: null });
  const m = mit({ sendungen: [s('1', 2), s('2', 30)] });
  assert.equal(m.length, 1);
  assert.equal(m[0].schluessel, 'sendung:1:zugestellt');
});

test('Funde: nur neue der letzten 3h, mehrere werden gebuendelt', () => {
  const f = (id, std) => ({ id, titel: 'iPhone 14', preis: 300, ort: 'Köln', status: 'neu', erstellt_am: new Date(basis.jetztMs - std * 3600e3).toISOString() });
  const einer = mit({ funde: [f('1', 1), f('2', 5)] });
  assert.equal(einer.length, 1);
  assert.equal(einer[0].schluessel, 'fund:1');
  const zwei = mit({ funde: [f('1', 1), f('3', 2)] });
  assert.equal(zwei.length, 1);
  assert.match(zwei[0].titel, /2/);
  assert.equal(mit({ funde: [{ ...f('4', 1), status: 'verworfen' }] }).length, 0);
});

import { zaehleOffen } from '../supabase/functions/push-senden/logik.js';
test('zaehleOffen: Termine heute + To-dos bis heute + Rechnungen bis in 2 Tagen', () => {
  const n = zaehleOffen({
    heute: '2026-10-03',
    termine: [{ faellig_am: '2026-10-03', erledigt: false }, { faellig_am: '2026-10-04', erledigt: false }],
    todos: [{ faellig: '2026-10-02', erledigt: false }, { faellig: '2026-10-09', erledigt: false }, { faellig: '2026-10-03', erledigt: true }],
    rechnungen: [{ faellig_am: '2026-10-05', status: 'offen' }, { faellig_am: '2026-10-05', status: 'bezahlt' }],
  });
  assert.equal(n, 3);
});

// ---- Ausbau 2026-10-05: einzelne Ausloeser (art), neue Quellen, Morgen-Zusammenfassung ----
import { ARTEN, schalterErlaubt } from '../supabase/functions/push-senden/logik.js';

test('jede Meldung hat eine bekannte art', () => {
  const keys = new Set(ARTEN.map((a) => a.key));
  const m = roh({
    termine: [{ id: 'a', titel: 'x', faellig_am: '2026-10-03', uhrzeit: '09:30', erledigt: false }, { id: 'b', titel: 'y', faellig_am: '2026-10-03', uhrzeit: null, erledigt: false }],
    todos: [{ id: 'c', text: 't', faellig: '2026-10-03', erledigt: false }, { id: 'd', text: 'u', faellig: '2026-10-01', erledigt: false }],
    rechnungen: [{ id: '1', haendler: 'S', betrag: 5, faellig_am: '2026-10-04', status: 'offen' }, { id: '2', haendler: 'S', betrag: 5, faellig_am: '2026-10-01', status: 'offen' }],
  });
  assert.ok(m.length >= 6);
  for (const x of m) assert.ok(keys.has(x.art), `art ${x.art} unbekannt`);
  assert.deepEqual(m.map((x) => x.art).filter((a) => a !== 'morgen').sort(), ['rechnung_bald', 'rechnung_ueberfaellig', 'termin_tag', 'termin_zeit', 'todo_heute', 'todo_ueberfaellig']);
});

test('schalterErlaubt: fehlender Eintrag = an, false = aus, Hauptschalter nicht beteiligt', () => {
  assert.equal(schalterErlaubt({}, 'termin_zeit'), true);
  assert.equal(schalterErlaubt({ termin_zeit: false }, 'termin_zeit'), false);
  assert.equal(schalterErlaubt({ termin_zeit: true }, 'termin_zeit'), true);
  assert.equal(schalterErlaubt(null, 'x'), true);
});

test('Verkaufs-Anfrage: neu in den letzten 3h und nicht erledigt, Kaufinteresse hervorgehoben', () => {
  const v = (id, std, extra = {}) => ({ id, anzeige_titel: 'Matratzenschoner', kaeufer: 'Anna', frage: 'Noch da?', status: 'eskaliert_offen', kaufinteresse: false, erstellt_am: new Date(basis.jetztMs - std * 3600e3).toISOString(), ...extra });
  const m = mit({ verkaeufe: [v('1', 1), v('2', 5), v('3', 1, { status: 'erledigt' }), v('4', 2, { kaufinteresse: true })] });
  assert.deepEqual(m.map((x) => x.schluessel).sort(), ['verkauf:1', 'verkauf:4']);
  assert.ok(m.every((x) => x.art === 'verkauf_anfrage'));
  assert.match(m.find((x) => x.schluessel === 'verkauf:4').titel, /Kaufinteresse/i);
  assert.equal(m.find((x) => x.schluessel === 'verkauf:1').url, '#/flipping');
});

test('Dauerauftrag: aktiv und faellig (<= heute) ab 8 Uhr, Ausgabe und Einnahme getrennt', () => {
  const a = { id: 'a1', bezeichnung: 'Claude Abo', betrag: 22, naechste_faelligkeit: '2026-10-03', aktiv: true };
  const e = { id: 'e1', bezeichnung: 'Lohn', betrag: 750, naechste_faelligkeit: '2026-10-02', aktiv: true };
  const m = mit({ vorlagenAus: [a, { ...a, id: 'a2', aktiv: false }, { ...a, id: 'a3', naechste_faelligkeit: '2026-10-09' }], vorlagenEin: [e] });
  assert.deepEqual(m.map((x) => x.schluessel).sort(), ['vorlage:aus:a1:2026-10-03', 'vorlage:ein:e1:2026-10-02']);
  assert.ok(m.every((x) => x.art === 'dauerauftrag'));
  assert.equal(mit({ vorlagenAus: [a], minuten: 7 * 60 }).length, 0);
});

test('Schulden: nur montags ab 8 Uhr, eine Sammelmeldung mit Restbetrag nach Richtung', () => {
  const s = [
    { id: 's1', person: 'Daniel', gesamtbetrag: 208, richtung: 'mir_wird_geschuldet' },
    { id: 's2', person: 'Aaron', gesamtbetrag: 145, richtung: 'mir_wird_geschuldet' },
    { id: 's3', person: 'Bank', gesamtbetrag: 100, richtung: 'ich_schulde' },
    { id: 's4', person: 'Erledigt', gesamtbetrag: 50, richtung: 'mir_wird_geschuldet' },
  ];
  const z = [{ schuld_id: 's2', betrag: 45 }, { schuld_id: 's4', betrag: 50 }];
  const montag = mit({ schulden: s, schuldenZahlungen: z, heute: '2026-10-05' });
  assert.equal(montag.length, 1);
  assert.equal(montag[0].art, 'schulden');
  assert.equal(montag[0].schluessel, 'schulden:2026-10-05');
  assert.match(montag[0].text, /308,00 €/); // 208 + 100 (145-45)
  assert.match(montag[0].text, /100,00 €/); // ich schulde
  assert.equal(mit({ schulden: s, schuldenZahlungen: z, heute: '2026-10-06' }).length, 0);
  assert.equal(mit({ schulden: s, schuldenZahlungen: z, heute: '2026-10-05', minuten: 7 * 60 }).length, 0);
  assert.equal(mit({ schulden: [s[3]], schuldenZahlungen: z, heute: '2026-10-05' }).length, 0);
});

test('E-Mail-Meldungen aus der Tabelle meldungen: letzte 24h, schon gespeicherte Zeile', () => {
  const mail = (id, std) => ({ id, art: 'email', titel: 'Mail: Rechnung Telekom', text: 'Fällig bis 10.10.', url: '#/rechnungen', erstellt_am: new Date(basis.jetztMs - std * 3600e3).toISOString() });
  const m = mit({ mails: [mail('m1', 1), mail('m2', 30)] });
  assert.equal(m.length, 1);
  assert.equal(m[0].art, 'email');
  assert.equal(m[0].schluessel, 'mail:m1');
  assert.equal(m[0].titel, 'Mail: Rechnung Telekom');
  assert.equal(m[0].schonGespeichert, true);
});

test('Morgen-Zusammenfassung: 8-12 Uhr, nur wenn etwas ansteht, zaehlt Termine/To-dos/Rechnungen', () => {
  const daten = {
    termine: [{ id: 'a', titel: 'Zahnarzt', faellig_am: '2026-10-03', uhrzeit: '14:00', erledigt: false }],
    todos: [{ id: 'c', text: 'Müll', faellig: '2026-10-03', erledigt: false }, { id: 'd', text: 'Steuer', faellig: '2026-10-01', erledigt: false }],
    rechnungen: [{ id: '1', haendler: 'Strom', betrag: 50, faellig_am: '2026-10-04', status: 'offen' }],
  };
  const m = roh(daten).find((x) => x.art === 'morgen');
  assert.ok(m);
  assert.equal(m.schluessel, 'morgen:2026-10-03');
  assert.match(m.text, /1 Termin/);
  assert.match(m.text, /2 To-dos/);
  assert.match(m.text, /1 Rechnung/);
  assert.equal(roh({ ...daten, minuten: 7 * 60 }).find((x) => x.art === 'morgen'), undefined);
  assert.equal(roh({ ...daten, minuten: 13 * 60 }).find((x) => x.art === 'morgen'), undefined);
  assert.equal(roh({}).find((x) => x.art === 'morgen'), undefined);
});
