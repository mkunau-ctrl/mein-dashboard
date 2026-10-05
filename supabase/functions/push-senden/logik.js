// Reine Logik fuer Push-Meldungen (kein Netz/DB/DOM) – getestet in test/push-logik.test.js.
// Wird von der Edge Function index.ts importiert.

const TAG_START = 8 * 60; // Tagesmeldungen (ohne Uhrzeit) erst ab 08:00
const VORLAUF_MIN = 60; // Termin mit Uhrzeit: bis 60 Min vorher

// Einzeln schaltbare Ausloeser (Quelle der Wahrheit fuer Edge Function UND Einstellungen-UI)
export const ARTEN = [
  { key: 'termin_zeit', gruppe: 'Termine & To-dos', name: 'Termin mit Uhrzeit (1 Std. vorher)' },
  { key: 'termin_tag', gruppe: 'Termine & To-dos', name: 'Termin heute (ohne Uhrzeit)' },
  { key: 'todo_heute', gruppe: 'Termine & To-dos', name: 'To-do heute fällig' },
  { key: 'todo_ueberfaellig', gruppe: 'Termine & To-dos', name: 'To-do überfällig' },
  { key: 'rechnung_bald', gruppe: 'Rechnungen & Geld', name: 'Rechnung bald fällig' },
  { key: 'rechnung_ueberfaellig', gruppe: 'Rechnungen & Geld', name: 'Rechnung überfällig' },
  { key: 'dauerauftrag', gruppe: 'Rechnungen & Geld', name: 'Regelmäßige Ausgabe/Einnahme fällig' },
  { key: 'schulden', gruppe: 'Rechnungen & Geld', name: 'Offene Schulden (montags)' },
  { key: 'sendung', gruppe: 'Sendungen', name: 'Sendung zugestellt / abholbereit' },
  { key: 'flipping_fund', gruppe: 'Flipping', name: 'Neuer Flipping-Fund' },
  { key: 'verkauf_anfrage', gruppe: 'Flipping', name: 'Verkaufs-Anfrage / Kauf-Chat' },
  { key: 'email', gruppe: 'Sonstiges', name: 'Wichtige E-Mail' },
  { key: 'morgen', gruppe: 'Sonstiges', name: 'Morgen-Zusammenfassung (8 Uhr)' },
];

// Fehlender Eintrag = an; nur ein ausdruecklich gesetztes false schaltet aus
export function schalterErlaubt(schalter, art) {
  return (schalter ?? {})[art] !== false;
}

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

