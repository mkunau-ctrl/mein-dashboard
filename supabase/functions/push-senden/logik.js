// Reine Logik fuer Push-Meldungen (kein Netz/DB/DOM) – getestet in test/push-logik.test.js.
// Wird von der Edge Function index.ts importiert.

const TAG_START = 8 * 60; // Tagesmeldungen (ohne Uhrzeit) erst ab 08:00
const VORLAUF_MIN = 60; // Termin mit Uhrzeit: bis 60 Min vorher

export function minutenAusUhrzeit(text) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function inRuhezeit(minuten, von, bis) {
  const v = minutenAusUhrzeit(von);
  const b = minutenAusUhrzeit(bis);
  if (v === null || b === null || v === b) return false;
  return v < b ? minuten >= v && minuten < b : minuten >= v || minuten < b;
}

function tageZwischen(vonIso, bisIso) {
  return Math.round((Date.parse(bisIso) - Date.parse(vonIso)) / 86400000);
}

const eur = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;

export function baueMeldungen({ termine = [], todos = [], rechnungen = [], sendungen = [], funde = [], heute, minuten, jetztMs }) {
  const aus = [];

  for (const t of termine) {
    if (t.erledigt || t.faellig_am !== heute) continue;
    const start = minutenAusUhrzeit(t.uhrzeit);
    if (start !== null) {
      const diff = start - minuten;
      if (diff < 0 || diff > VORLAUF_MIN) continue;
      aus.push({ kategorie: 'termine', schluessel: `termin:${t.id}:${heute}:${t.uhrzeit}`, titel: `Termin um ${t.uhrzeit}`, text: [t.titel, t.ort].filter(Boolean).join(' · '), url: '#/home' });
    } else if (minuten >= TAG_START) {
      aus.push({ kategorie: 'termine', schluessel: `termin:${t.id}:${heute}`, titel: 'Termin heute', text: t.titel, url: '#/home' });
    }
  }

  if (minuten >= TAG_START) {
    for (const t of todos) {
      if (t.erledigt || !t.faellig) continue;
      if (t.faellig === heute) {
        aus.push({ kategorie: 'termine', schluessel: `todo:${t.id}:heute`, titel: 'To-do heute fällig', text: t.text, url: '#/todos' });
      } else if (t.faellig < heute) {
        aus.push({ kategorie: 'termine', schluessel: `todo:${t.id}:ueberfaellig`, titel: 'To-do überfällig', text: t.text, url: '#/todos' });
      }
    }

    for (const r of rechnungen) {
      if (r.status === 'bezahlt' || !r.faellig_am) continue;
      const tage = tageZwischen(heute, r.faellig_am);
      const was = `${r.haendler} · ${eur(r.betrag)}`;
      if (tage < 0) {
        aus.push({ kategorie: 'rechnungen', schluessel: `rechnung:${r.id}:ueberfaellig`, titel: 'Rechnung überfällig', text: was, url: '#/rechnungen' });
      } else if (tage <= 2) {
        aus.push({ kategorie: 'rechnungen', schluessel: `rechnung:${r.id}:bald`, titel: tage === 0 ? 'Rechnung heute fällig' : `Rechnung in ${tage} Tag${tage === 1 ? '' : 'en'} fällig`, text: was, url: '#/rechnungen' });
      }
    }
  }

  for (const s of sendungen) {
    if (s.status !== 'zugestellt' || !s.letzte_aktualisierung) continue;
    if (jetztMs - Date.parse(s.letzte_aktualisierung) > 24 * 3600e3) continue;
    const text = [s.haendler, s.beschreibung].filter(Boolean).join(' · ');
    aus.push({ kategorie: 'sendungen', schluessel: `sendung:${s.id}:zugestellt`, titel: s.abholcode ? `Abholbereit – Code ${s.abholcode}` : 'Sendung zugestellt', text, url: '#/sendungen' });
  }

  const neueFunde = funde.filter((f) => f.status === 'neu' && jetztMs - Date.parse(f.erstellt_am) <= 3 * 3600e3);
  if (neueFunde.length === 1) {
    const f = neueFunde[0];
    aus.push({ kategorie: 'flipping', schluessel: `fund:${f.id}`, titel: 'Neuer Flipping-Fund', text: [f.titel, f.preis != null ? eur(f.preis) : null, f.ort].filter(Boolean).join(' · '), url: '#/flipping' });
  } else if (neueFunde.length > 1) {
    const ids = neueFunde.map((f) => String(f.id).slice(0, 8)).sort().join(',');
    aus.push({ kategorie: 'flipping', schluessel: `fund:sammel:${ids}`, titel: `${neueFunde.length} neue Flipping-Funde`, text: neueFunde.slice(0, 3).map((f) => f.titel).join(' | '), url: '#/flipping' });
  }

  return aus;
}

// Zahl fuers rote App-Icon-Kennzeichen: heute faellige/ueberfaellige Dinge
export function zaehleOffen({ termine = [], todos = [], rechnungen = [], heute }) {
  const t = termine.filter((x) => !x.erledigt && x.faellig_am === heute).length;
  const d = todos.filter((x) => !x.erledigt && x.faellig && x.faellig <= heute).length;
  const r = rechnungen.filter((x) => x.status !== 'bezahlt' && x.faellig_am && tageZwischen(heute, x.faellig_am) <= 2).length;
  return t + d + r;
}
