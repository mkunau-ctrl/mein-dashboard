import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus,
  kategorisiereIconTyp, kontostandProKonto, gesamtKontostand,
  unechterGesamtKontostand, schuldenRestbetrag, offeneSchulden,
  sortiereSchulden, nettoVermoegen, zeitraumVon,
  summenProKategorieZeitraum, summenProBezeichnungZeitraum,
  letzteMonate, jahresUebersicht, kontostandVerlauf, zuCsvZeilen }
  from '../js/module/finanzen/berechnung.js';

const konten = [
  { id: 'k1', name: 'Hauptkonto', kontostand_start: 500, stand_datum: '2026-09-01' },
  { id: 'k2', name: 'Trade Republic', kontostand_start: 1000, stand_datum: '2026-09-01' },
];

const expenses = [
  { betrag: 20, kategorie: 'tanken', datum: '2026-09-01', konto_id: 'k1' },
  { betrag: 50, kategorie: 'lebensmittel', datum: '2026-09-05', konto_id: 'k1' },
  { betrag: 15, kategorie: 'lebensmittel', datum: '2026-09-10', konto_id: 'k1' },
  { betrag: 100, kategorie: 'tanken', datum: '2026-08-20', konto_id: 'k1' }, // vor stand_datum
];

const einnahmen = [
  { betrag: 750, bezeichnung: 'Ausbildungsverguetung', datum: '2026-09-03', konto_id: 'k1' },
  { betrag: 200, bezeichnung: 'Dividende', datum: '2026-09-04', konto_id: 'k2' },
];

test('summeProMonat: nur der angegebene Monat', () => {
  assert.equal(summeProMonat(expenses, 2026, 9), 20 + 50 + 15);
  assert.equal(summeProMonat(expenses, 2026, 8), 100);
});

test('summenProKategorie: absteigend sortiert, nur der Monat', () => {
  assert.deepEqual(summenProKategorie(expenses, 2026, 9), [
    { kategorie: 'lebensmittel', summe: 65 },
    { kategorie: 'tanken', summe: 20 },
  ]);
});

test('erkenneAbos: erkennt monatlich wiederkehrende gleiche Notiz', () => {
  const abo = [
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-07-15' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-08-14' },
    { betrag: 15.99, kategorie: 'abo', notiz: 'Netflix', datum: '2026-09-15' },
  ];
  const ergebnis = erkenneAbos(abo);
  assert.equal(ergebnis.length, 1);
  assert.equal(ergebnis[0].haendler, 'Netflix');
  assert.equal(ergebnis[0].betrag, 15.99);
});

test('erkenneAbos: ignoriert unregelmaessige Abstaende', () => {
  const unregelmaessig = [
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-01-05' },
    { betrag: 20, kategorie: 'sonstiges', notiz: 'Werkstatt', datum: '2026-06-20' },
  ];
  assert.deepEqual(erkenneAbos(unregelmaessig), []);
});

test('erkenneAbos: ignoriert einmalige Ausgaben ohne Wiederholung', () => {
  assert.deepEqual(erkenneAbos([
    { betrag: 50, kategorie: 'lebensmittel', notiz: 'Rewe', datum: '2026-09-01' },
  ]), []);
});

const teile = [
  { bezeichnung: 'Display iPhone 15', bestand: 2, einzelwert: 60, status: 'da' },
  { bezeichnung: 'Akku iPhone 13', bestand: 0, einzelwert: 25, status: 'fehlt' },
  { bezeichnung: 'Rückglas iPhone 14', bestand: 1, einzelwert: 15, status: 'bestellt' },
  { bezeichnung: 'Schraubenset', bestand: 5, status: 'da' }, // kein einzelwert
];

test('warenwert: Summe bestand mal einzelwert, fehlender Wert zaehlt als 0', () => {
  assert.equal(warenwert(teile), 2 * 60 + 0 * 25 + 1 * 15 + 5 * 0);
});

test('sortiereTeile: fehlt vor bestellt vor da, sonst alphabetisch', () => {
  const namen = sortiereTeile(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, [
    'Akku iPhone 13', 'Rückglas iPhone 14', 'Display iPhone 15', 'Schraubenset',
  ]);
});

test('merkliste: nur status != da', () => {
  const namen = merkliste(teile).map((t) => t.bezeichnung);
  assert.deepEqual(namen, ['Akku iPhone 13', 'Rückglas iPhone 14']);
});

test('naechsterStatus: zyklisch fehlt -> bestellt -> da -> fehlt', () => {
  assert.equal(naechsterStatus('fehlt'), 'bestellt');
  assert.equal(naechsterStatus('bestellt'), 'da');
  assert.equal(naechsterStatus('da'), 'fehlt');
});

