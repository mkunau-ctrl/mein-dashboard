import test from 'node:test';
import assert from 'node:assert/strict';
import {
  wochentagVon, addTage, montagVon, istLemgoWoche, segmenteFuerTag, flexFenster, flexMinuten,
  wochenFlexMinuten, restFlexWoche, offenePflichtenMinuten, aufgabeOffen, warnungen, briefingFaellig,
  schlafenszeit, wetterText, baueBriefing,
} from '../supabase/functions/push-senden/wochenplan.js';
import { GRUNDWOCHE, WOCHENAUFGABEN, ZU_KLAEREN } from '../supabase/functions/push-senden/wochenplan-grundwoche.js';

const daten = (extra = {}) => ({ bloecke: GRUNDWOCHE, ausnahmen: [], termine: [], ...extra });
const std = (min) => min / 60;

test('Datumshelfer: Wochentag, addTage, montagVon', () => {
  assert.equal(wochentagVon('2026-10-08'), 4); // Donnerstag
  assert.equal(wochentagVon('2026-10-11'), 7); // Sonntag
  assert.equal(addTage('2026-10-31', 1), '2026-11-01');
  assert.equal(montagVon('2026-10-08'), '2026-10-05');
  assert.equal(montagVon('2026-10-11'), '2026-10-05');
});

test('Lemgo-Gottesdienst alle 2 Wochen ab 18.10.2026', () => {
  assert.equal(istLemgoWoche('2026-10-18', '2026-10-18'), true);
  assert.equal(istLemgoWoche('2026-10-12', '2026-10-18'), true); // Montag der Woche
  assert.equal(istLemgoWoche('2026-10-11', '2026-10-18'), false);
  assert.equal(istLemgoWoche('2026-10-25', '2026-10-18'), false);
  assert.equal(istLemgoWoche('2026-11-01', '2026-10-18'), true);
  assert.equal(istLemgoWoche('2026-11-15', '2026-10-18'), true);
});

test('Testfall: flexible Zeit pro Tag (Woche mit Lemgo-Gottesdienst, 12.-18.10.2026)', () => {
  const erwartet = { '2026-10-12': 3.5, '2026-10-13': 4, '2026-10-14': 5, '2026-10-15': 2, '2026-10-16': 4.5, '2026-10-17': 11, '2026-10-18': 3.5 };
  for (const [tag, h] of Object.entries(erwartet)) assert.equal(std(flexMinuten(tag, daten())), h, tag);
});

test('Testfall: Wochensumme 33,5 h mit und 37,5 h ohne Lemgo-Gottesdienst', () => {
  assert.equal(std(wochenFlexMinuten('2026-10-14', daten())), 33.5); // Woche bis 18.10. (mit)
  assert.equal(std(wochenFlexMinuten('2026-10-07', daten())), 37.5); // Woche bis 11.10. (ohne)
});

test('Sonntag ohne Lemgo: 16-19 und 20-21 sind flexibel', () => {
  const f = flexFenster('2026-10-11', daten());
  // angrenzende Fenster werden zusammengefasst: 14-19 und 20-22:30
  assert.deepEqual(f.map((x) => [x.von, x.bis]), [[840, 1140], [1200, 1350]]);
  assert.equal(std(flexMinuten('2026-10-11', daten())), 7.5);
});

test('Einmaliger Termin zieht flexible Zeit ab: Mi 07.10. 16-20 Uhr bei Dennis im Lager', () => {
  const termine = [{ id: 't1', titel: 'Bei Dennis im Lager', faellig_am: '2026-10-07', uhrzeit: '16:00', bis_uhrzeit: '20:00', erledigt: false }];
  assert.equal(std(flexMinuten('2026-10-07', daten({ termine }))), 2.5); // 16:30-19:00 weg, 20-22:30 bleibt
  const seg = segmenteFuerTag('2026-10-07', daten({ termine }));
  assert.ok(seg.some((s) => s.art === 'termin' && s.titel === 'Bei Dennis im Lager' && s.von === 960 && s.bis === 1200));
});

