// Reine Logik fuer Wochenplan, flexible Zeit und Tagesbriefing (kein Netz/DB/DOM).
// Getestet in test/wochenplan.test.js. Datumsangaben sind 'YYYY-MM-DD' (Europe/Berlin), Zeiten Minuten ab 0:00.

const WOCHENTAGE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// ---------- Datum / Zeit ----------
const alsDatum = (datum) => new Date(`${datum}T12:00:00Z`);

export function wochentagVon(datum) {
  const d = alsDatum(datum).getUTCDay();
  return d === 0 ? 7 : d;
}

export function addTage(datum, n) {
  const d = alsDatum(datum);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function montagVon(datum) {
  return addTage(datum, -(wochentagVon(datum) - 1));
}

// Lemgo-Gottesdienst: alle 2 Wochen sonntags; Woche = Montag bis Sonntag
export function istLemgoWoche(datum, anker) {
  const sonntag = addTage(montagVon(datum), 6);
  const diff = Math.round((alsDatum(sonntag) - alsDatum(anker)) / 86400000);
  return diff % 14 === 0;
}

function minutenVon(text) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(text ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const uhr = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

function stundenText(min) {
  const h = Math.round((min / 60) * 10) / 10;
  return `${String(h).replace('.', ',')} h`;
}

// ---------- Tagesplan ----------
// Ergebnis: sortierte Segmente { von, bis, art, titel, ende_offen?, ort? }
export function segmenteFuerTag(datum, { bloecke = [], ausnahmen = [], termine = [] }) {
  const tag = wochentagVon(datum);
  const ausgesetzt = new Set(ausnahmen.filter((a) => a.datum === datum).map((a) => a.block_schluessel));
  const seg = [];
  for (const b of bloecke) {
    if (b.wochentag !== tag || ausgesetzt.has(b.schluessel)) continue;
    if (b.rhythmus && (b.rhythmus.modus === 'mit') !== istLemgoWoche(datum, b.rhythmus.anker)) continue;
    seg.push({ von: minutenVon(b.von), bis: minutenVon(b.bis), art: b.art, titel: b.titel, ende_offen: !!b.ende_offen });
  }
  for (const t of termine) {
    if (t.erledigt || t.faellig_am !== datum) continue;
    const von = minutenVon(t.uhrzeit);
    if (von === null) { seg.push({ von: 0, bis: 0, art: 'ganztags', titel: t.titel }); continue; }
    const bis = minutenVon(t.bis_uhrzeit);
    seg.push({ von, bis: bis ?? von + 60, art: 'termin', titel: t.titel, ort: t.ort, ende_offen: bis === null });
  }
  return seg.sort((a, b) => a.von - b.von || a.bis - b.bis);
}

// Flexible Zeitfenster: flex-Bloecke minus alles andere (Termine, Arbeit, Essen ...), angrenzende zusammengefasst
export function flexFenster(datum, daten) {
  const seg = segmenteFuerTag(datum, daten);
  const blocker = seg.filter((s) => !['flex', 'schlaf', 'ganztags'].includes(s.art) && s.bis > s.von);
  let fenster = [];
  for (const f of seg.filter((s) => s.art === 'flex')) {
    let teile = [{ von: f.von, bis: f.bis }];
    for (const bl of blocker) {
      teile = teile.flatMap((t) => {
        if (bl.bis <= t.von || bl.von >= t.bis) return [t];
        const rest = [];
        if (bl.von > t.von) rest.push({ von: t.von, bis: bl.von });
        if (bl.bis < t.bis) rest.push({ von: bl.bis, bis: t.bis });
        return rest;
      });
    }
    fenster.push(...teile);
  }
  fenster = fenster.filter((f) => f.bis > f.von).sort((a, b) => a.von - b.von);
  const merged = [];
  for (const f of fenster) {
    const letzte = merged[merged.length - 1];
    if (letzte && f.von <= letzte.bis) letzte.bis = Math.max(letzte.bis, f.bis);
    else merged.push({ ...f });
  }
  return merged;
}

export const flexMinuten = (datum, daten) => flexFenster(datum, daten).reduce((s, f) => s + (f.bis - f.von), 0);

// Gesamte flexible Zeit der Woche (Montag bis Sonntag), in der datum liegt
export function wochenFlexMinuten(datum, daten) {
  const montag = montagVon(datum);
  let summe = 0;
  for (let i = 0; i < 7; i++) summe += flexMinuten(addTage(montag, i), daten);
  return summe;
}

// Flexible Zeit ab jetzt (heute nur noch der Rest) bis Sonntag
export function restFlexWoche(datum, minuten, daten) {
  const bisSonntag = 7 - wochentagVon(datum);
  let summe = 0;
  for (let i = 0; i <= bisSonntag; i++) {
    const tag = addTage(datum, i);
    for (const f of flexFenster(tag, daten)) {
      const von = i === 0 ? Math.max(f.von, minuten) : f.von;
      if (f.bis > von) summe += f.bis - von;
    }
  }
  return summe;
}

export function schlafenszeit(datum, daten) {
  const s = segmenteFuerTag(datum, daten).find((x) => x.art === 'schlaf');
  return s ? uhr(s.von) : null;
}

// ---------- Wochenaufgaben ----------
export const aufgabeOffen = (a, datum) => a.erledigt_woche !== montagVon(datum);

export function offenePflichtenMinuten(aufgaben, datum) {
  return aufgaben.filter((a) => a.pflicht && aufgabeOffen(a, datum)).reduce((s, a) => s + (a.dauer_min ?? 0), 0);
}

export function warnungen({ tagMin, restWocheMin, pflichtenMin }) {
  const aus = [];
  if (tagMin <= 120) aus.push(`Heute nur ${stundenText(tagMin)} flexibel, nichts Großes planen.`);
  if (restWocheMin <= pflichtenMin + 120) aus.push(`Woche knapp: Pflichten ca. ${stundenText(pflichtenMin)} bei ${stundenText(restWocheMin)} frei.`);
  return aus;
}

// ---------- Briefing ----------
// zeiten: { 1: '06:00', ... 7: '08:30' } je Wochentag; Fenster 2 Stunden ab Sendezeit
export function briefingFaellig(datum, minuten, zeiten) {
  const z = (zeiten ?? {})[wochentagVon(datum)];
  const start = minutenVon(z);
  if (start === null) return false;
  return minuten >= start && minuten < start + 120;
}

const WETTER_CODES = [
  [[0], 'klar'], [[1, 2], 'heiter'], [[3], 'bedeckt'], [[45, 48], 'Nebel'],
  [[51, 52, 53, 54, 55, 56, 57], 'Nieselregen'], [[61, 62, 63, 64, 65, 66, 67], 'Regen'],
  [[71, 72, 73, 74, 75, 76, 77], 'Schnee'], [[80, 81, 82], 'Schauer'], [[85, 86], 'Schneeschauer'], [[95, 96, 99], 'Gewitter'],
];
const codeText = (code) => (WETTER_CODES.find(([codes]) => codes.includes(code)) ?? [null, 'wechselhaft'])[1];
const regenWort = (mm) => (mm < 0.1 ? 'trocken' : mm < 1 ? 'leichter Regen' : mm < 4 ? 'Regen' : 'starker Regen');

// wetter: { aktuell:{temp,code,regenProzent}, hoch, tief, wind, stunden:{ 6:{temp,mm,prozent}, 16:{...} } } oder null
export function wetterText(wetter, wochenende = false) {
  if (!wetter) return { kopf: 'Wetter gerade nicht verfügbar.', wege: null };
  const a = wetter.aktuell;
  if (wochenende) {
    return { kopf: `Wetter Lemgo: ${Math.round(wetter.tief)} bis ${Math.round(wetter.hoch)} Grad, ${codeText(a.code)}, ${a.regenProzent} % Regen`, wege: `Wind ${Math.round(wetter.wind)} km/h` };
  }
  const kopf = `Wetter Lemgo: ${Math.round(a.temp)} Grad, ${codeText(a.code)}, ${a.regenProzent} % Regen`;
  const s6 = wetter.stunden?.[6];
  const s16 = wetter.stunden?.[16];
  const teile = [];
  if (s6) teile.push(`Weg zum Zug 6:45: ${regenWort(s6.mm)}.`);
  if (s16) teile.push(`Heimweg 16:15: ${regenWort(s16.mm)}.`);
  return { kopf, wege: teile.length ? teile.join(' ') : null };
}

// Teile mit ", " verbinden und auf Zeilen von max. 60 Zeichen umbrechen
function wickle(prefix, teile, max = 60) {
  const zeilen = [];
  let aktuell = prefix;
  teile.forEach((t, i) => {
    const kandidat = i === 0 ? `${aktuell}${t}` : `${aktuell}, ${t}`;
    if (kandidat.length > max && i > 0) { zeilen.push(`${aktuell},`); aktuell = `  ${t}`; } else aktuell = kandidat;
  });
  zeilen.push(aktuell);
  return zeilen;
}

function listenZeile(s) {
  if (s.art === 'ganztags') return `- ganztags ${s.titel}`;
  const titel = s.art === 'routine' ? s.titel.split(',')[0] : s.titel;
  if (s.art === 'routine' || s.ende_offen) return `- ${uhr(s.von)} ${titel}`;
  return `- ${uhr(s.von)} bis ${uhr(s.bis)} ${titel}`;
}

export function baueBriefing({ datum, minuten, bloecke = [], ausnahmen = [], termine = [], aufgaben = [], zuKlaeren = [], wetter = null }) {
  const daten = { bloecke, ausnahmen, termine };
  const tag = wochentagVon(datum);
  const [j, m, t] = datum.split('-').map(Number);
  const seg = segmenteFuerTag(datum, daten);
  const z = [`Guten Morgen Mark, ${WOCHENTAGE[tag]}, ${t}.${m}.${j}`, ''];

  const w = wetterText(wetter, tag >= 6);
  z.push(w.kopf);
  if (w.wege) z.push(w.wege);
  z.push('');

  z.push('Heute:');
  const erstesRoutine = seg.find((s) => s.art === 'routine');
  const heute = seg.filter((s) => ['fest', 'arbeit', 'termin', 'ganztags'].includes(s.art) || s === erstesRoutine);
  if (heute.length) z.push(...heute.map(listenZeile)); else z.push('- nichts Festes');
  z.push('');

  const essen = seg.filter((s) => s.art === 'essen').map((s) => `${uhr(s.von)} ${s.titel}`);
  if (essen.length) z.push(...wickle('Essen: ', essen), '');

  const fenster = flexFenster(datum, daten);
  const tagMin = fenster.reduce((s, f) => s + (f.bis - f.von), 0);
  z.push(`Flexible Zeit heute: ${tagMin ? stundenText(tagMin) : 'keine'}`);
  z.push(...fenster.map((f) => `- ${uhr(f.von)} bis ${uhr(f.bis)}`));
  const restMin = restFlexWoche(datum, minuten, daten);
  const pflichtenMin = offenePflichtenMinuten(aufgaben, datum);
  for (const x of warnungen({ tagMin, restWocheMin: restMin, pflichtenMin })) z.push(x);
  z.push('');

  const offen = aufgaben.filter((a) => aufgabeOffen(a, datum)).map((a) => a.titel);
  z.push('Noch offen diese Woche:');
  if (offen.length) z.push(...wickle('- ', offen));
  else z.push('- alles erledigt');
  z.push(`Woche noch ${stundenText(restMin)} flexibel, Pflichten ca. ${stundenText(pflichtenMin)} offen`);

  if (zuKlaeren.length) {
    z.push('', 'Zu klären:');
    z.push(...zuKlaeren.slice(0, 5).map((x) => `- ${x}`));
    if (zuKlaeren.length > 5) z.push(`- und ${zuKlaeren.length - 5} weitere im Dashboard`);
  }

  const morgenDatum = addTage(datum, 1);
  const morgenSeg = segmenteFuerTag(morgenDatum, daten);
  // Reihenfolge: Arbeit, dann Termine nach Uhrzeit, zuletzt ganztaegige
  const teile = [
    ...morgenSeg.filter((s) => s.art === 'arbeit').map((s) => `Arbeit bis ${uhr(s.bis)}`),
    ...morgenSeg.filter((s) => s.art === 'termin' || s.art === 'fest').map((s) => `${uhr(s.von)} ${s.titel}`),
    ...morgenSeg.filter((s) => s.art === 'ganztags').map((s) => s.titel),
  ];
  z.push('', ...wickle('Morgen: ', teile.slice(0, 3).length ? teile.slice(0, 3) : ['nichts Festes']));
  const aufstehen = morgenSeg.find((s) => s.art === 'routine');
  if (aufstehen) z.push(`Aufstehen morgen: ${uhr(aufstehen.von)}`);
  const schlaf = schlafenszeit(datum, daten);
  if (schlaf) z.push(`Schlafen: ${schlaf}`);
  return z.join('\n');
}

// Open-Meteo-Antwort (hourly + daily, timezone=Europe/Berlin, 1 Tag) in das Format fuer wetterText().
// stunde = aktuelle Stunde (0-23). Bei fehlenden/kaputten Daten null -> Briefing meldet "Wetter nicht verfuegbar".
export function wetterAusOpenMeteo(json, stunde) {
  const h = json?.hourly;
  const d = json?.daily;
  if (!h?.time?.length || !d?.temperature_2m_max?.length) return null;
  const idx = (std) => h.time.findIndex((t) => Number(String(t).slice(11, 13)) === std);
  const an = (i) => ({ temp: h.temperature_2m[i], code: h.weather_code[i], mm: h.precipitation[i] ?? 0, prozent: h.precipitation_probability[i] ?? 0 });
  const jetzt = idx(stunde);
  if (jetzt < 0) return null;
  const stunden = {};
  for (const std of [6, 16]) {
    const i = idx(std);
    if (i >= 0) stunden[std] = an(i);
  }
  const a = an(jetzt);
  return {
    aktuell: { temp: a.temp, code: a.code, regenProzent: a.prozent },
    hoch: d.temperature_2m_max[0],
    tief: d.temperature_2m_min[0],
    wind: d.wind_speed_10m_max?.[0] ?? 0,
    stunden,
  };
}

// Push-Meldung fuers Tagesbriefing oder null (ausserhalb des Sendefensters). Dedup ueber schluessel pro Tag.
export function briefingMeldung({ datum, minuten, zeiten, ...rest }) {
  if (!briefingFaellig(datum, minuten, zeiten)) return null;
  const tag = WOCHENTAGE[wochentagVon(datum)];
  return {
    art: 'briefing',
    schluessel: `briefing:${datum}`,
    titel: `Guten Morgen Mark, ${tag}`,
    text: baueBriefing({ datum, minuten, ...rest }),
    url: '#/woche',
  };
}