export function baueMeldungen({ termine = [], todos = [], rechnungen = [], sendungen = [], funde = [], verkaeufe = [], vorlagenAus = [], vorlagenEin = [], schulden = [], schuldenZahlungen = [], mails = [], heute, minuten, jetztMs }) {
  const aus = [];

  for (const t of termine) {
    if (t.erledigt || t.faellig_am !== heute) continue;
    const start = minutenAusUhrzeit(t.uhrzeit);
    if (start !== null) {
      const diff = start - minuten;
      if (diff < 0 || diff > VORLAUF_MIN) continue;
      aus.push({ art: 'termin_zeit', schluessel: `termin:${t.id}:${heute}:${t.uhrzeit}`, titel: `Termin um ${t.uhrzeit}`, text: [t.titel, t.ort].filter(Boolean).join(' · '), url: '#/home' });
    } else if (minuten >= TAG_START) {
      aus.push({ art: 'termin_tag', schluessel: `termin:${t.id}:${heute}`, titel: 'Termin heute', text: t.titel, url: '#/home' });
    }
  }

  if (minuten >= TAG_START) {
    for (const t of todos) {
      if (t.erledigt || !t.faellig) continue;
      if (t.faellig === heute) {
        aus.push({ art: 'todo_heute', schluessel: `todo:${t.id}:heute`, titel: 'To-do heute fällig', text: t.text, url: '#/todos' });
      } else if (t.faellig < heute) {
        aus.push({ art: 'todo_ueberfaellig', schluessel: `todo:${t.id}:ueberfaellig`, titel: 'To-do überfällig', text: t.text, url: '#/todos' });
      }
    }

    for (const r of rechnungen) {
      if (r.status === 'bezahlt' || !r.faellig_am) continue;
      const tage = tageZwischen(heute, r.faellig_am);
      const was = `${r.haendler} · ${eur(r.betrag)}`;
      if (tage < 0) {
        aus.push({ art: 'rechnung_ueberfaellig', schluessel: `rechnung:${r.id}:ueberfaellig`, titel: 'Rechnung überfällig', text: was, url: '#/rechnungen' });
      } else if (tage <= 2) {
        aus.push({ art: 'rechnung_bald', schluessel: `rechnung:${r.id}:bald`, titel: tage === 0 ? 'Rechnung heute fällig' : `Rechnung in ${tage} Tag${tage === 1 ? '' : 'en'} fällig`, text: was, url: '#/rechnungen' });
      }
    }
  }

  for (const s of sendungen) {
    if (s.status !== 'zugestellt' || !s.letzte_aktualisierung) continue;
    if (jetztMs - Date.parse(s.letzte_aktualisierung) > 24 * 3600e3) continue;
    const text = [s.haendler, s.beschreibung].filter(Boolean).join(' · ');
    aus.push({ art: 'sendung', schluessel: `sendung:${s.id}:zugestellt`, titel: s.abholcode ? `Abholbereit – Code ${s.abholcode}` : 'Sendung zugestellt', text, url: '#/sendungen' });
  }

  const neueFunde = funde.filter((f) => f.status === 'neu' && jetztMs - Date.parse(f.erstellt_am) <= 3 * 3600e3);
  if (neueFunde.length === 1) {
    const f = neueFunde[0];
    aus.push({ art: 'flipping_fund', schluessel: `fund:${f.id}`, titel: 'Neuer Flipping-Fund', text: [f.titel, f.preis != null ? eur(f.preis) : null, f.ort].filter(Boolean).join(' · '), url: '#/flipping' });
  } else if (neueFunde.length > 1) {
    const ids = neueFunde.map((f) => String(f.id).slice(0, 8)).sort().join(',');
    aus.push({ art: 'flipping_fund', schluessel: `fund:sammel:${ids}`, titel: `${neueFunde.length} neue Flipping-Funde`, text: neueFunde.slice(0, 3).map((f) => f.titel).join(' | '), url: '#/flipping' });
  }

  for (const v of verkaeufe) {
    if (v.status === 'erledigt' || jetztMs - Date.parse(v.erstellt_am) > 3 * 3600e3) continue;
    aus.push({
      art: 'verkauf_anfrage', schluessel: `verkauf:${v.id}`,
      titel: v.kaufinteresse ? 'Kaufinteresse bei deiner Anzeige' : 'Neue Anfrage zu deiner Anzeige',
      text: [v.kaeufer, v.anzeige_titel, v.frage].filter(Boolean).join(' · ').slice(0, 140), url: '#/flipping',
    });
  }

  if (minuten >= TAG_START) {
    for (const [quelle, liste] of [['aus', vorlagenAus], ['ein', vorlagenEin]]) {
      for (const x of liste) {
        if (!x.aktiv || !x.naechste_faelligkeit || x.naechste_faelligkeit > heute) continue;
        aus.push({
          art: 'dauerauftrag', schluessel: `vorlage:${quelle}:${x.id}:${x.naechste_faelligkeit}`,
          titel: quelle === 'aus' ? 'Regelmäßige Ausgabe fällig' : 'Regelmäßige Einnahme fällig',
          text: `${x.bezeichnung} · ${eur(x.betrag)}`, url: '#/finanzen',
        });
      }
    }

    if (new Date(`${heute}T12:00:00Z`).getUTCDay() === 1) {
      const gezahlt = new Map();
      for (const z of schuldenZahlungen) gezahlt.set(z.schuld_id, (gezahlt.get(z.schuld_id) ?? 0) + Number(z.betrag));
      const rest = { mir_wird_geschuldet: 0, ich_schulde: 0 };
      for (const d of schulden) {
        const r = Number(d.gesamtbetrag) - (gezahlt.get(d.id) ?? 0);
        if (r > 0.004 && d.richtung in rest) rest[d.richtung] += r;
      }
      if (rest.mir_wird_geschuldet > 0 || rest.ich_schulde > 0) {
        const teile = [];
        if (rest.mir_wird_geschuldet > 0) teile.push(`Dir geschuldet: ${eur(rest.mir_wird_geschuldet)}`);
        if (rest.ich_schulde > 0) teile.push(`Du schuldest: ${eur(rest.ich_schulde)}`);
        aus.push({ art: 'schulden', schluessel: `schulden:${heute}`, titel: 'Offene Schulden', text: teile.join(' · '), url: '#/finanzen' });
      }
    }
  }

  for (const m of mails) {
    if (jetztMs - Date.parse(m.erstellt_am) > 24 * 3600e3) continue;
    aus.push({ art: 'email', schluessel: `mail:${m.id}`, titel: m.titel, text: m.text ?? '', url: m.url ?? '#/home', schonGespeichert: true });
  }

  if (minuten >= TAG_START && minuten < 12 * 60) {
    const nT = termine.filter((t) => !t.erledigt && t.faellig_am === heute).length;
    const nD = todos.filter((t) => !t.erledigt && t.faellig && t.faellig <= heute).length;
    const nR = rechnungen.filter((r) => r.status !== 'bezahlt' && r.faellig_am && tageZwischen(heute, r.faellig_am) <= 2).length;
    const teile = [];
    if (nT) teile.push(`${nT} Termin${nT === 1 ? '' : 'e'}`);
    if (nD) teile.push(`${nD} To-do${nD === 1 ? '' : 's'}`);
    if (nR) teile.push(`${nR} Rechnung${nR === 1 ? '' : 'en'}`);
    if (teile.length) aus.push({ art: 'morgen', schluessel: `morgen:${heute}`, titel: 'Heute steht an', text: teile.join(' · '), url: '#/home' });
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