test('kontostandProKonto: Start plus Einnahmen minus Ausgaben seit stand_datum', () => {
  assert.equal(kontostandProKonto(konten[0], expenses, einnahmen, '2026-09-16'), 500 + 750 - (20 + 50 + 15));
  assert.equal(kontostandProKonto(konten[1], expenses, einnahmen, '2026-09-16'), 1000 + 200);
});

test('kontostandProKonto: Buchungen anderer Konten und nach "heute" zaehlen nicht', () => {
  assert.equal(kontostandProKonto(konten[0], expenses, einnahmen, '2026-09-02'), 500 + 0 - 20);
});

test('gesamtKontostand: Summe ueber alle Konten', () => {
  assert.equal(gesamtKontostand(konten, expenses, einnahmen, '2026-09-16'), (500 + 750 - 85) + (1000 + 200));
});

test('unechterGesamtKontostand: Gesamt-Kontostand plus Warenwert', () => {
  // Warenwert der 4 Testteile (siehe unten): 2*60+0*25+1*15+5*0 = 135
  assert.equal(unechterGesamtKontostand(konten, expenses, einnahmen, teile, '2026-09-16'), 2365 + 135);
});

test('kategorisiereIconTyp: erkennt Auto/Essen/Freizeit anhand Stichwoertern, sonst sonstiges', () => {
  assert.equal(kategorisiereIconTyp('Tanken'), 'auto');
  assert.equal(kategorisiereIconTyp('KFZ-Werkstatt'), 'auto');
  assert.equal(kategorisiereIconTyp('Lebensmittel'), 'essen');
  assert.equal(kategorisiereIconTyp('Supermarkt'), 'essen');
  assert.equal(kategorisiereIconTyp('Kino'), 'freizeit');
  assert.equal(kategorisiereIconTyp('Miete'), 'sonstiges');
  assert.equal(kategorisiereIconTyp(''), 'sonstiges');
  assert.equal(kategorisiereIconTyp(undefined), 'sonstiges');
});

const schulden = [
  { id: 's1', person: 'Tom', gesamtbetrag: 100, richtung: 'mir_wird_geschuldet', erstellt_am: '2026-09-01' },
  { id: 's2', person: 'Lisa', gesamtbetrag: 50, richtung: 'ich_schulde', erstellt_am: '2026-09-05' },
  { id: 's3', person: 'Max', gesamtbetrag: 30, richtung: 'ich_schulde', erstellt_am: '2026-08-01' },
];
const zahlungen = [
  { schuld_id: 's1', betrag: 40, datum: '2026-09-10' },
  { schuld_id: 's3', betrag: 30, datum: '2026-09-02' }, // vollstaendig beglichen
];

test('schuldenRestbetrag: Gesamtbetrag minus Summe der Zahlungen', () => {
  assert.equal(schuldenRestbetrag(schulden[0], zahlungen), 60);
  assert.equal(schuldenRestbetrag(schulden[1], zahlungen), 50);
  assert.equal(schuldenRestbetrag(schulden[2], zahlungen), 0);
});

test('offeneSchulden: nur Restbetrag groesser 0', () => {
  const namen = offeneSchulden(schulden, zahlungen).map((s) => s.person);
  assert.deepEqual(namen, ['Tom', 'Lisa']);
});

test('sortiereSchulden: offene vor beglichenen, offene nach Restbetrag absteigend', () => {
  const namen = sortiereSchulden(schulden, zahlungen).map((s) => s.person);
  assert.deepEqual(namen, ['Tom', 'Lisa', 'Max']);
});

test('nettoVermoegen: Gesamt-Kontostand plus Warenwert plus Forderungen minus Verbindlichkeiten', () => {
  // unechterGesamtKontostand = 2500 (siehe oben), Forderungen (mir_wird_geschuldet, Rest) = 60, Verbindlichkeiten (ich_schulde, Rest) = 50 + 0
  assert.equal(
    nettoVermoegen(konten, expenses, einnahmen, teile, schulden, zahlungen, '2026-09-16'),
    2500 + 60 - 50,
  );
});

test('zeitraumVon: Tage-Bereiche', () => {
  assert.equal(zeitraumVon('7T', '2026-09-21'), '2026-09-14');
  assert.equal(zeitraumVon('30T', '2026-09-21'), '2026-08-22');
});

test('zeitraumVon: Monats-Bereiche, inkl. Jahreswechsel bei 1J', () => {
  assert.equal(zeitraumVon('3M', '2026-09-21'), '2026-06-21');
  assert.equal(zeitraumVon('6M', '2026-09-21'), '2026-03-21');
  assert.equal(zeitraumVon('1J', '2026-09-21'), '2025-09-21');
});

