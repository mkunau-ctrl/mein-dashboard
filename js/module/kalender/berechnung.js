// Reine Kalender-Logik (kein Netz/DOM).

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function monatsName(monat) {
  return MONATE[monat - 1];
}

export function verschiebeMonat(jahr, monat, delta) {
  const index = jahr * 12 + (monat - 1) + delta;
  return { jahr: Math.floor(index / 12), monat: (index % 12) + 1 };
}

const zweistellig = (n) => String(n).padStart(2, '0');

// Liste aus ISO-Tagen und null (Auffuellung), Wochen beginnen am Montag, Laenge = Vielfaches von 7
export function monatsRaster(jahr, monat) {
  const tage = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const wochentagErster = (new Date(Date.UTC(jahr, monat - 1, 1)).getUTCDay() + 6) % 7; // Mo=0
  const raster = Array(wochentagErster).fill(null);
  for (let t = 1; t <= tage; t++) raster.push(`${jahr}-${zweistellig(monat)}-${zweistellig(t)}`);
  while (raster.length % 7 !== 0) raster.push(null);
  return raster;
}

// { 'YYYY-MM-DD': [{ art, id, titel, uhrzeit?, ... }] }, Termine mit Uhrzeit zuerst (nach Zeit)
export function eintraegeProTag({ termine = [], todos = [], rechnungen = [] }) {
  const tage = {};
  const lege = (tag, eintrag) => { (tage[tag] ??= []).push(eintrag); };
  for (const t of termine) {
    if (!t.erledigt && t.faellig_am) lege(t.faellig_am, { art: 'termin', id: t.id, titel: t.titel, uhrzeit: t.uhrzeit ?? null, ort: t.ort ?? null });
  }
  for (const d of todos) {
    if (!d.erledigt && d.faellig) lege(d.faellig, { art: 'todo', id: d.id, titel: d.text });
  }
  for (const r of rechnungen) {
    if (r.status !== 'bezahlt' && r.faellig_am) lege(r.faellig_am, { art: 'rechnung', id: r.id, titel: `${r.haendler} · ${Number(r.betrag).toFixed(2).replace('.', ',')} €` });
  }
  const rang = (e) => (e.art === 'termin' ? (e.uhrzeit ? 0 : 1) : 2);
  for (const liste of Object.values(tage)) {
    liste.sort((a, b) => rang(a) - rang(b) || String(a.uhrzeit ?? '').localeCompare(String(b.uhrzeit ?? '')));
  }
  return tage;
}