test('Termin ohne Endzeit dauert 1 Stunde (Annahme)', () => {
  const termine = [{ id: 't2', titel: 'Handys abholen', faellig_am: '2026-10-09', uhrzeit: '15:00', erledigt: false }];
  const seg = segmenteFuerTag('2026-10-09', daten({ termine }));
  const t = seg.find((s) => s.art === 'termin');
  assert.equal(t.bis - t.von, 60);
});

test('Ausnahme setzt einen wiederkehrenden Block fuer einen einzelnen Tag aus', () => {
  const ausnahmen = [{ datum: '2026-10-09', block_schluessel: 'fr-jugend' }];
  const seg = segmenteFuerTag('2026-10-09', daten({ ausnahmen }));
  assert.ok(!seg.some((s) => s.titel.startsWith('Jugend in Lemgo')));
  const ohne = segmenteFuerTag('2026-10-16', daten({ ausnahmen }));
  assert.ok(ohne.some((s) => s.titel.startsWith('Jugend in Lemgo')));
});

test('Termine ohne Uhrzeit sind ganztaegig und aendern die flexible Zeit nicht', () => {
  const termine = [{ id: 't3', titel: 'Jungschar XXL', faellig_am: '2026-10-09', uhrzeit: null, erledigt: false }];
  const basis = flexMinuten('2026-10-09', daten());
  assert.equal(flexMinuten('2026-10-09', daten({ termine })), basis);
  assert.deepEqual(segmenteFuerTag('2026-10-09', daten({ termine })).filter((s) => s.art === 'ganztags').map((s) => s.titel), ['Jungschar XXL']);
});

test('erledigte Termine zaehlen nicht', () => {
  const termine = [{ id: 't4', titel: 'x', faellig_am: '2026-10-07', uhrzeit: '16:00', bis_uhrzeit: '20:00', erledigt: true }];
  assert.equal(std(flexMinuten('2026-10-07', daten({ termine }))), 5);
});

test('restFlexWoche: ab jetzt bis Sonntag, heute nur der Rest', () => {
  // Donnerstag 08.10. 20:00 (ohne Lemgo-Woche): Do 22-23 = 1, Fr 4.5, Sa 11, So 7.5 = 24
  assert.equal(std(restFlexWoche('2026-10-08', 20 * 60, daten())), 24);
  // Samstag 12:00: Sa 12-19 (7) + 20-23 (3) + So 7.5 = 17.5
  assert.equal(std(restFlexWoche('2026-10-10', 12 * 60, daten())), 17.5);
});

test('schlafenszeit pro Tag', () => {
  assert.equal(schlafenszeit('2026-10-08', daten()), '23:00');
  assert.equal(schlafenszeit('2026-10-12', daten()), '22:30');
});

test('Wochenaufgaben: Status gilt pro Woche, Montag setzt zurueck', () => {
  const a = { titel: 'Bad putzen', dauer_min: 45, pflicht: true, erledigt_woche: '2026-10-05' };
  assert.equal(aufgabeOffen(a, '2026-10-05'), false);
  assert.equal(aufgabeOffen(a, '2026-10-11'), false); // Sonntag derselben Woche
  assert.equal(aufgabeOffen(a, '2026-10-12'), true); // neue Woche
  assert.equal(aufgabeOffen({ ...a, erledigt_woche: null }, '2026-10-05'), true);
});

test('Pflichten ergeben zusammen ca. 4 Stunden, erledigte zaehlen nicht', () => {
  const alle = WOCHENAUFGABEN.map((x) => ({ ...x, erledigt_woche: null }));
  assert.equal(std(offenePflichtenMinuten(alle, '2026-10-05')), 4);
  const teil = alle.map((x) => (x.titel === 'Kochen' ? { ...x, erledigt_woche: '2026-10-05' } : x));
  assert.equal(std(offenePflichtenMinuten(teil, '2026-10-07')), 3);
});

