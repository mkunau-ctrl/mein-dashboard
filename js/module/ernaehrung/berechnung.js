// Reine Statistik-Rechnung fürs Ernährungsmodul. Kein Netz, keine DOM.
// Datum überall als 'YYYY-MM-DD'.
import { istFaellig } from './zeitplan.js';

const TAG_MS = 86_400_000;
const tagMs = (s) => Date.parse(s.slice(0, 10) + 'T00:00:00Z');
const alsStr = (ms) => new Date(ms).toISOString().slice(0, 10);

export function heute() {
  const j = new Date();
  return `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}-${String(j.getDate()).padStart(2, '0')}`;
}

export function tageImZeitraum(vonStr, bisStr) {
  const tage = [];
  for (let ms = tagMs(vonStr); ms <= tagMs(bisStr); ms += TAG_MS) tage.push(alsStr(ms));
  return tage;
}

export function letzteErledigungVor(itemId, datumStr, logs) {
  let treffer = null;
  for (const l of logs) {
    if (l.item_id === itemId && l.erledigt && l.datum < datumStr) {
      if (!treffer || l.datum > treffer) treffer = l.datum;
    }
  }
  return treffer;
}

// Alle an datumStr fälligen, aktiven Pflicht-Punkte.
function faelligePflicht(datumStr, items, logs) {
  return items.filter((it) => {
    if (!it.aktiv || !it.pflicht) return false;
    const kontext = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigungVor(it.id, datumStr, logs) }
      : {};
    return istFaellig(it, datumStr, kontext);
  });
}

function istErledigt(datumStr, itemId, logs) {
  return logs.some((l) => l.datum === datumStr && l.item_id === itemId && l.erledigt);
}

export function tagesStatus(datumStr, items, logs) {
  const faellig = faelligePflicht(datumStr, items, logs);
  if (faellig.length === 0) return 'keine';
  const erledigt = faellig.filter((it) => istErledigt(datumStr, it.id, logs)).length;
  if (erledigt === faellig.length) return 'erfuellt';
  if (erledigt === 0) return 'offen';
  return 'teilweise';
}

// Aufeinanderfolgende Tage mit Status 'erfuellt', bewertet bis gestern.
// 'keine'-Tage unterbrechen nicht und zählen nicht hoch.
export function streak(items, logs, heuteStr) {
  const aktive = items.filter((it) => it.aktiv);
  if (aktive.length === 0) return { aktuell: 0, laengste: 0 };
  const start = aktive
    .map((it) => it.erstellt_am.slice(0, 10))
    .reduce((a, b) => (a < b ? a : b));
  const gestern = tageImZeitraum(start, heuteStr).slice(0, -1); // heute raus

  let laengste = 0;
  let lauf = 0;
  for (const tag of gestern) {
    const status = tagesStatus(tag, aktive, logs);
    if (status === 'erfuellt') {
      lauf += 1;
      laengste = Math.max(laengste, lauf);
    } else if (status === 'keine') {
      // neutral
    } else {
      lauf = 0;
    }
  }

  let aktuell = 0;
  for (let i = gestern.length - 1; i >= 0; i -= 1) {
    const status = tagesStatus(gestern[i], aktive, logs);
    if (status === 'erfuellt') aktuell += 1;
    else if (status === 'keine') continue;
    else break;
  }
  return { aktuell, laengste };
}

// Pro (aktivem) Punkt: an wie vielen fälligen Tagen war er erledigt?
// zeitraumTage = null -> seit erstellt_am; sonst die letzten N Tage bis gestern.
export function quoteProPunkt(items, logs, heuteStr, zeitraumTage = null) {
  const gesternMs = tagMs(heuteStr) - TAG_MS;
  const gestern = alsStr(gesternMs);

  return items
    .filter((it) => it.aktiv)
    .slice()
    .sort((a, b) => a.sortierung - b.sortierung)
    .map((it) => {
      const startPunkt = it.erstellt_am.slice(0, 10);
      let von = startPunkt;
      if (zeitraumTage) {
        const fensterVon = alsStr(gesternMs - (zeitraumTage - 1) * TAG_MS);
        von = fensterVon > startPunkt ? fensterVon : startPunkt;
      }
      if (von > gestern) {
        return { itemId: it.id, label: it.label, faelligeTage: 0, erledigteTage: 0, quote: 0 };
      }
      let faelligeTage = 0;
      let erledigteTage = 0;
      for (const tag of tageImZeitraum(von, gestern)) {
        const kontext = it.plan_typ === 'intervall'
          ? { letzteErledigung: letzteErledigungVor(it.id, tag, logs) }
          : {};
        if (!istFaellig(it, tag, kontext)) continue;
        faelligeTage += 1;
        if (istErledigt(tag, it.id, logs)) erledigteTage += 1;
      }
      return {
        itemId: it.id, label: it.label, faelligeTage, erledigteTage,
        quote: faelligeTage ? erledigteTage / faelligeTage : 0,
      };
    });
}

// Erfolgsquote der letzten fensterTage (ohne 'keine'-Tage) -> hochgerechnet auf zielTage.
export function prognose(items, logs, heuteStr, fensterTage = 14, zielTage = 30) {
  const gesternMs = tagMs(heuteStr) - TAG_MS;
  const vonMs = gesternMs - (fensterTage - 1) * TAG_MS;
  const tage = tageImZeitraum(alsStr(vonMs), alsStr(gesternMs));
  const aktive = items.filter((it) => it.aktiv);
  let bewertet = 0;
  let erfuellt = 0;
  for (const tag of tage) {
    const s = tagesStatus(tag, aktive, logs);
    if (s === 'keine') continue;
    bewertet += 1;
    if (s === 'erfuellt') erfuellt += 1;
  }
  const quote = bewertet ? erfuellt / bewertet : 0;
  return { quote, erwartet: Math.round(quote * zielTage), zielTage };
}

// Status je Tag eines Monats (monat 1..12), nur bis heute.
export function heatmapDaten(jahr, monat, items, logs) {
  const aktive = items.filter((it) => it.aktiv);
  const letzterTag = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const mm = String(monat).padStart(2, '0');
  const bisHeute = heute();
  const raus = [];
  for (let t = 1; t <= letzterTag; t += 1) {
    const datum = `${jahr}-${mm}-${String(t).padStart(2, '0')}`;
    if (datum > bisHeute) break;
    raus.push({ datum, status: tagesStatus(datum, aktive, logs) });
  }
  return raus;
}