test('summenProKategorieZeitraum: wie summenProKategorie, aber Datumsfenster statt Kalendermonat', () => {
  assert.deepEqual(summenProKategorieZeitraum(expenses, '2026-09-01', '2026-09-16'), [
    { kategorie: 'lebensmittel', summe: 65 },
    { kategorie: 'tanken', summe: 20 },
  ]);
});

test('summenProBezeichnungZeitraum: gruppiert Einnahmen nach Bezeichnung im Datumsfenster', () => {
  assert.deepEqual(summenProBezeichnungZeitraum(einnahmen, '2026-09-01', '2026-09-16'), [
    { bezeichnung: 'Ausbildungsverguetung', summe: 750 },
    { bezeichnung: 'Dividende', summe: 200 },
  ]);
});

test('letzteMonate: die letzten n Kalendermonate inkl. dem aktuellen, aelteste zuerst', () => {
  assert.deepEqual(letzteMonate(3, '2026-09-21'), [
    { jahr: 2026, monat: 7 }, { jahr: 2026, monat: 8 }, { jahr: 2026, monat: 9 },
  ]);
});

test('letzteMonate: Jahreswechsel wird korrekt ueberschritten', () => {
  assert.deepEqual(letzteMonate(6, '2026-01-15'), [
    { jahr: 2025, monat: 8 }, { jahr: 2025, monat: 9 }, { jahr: 2025, monat: 10 },
    { jahr: 2025, monat: 11 }, { jahr: 2025, monat: 12 }, { jahr: 2026, monat: 1 },
  ]);
});

test('jahresUebersicht: Summen und Sparquote fuers Jahr', () => {
  // einnahmenSumme 950 (750+200), ausgabenSumme 185 (20+50+15+100), Sparquote (950-185)/950*100 = 80.5
  assert.deepEqual(jahresUebersicht(expenses, einnahmen, 2026), {
    einnahmenSumme: 950, ausgabenSumme: 185, sparquote: 80.5,
  });
});

test('jahresUebersicht: Sparquote ist null ohne Einnahmen (keine Division durch 0)', () => {
  assert.deepEqual(jahresUebersicht([], [], 2026), {
    einnahmenSumme: 0, ausgabenSumme: 0, sparquote: null,
  });
});

test('kontostandVerlauf: ein Eintrag pro Tag, Buchung wirkt erst ab ihrem Datum', () => {
  const konten2 = [{ id: 'k1', name: 'Hauptkonto', kontostand_start: 500, stand_datum: '2026-09-01' }];
  const expenses2 = [{ betrag: 20, kategorie: 'tanken', datum: '2026-09-09', konto_id: 'k1' }];
  assert.deepEqual(kontostandVerlauf(konten2, expenses2, [], 3, '2026-09-10'), [
    { datum: '2026-09-08', stand: 500 },
    { datum: '2026-09-09', stand: 480 },
    { datum: '2026-09-10', stand: 480 },
  ]);
});

test('zuCsvZeilen: Header plus eine Zeile pro Transaktion, Anfuehrungszeichen werden escaped', () => {
  const zeilen = zuCsvZeilen([
    { datum: '2026-09-01', typ: 'ausgabe', bezeichnung: 'Tanken', betrag: 20, quelle: 'manuell' },
    { datum: '2026-09-03', typ: 'einnahme', bezeichnung: 'Kunde "Max"', betrag: 750, quelle: 'manuell' },
  ]);
  assert.deepEqual(zeilen, [
    'Datum,Typ,Bezeichnung,Betrag,Quelle',
    '2026-09-01,ausgabe,"Tanken",20.00,manuell',
    '2026-09-03,einnahme,"Kunde ""Max""",750.00,manuell',
  ]);
});

test('zuCsvZeilen: Bezeichnung mit fuehrendem =/+/-/@ wird mit Apostroph entschaerft (CSV-Formel-Injection)', () => {
  const zeilen = zuCsvZeilen([
    { datum: '2026-09-01', typ: 'ausgabe', bezeichnung: '=cmd|"/c calc"!A1', betrag: 5, quelle: 'manuell' },
    { datum: '2026-09-02', typ: 'ausgabe', bezeichnung: '+SUMME(A1:A9)', betrag: 5, quelle: 'manuell' },
  ]);
  assert.deepEqual(zeilen, [
    'Datum,Typ,Bezeichnung,Betrag,Quelle',
    '2026-09-01,ausgabe,"\'=cmd|""/c calc""!A1",5.00,manuell',
    '2026-09-02,ausgabe,"\'+SUMME(A1:A9)",5.00,manuell',
  ]);
});