test('Warnungen: knapper Tag und knappe Woche', () => {
  const w1 = warnungen({ tagMin: 120, restWocheMin: 1000, pflichtenMin: 180 });
  assert.ok(w1.some((x) => /heute/i.test(x)));
  const w2 = warnungen({ tagMin: 300, restWocheMin: 200, pflichtenMin: 180 });
  assert.ok(w2.some((x) => /woche/i.test(x)));
  assert.deepEqual(warnungen({ tagMin: 300, restWocheMin: 1000, pflichtenMin: 180 }), []);
});

test('briefingFaellig: ab der Sendezeit, 2 Stunden Fenster', () => {
  const zeiten = { 1: '06:00', 4: '06:00', 6: '09:30', 7: '08:30' };
  assert.equal(briefingFaellig('2026-10-08', 5 * 60 + 59, zeiten), false);
  assert.equal(briefingFaellig('2026-10-08', 6 * 60, zeiten), true);
  assert.equal(briefingFaellig('2026-10-08', 7 * 60 + 59, zeiten), true);
  assert.equal(briefingFaellig('2026-10-08', 8 * 60 + 1, zeiten), false);
  assert.equal(briefingFaellig('2026-10-10', 9 * 60 + 30, zeiten), true); // Samstag
  assert.equal(briefingFaellig('2026-10-09', 9 * 60, zeiten), false); // Freitag nicht konfiguriert
});

test('wetterText: Regen-Stufen und Ausfall', () => {
  assert.equal(wetterText(null).kopf, 'Wetter gerade nicht verfügbar.');
  const w = { aktuell: { temp: 11, code: 3, regenProzent: 60 }, hoch: 12, tief: 7, wind: 15, stunden: { 6: { temp: 9, mm: 0.4, prozent: 70 }, 16: { temp: 12, mm: 0, prozent: 10 } } };
  const t = wetterText(w);
  assert.match(t.kopf, /11 Grad, bedeckt, 60 % Regen/);
  assert.match(t.wege, /6:45: leichter Regen/);
  assert.match(t.wege, /16:15: trocken/);
});

test('Briefing Donnerstag 08.10.2026: Format wie im Beispiel', () => {
  const termine = [];
  const aufgaben = WOCHENAUFGABEN.map((x) => ({ ...x, erledigt_woche: ['Bad putzen', 'Einkaufen gehen', 'Sport machen'].includes(x.titel) ? null : '2026-10-05' }));
  const wetter = { aktuell: { temp: 11, code: 3, regenProzent: 60 }, hoch: 12, tief: 7, wind: 15, stunden: { 6: { temp: 9, mm: 0.4, prozent: 70 }, 16: { temp: 12, mm: 0, prozent: 10 } } };
  const text = baueBriefing({
    datum: '2026-10-08', minuten: 6 * 60, ...daten({ termine }), aufgaben, zuKlaeren: ['Zahnarzttermin finden'], wetter,
  });
  const z = text.split('\n');
  assert.equal(z[0], 'Guten Morgen Mark, Donnerstag, 8.10.2026');
  assert.ok(text.includes('Wetter Lemgo: 11 Grad, bedeckt, 60 % Regen'));
  assert.ok(text.includes('- 6:15 Aufstehen'));
  assert.ok(text.includes('- 7:30 bis 16:00 Arbeit'));
  assert.ok(text.includes('- 17:30 Gespräch bei Frau Wiethaupt'));
  assert.ok(text.includes('- 19:00 bis 22:00 Jugend in Detmold'));
  assert.ok(text.includes('Essen: 9:15 2. Frühstück, 12:30 Mittagessen, 18:30 Snack'));
  assert.ok(text.includes('Flexible Zeit heute: 2 h'));
  assert.ok(text.includes('- 16:30 bis 17:30'));
  assert.ok(text.includes('- 22:00 bis 23:00'));
  assert.ok(text.includes('Noch offen diese Woche:'));
  assert.ok(text.includes('Bad putzen'));
  assert.ok(text.includes('Zu klären:'));
  assert.ok(text.includes('- Zahnarzttermin finden'));
  assert.ok(text.includes('Morgen: Arbeit bis 14:00'));
  assert.ok(text.includes('Schlafen: 23:00'));
  assert.ok(Math.max(...z.map((l) => l.length)) <= 60, 'kurze Zeilen fuers Handy');
});

