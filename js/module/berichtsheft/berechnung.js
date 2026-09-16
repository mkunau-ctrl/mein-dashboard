// Reine Berechnungen fuers Berichtsheft-Modul. Kein Netz, keine DOM.

const TAG_MS = 86_400_000;

function tagMs(datumStr) {
  return Date.parse(datumStr.slice(0, 10) + 'T00:00:00Z');
}

function datumStr(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// 1 = Montag ... 7 = Sonntag
function wochentagVon(datumStr_) {
  const d = new Date(tagMs(datumStr_));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

export function wochenStart(datum) {
  return datumStr(tagMs(datum) - (wochentagVon(datum) - 1) * TAG_MS);
}

export function gruppiereNachWoche(eintraege) {
  const nachStart = new Map();
  for (const e of eintraege) {
    const start = wochenStart(e.datum);
    if (!nachStart.has(start)) nachStart.set(start, []);
    nachStart.get(start).push(e);
  }
  return [...nachStart.entries()]
    .sort((a, b) => tagMs(b[0]) - tagMs(a[0]))
    .map(([start, tage]) => ({
      start,
      eintraege: [...tage].sort((a, b) => tagMs(a.datum) - tagMs(b.datum)),
    }));
}

export function ausbildungsjahr(ausbildungsbeginn, datum) {
  const start = new Date(tagMs(ausbildungsbeginn));
  const heute = new Date(tagMs(datum));
  let jahre = heute.getUTCFullYear() - start.getUTCFullYear();
  const vorJahrestag = (heute.getUTCMonth() < start.getUTCMonth())
    || (heute.getUTCMonth() === start.getUTCMonth() && heute.getUTCDate() < start.getUTCDate());
  if (vorJahrestag) jahre -= 1;
  return jahre + 1;
}
