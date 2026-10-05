// Grundwoche von Mark (Quelle der Wahrheit fuer die Seed-Daten der Tabelle wochenplan_bloecke).
// wochentag: 1 = Montag ... 7 = Sonntag. art: arbeit | weg | fest | flex | essen | routine | schlaf
// rhythmus: null (jede Woche) oder { anker, modus: 'mit' | 'ohne' } = nur in Wochen MIT bzw. OHNE den
// Lemgo-Gottesdienst (findet alle 2 Wochen sonntags statt, Ankerdatum 18.10.2026).
// Schlaf-Bloecke haben von == bis (Zeitpunkt).

export const LEMGO_ANKER = '2026-10-18';
const mit = { anker: LEMGO_ANKER, modus: 'mit' };
const ohne = { anker: LEMGO_ANKER, modus: 'ohne' };

// ende_offen = Dauer ist nur angenommen, im Briefing wird keine Endzeit genannt
const b = (schluessel, wochentag, von, bis, art, titel, rhythmus = null, ende_offen = false) => ({ schluessel, wochentag, von, bis, art, titel, rhythmus, ende_offen });

// Mo-Fr gemeinsam: Morgenroutine, Zug, Essen waehrend der Arbeit
const werktag = (tag, kurz) => [
  b(`${kurz}-aufstehen`, tag, '06:15', '06:45', 'routine', 'Aufstehen, Frühstück, anziehen'),
  b(`${kurz}-zug`, tag, '06:45', '07:30', 'weg', 'Zug nach Lage'),
  b(`${kurz}-fruehstueck2`, tag, '09:15', '09:30', 'essen', '2. Frühstück'),
  b(`${kurz}-mittag`, tag, '12:30', '13:00', 'essen', 'Mittagessen'),
];

export const GRUNDWOCHE = [
  // Montag
  ...werktag(1, 'mo'),
  b('mo-arbeit', 1, '07:30', '16:00', 'arbeit', 'Arbeit'),
  b('mo-jungschar', 1, '16:00', '18:00', 'fest', 'Jungschar'),
  b('mo-flex1', 1, '18:00', '19:00', 'flex', 'Flexible Zeit'),
  b('mo-abendessen', 1, '19:00', '20:00', 'essen', 'Abendessen'),
  b('mo-flex2', 1, '20:00', '22:30', 'flex', 'Flexible Zeit'),
  b('mo-schlaf', 1, '22:30', '22:30', 'schlaf', 'Schlafen'),

  // Dienstag
  ...werktag(2, 'di'),
  b('di-arbeit', 2, '07:30', '16:00', 'arbeit', 'Arbeit'),
  b('di-heimweg', 2, '16:00', '16:30', 'weg', 'Heimweg'),
  b('di-flex1', 2, '16:30', '17:30', 'flex', 'Flexible Zeit'),
  b('di-gespraech', 2, '17:30', '18:30', 'fest', 'Gespräch bei Frau Wiethaupt', null, true),
  b('di-flex2', 2, '18:30', '19:00', 'flex', 'Flexible Zeit'),
  b('di-abendessen', 2, '19:00', '20:00', 'essen', 'Abendessen'),
  b('di-flex3', 2, '20:00', '22:30', 'flex', 'Flexible Zeit'),
  b('di-schlaf', 2, '22:30', '22:30', 'schlaf', 'Schlafen'),

  // Mittwoch
  ...werktag(3, 'mi'),
  b('mi-arbeit', 3, '07:30', '16:00', 'arbeit', 'Arbeit'),
  b('mi-heimweg', 3, '16:00', '16:30', 'weg', 'Heimweg'),
  b('mi-flex1', 3, '16:30', '19:00', 'flex', 'Flexible Zeit'),
  b('mi-abendessen', 3, '19:00', '20:00', 'essen', 'Abendessen'),
  b('mi-flex2', 3, '20:00', '22:30', 'flex', 'Flexible Zeit'),
  b('mi-schlaf', 3, '22:30', '22:30', 'schlaf', 'Schlafen'),

  // Donnerstag
  ...werktag(4, 'do'),
  b('do-arbeit', 4, '07:30', '16:00', 'arbeit', 'Arbeit'),
  b('do-heimweg', 4, '16:00', '16:30', 'weg', 'Heimweg'),
  b('do-flex1', 4, '16:30', '17:30', 'flex', 'Flexible Zeit'),
  b('do-gespraech', 4, '17:30', '18:30', 'fest', 'Gespräch bei Frau Wiethaupt', null, true),
  b('do-snack', 4, '18:30', '19:00', 'essen', 'Snack'),
  b('do-jugend', 4, '19:00', '22:00', 'fest', 'Jugend in Detmold'),
  b('do-flex2', 4, '22:00', '23:00', 'flex', 'Flexible Zeit'),
  b('do-schlaf', 4, '23:00', '23:00', 'schlaf', 'Schlafen'),

  // Freitag (Arbeit nur bis 14:00)
  ...werktag(5, 'fr'),
  b('fr-arbeit', 5, '07:30', '14:00', 'arbeit', 'Arbeit'),
  b('fr-heimweg', 5, '14:00', '15:00', 'weg', 'Heimweg'),
  b('fr-flex1', 5, '15:00', '18:30', 'flex', 'Flexible Zeit'),
  b('fr-snack', 5, '18:30', '19:00', 'essen', 'Snack'),
  b('fr-jugend', 5, '19:00', '22:00', 'fest', 'Jugend in Lemgo (Homebase, CVJM)'),
  b('fr-flex2', 5, '22:00', '23:00', 'flex', 'Flexible Zeit'),
  b('fr-schlaf', 5, '23:00', '23:00', 'schlaf', 'Schlafen'),

  // Samstag
  b('sa-aufstehen', 6, '10:00', '11:00', 'routine', 'Aufstehen'),
  b('sa-flex1', 6, '11:00', '19:00', 'flex', 'Flexible Zeit'),
  b('sa-abendessen', 6, '19:00', '20:00', 'essen', 'Abendessen'),
  b('sa-flex2', 6, '20:00', '23:00', 'flex', 'Flexible Zeit'),
  b('sa-schlaf', 6, '23:00', '23:00', 'schlaf', 'Schlafen'),

  // Sonntag
  b('so-aufstehen', 7, '09:00', '09:30', 'routine', 'Aufstehen'),
  b('so-abholung', 7, '09:30', '10:00', 'fest', 'Ich werde abgeholt', null, true),
  b('so-gottesdienst', 7, '10:00', '14:00', 'fest', 'Gottesdienst Immanuel'),
  b('so-flex1', 7, '14:00', '16:00', 'flex', 'Flexible Zeit'),
  b('so-lemgo1', 7, '16:00', '19:00', 'fest', 'Gottesdienst Lemgo (Livestream)', mit),
  b('so-flex-ohne1', 7, '16:00', '19:00', 'flex', 'Flexible Zeit', ohne),
  b('so-abendessen', 7, '19:00', '20:00', 'essen', 'Abendessen'),
  b('so-lemgo2', 7, '20:00', '21:00', 'fest', 'Kaffee, Kuchen, Gemeinschaft', mit),
  b('so-flex-ohne2', 7, '20:00', '21:00', 'flex', 'Flexible Zeit', ohne),
  b('so-flex2', 7, '21:00', '22:30', 'flex', 'Flexible Zeit'),
  b('so-schlaf', 7, '22:30', '22:30', 'schlaf', 'Schlafen'),
];