test('Briefing ohne Wetter geht trotzdem raus', () => {
  const text = baueBriefing({ datum: '2026-10-10', minuten: 9 * 60 + 30, ...daten(), aufgaben: [], zuKlaeren: [], wetter: null });
  assert.ok(text.startsWith('Guten Morgen Mark, Samstag, 10.10.2026'));
  assert.ok(text.includes('Wetter gerade nicht verfügbar.'));
});

test('Seed-Daten: 7 offene Punkte, 11 Wochenaufgaben, jeder Block hat einen eindeutigen Schluessel', () => {
  assert.equal(ZU_KLAEREN.length, 7);
  assert.equal(WOCHENAUFGABEN.length, 11);
  const keys = GRUNDWOCHE.map((x) => x.schluessel);
  assert.equal(new Set(keys).size, keys.length);
});

// ---- Schritt 2: Wetter-Parser und Briefing-Meldung ----
import { wetterAusOpenMeteo, briefingMeldung } from '../supabase/functions/push-senden/wochenplan.js';

const omFixture = () => {
  const zeit = Array.from({ length: 24 }, (_, h) => `2026-10-08T${String(h).padStart(2, '0')}:00`);
  return {
    hourly: {
      time: zeit,
      temperature_2m: zeit.map((_, h) => 5 + h / 2),
      precipitation: zeit.map((_, h) => (h === 6 ? 0.4 : 0)),
      precipitation_probability: zeit.map((_, h) => (h === 6 ? 70 : 10)),
      weather_code: zeit.map(() => 3),
    },
    daily: { temperature_2m_max: [12], temperature_2m_min: [7], wind_speed_10m_max: [15.2] },
  };
};

test('wetterAusOpenMeteo: aktuelle Stunde, Wegstunden 6 und 16, Hoch/Tief/Wind', () => {
  const w = wetterAusOpenMeteo(omFixture(), 6);
  assert.equal(w.aktuell.temp, 8);
  assert.equal(w.aktuell.code, 3);
  assert.equal(w.aktuell.regenProzent, 70);
  assert.equal(w.stunden[6].mm, 0.4);
  assert.equal(w.stunden[16].mm, 0);
  assert.equal(w.hoch, 12);
  assert.equal(w.tief, 7);
  assert.equal(w.wind, 15.2);
  assert.equal(wetterText(w).wege, 'Weg zum Zug 6:45: leichter Regen. Heimweg 16:15: trocken.');
});

test('wetterAusOpenMeteo: kaputte Antwort ergibt null (Briefing geht trotzdem raus)', () => {
  assert.equal(wetterAusOpenMeteo(null, 6), null);
  assert.equal(wetterAusOpenMeteo({}, 6), null);
  assert.equal(wetterAusOpenMeteo({ hourly: { time: [] }, daily: {} }, 6), null);
});

test('briefingMeldung: nur im Sendefenster, Schluessel pro Tag, Link auf #/woche', () => {
  const zeiten = { 4: '06:00' };
  const basis = { datum: '2026-10-08', zeiten, ...daten(), aufgaben: [], zuKlaeren: [], wetter: null };
  const m = briefingMeldung({ ...basis, minuten: 6 * 60 + 15 });
  assert.equal(m.art, 'briefing');
  assert.equal(m.schluessel, 'briefing:2026-10-08');
  assert.equal(m.url, '#/woche');
  assert.match(m.titel, /Donnerstag/);
  assert.ok(m.text.includes('Flexible Zeit heute: 2 h'));
  assert.equal(briefingMeldung({ ...basis, minuten: 5 * 60 }), null);
  assert.equal(briefingMeldung({ ...basis, minuten: 9 * 60 }), null);
});