// Wochenaufgaben: Pflichten (zaehlen zu den ca. 4 h) und Wuensche (ohne feste Stundenzahl)
export const WOCHENAUFGABEN = [
  { titel: 'Bad putzen', dauer_min: 45, pflicht: true },
  { titel: 'Kochen', dauer_min: 60, pflicht: true },
  { titel: 'Einkaufen gehen', dauer_min: 60, pflicht: true },
  { titel: 'Sport machen', dauer_min: 45, pflicht: true },
  { titel: 'Woche planen', dauer_min: 10, pflicht: true },
  { titel: 'Tag planen', dauer_min: 5, pflicht: true },
  { titel: 'Kalender eintragen', dauer_min: 10, pflicht: true },
  { titel: 'Alltägliches', dauer_min: 5, pflicht: true },
  { titel: 'Zimmer aufräumen', dauer_min: 0, pflicht: false },
  { titel: 'An meinen Projekten weiterarbeiten', dauer_min: 0, pflicht: false },
  { titel: 'Handys reparieren (Nebengeschäft)', dauer_min: 0, pflicht: false },
];

// titel = kurze Zeile fuers Briefing, notiz = Langtext
export const ZU_KLAEREN = [
  { titel: 'Zahnarzttermin finden (Montag?)', notiz: 'Ich glaube, er ist an einem Montag. Er stand in keinem durchsuchten Kalender. Termin oder Mail dazu finden.' },
  { titel: 'Jugendband-Probe: fest? Kollidiert mit Essen', notiz: 'Kalender sagt alle zwei Wochen montags 18:00-20:00 (zuletzt 05.10.2026). Kollidiert mit Abendessen um 19:00. Klären, ob die Probe fest ist, und dann in die Wochenstruktur aufnehmen.' },
  { titel: 'Do Heimweg Detmold: Zug oder abgeholt?', notiz: 'Jugend endet 22:00. Wie komme ich heim (Zug oder abgeholt) und wann bin ich im Bett? Bis dahin sind nur ca. 7 Stunden Schlaf sicher.' },
  { titel: 'So mit Lemgo-Gottesdienst: Essen um 19:00?', notiz: 'Wo esse ich um 19:00, wenn ich noch in Lemgo bin?' },
  { titel: 'Jungschar XXL: Ort und Uhrzeiten', notiz: 'Ort (Seefall oder Lemgo) und genaue Uhrzeiten klären.' },
  { titel: 'Gespräche Frau Wiethaupt: Dauer prüfen', notiz: 'Ich habe 1 Stunde angenommen. Prüfen.' },
  { titel: 'Fr 9.10.: Zeitplan Bielefeld und XXL', notiz: 'Zeit zwischen Arbeitsende, Bielefeld und XXL-Beginn prüfen (14:00 Zug, 15:00 Termin, danach Abfahrt zur Übernachtung).' },
];
