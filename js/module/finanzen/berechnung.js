// Reine Berechnungen fuers Finanzen-Modul. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

export function kontostandProKonto(konto, expenses, einnahmen, heute) {
  const ausgabenSumme = expenses
    .filter((e) => e.konto_id === konto.id && e.datum >= konto.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = einnahmen
    .filter((e) => e.konto_id === konto.id && e.datum >= konto.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  return konto.kontostand_start + einnahmenSumme - ausgabenSumme;
}

export function gesamtKontostand(konten, expenses, einnahmen, heute) {
  return konten.reduce((s, k) => s + kontostandProKonto(k, expenses, einnahmen, heute), 0);
}

function imMonat(e, jahr, monat) {
  const [j, m] = e.datum.split('-').map(Number);
  return j === jahr && m === monat;
}

export function summeProMonat(expenses, jahr, monat) {
  return expenses.filter((e) => imMonat(e, jahr, monat))
    .reduce((s, e) => s + e.betrag, 0);
}

export function summenProKategorie(expenses, jahr, monat) {
  const summen = new Map();
  for (const e of expenses.filter((e) => imMonat(e, jahr, monat))) {
    summen.set(e.kategorie, (summen.get(e.kategorie) || 0) + e.betrag);
  }
  const gesamt = [...summen.values()].reduce((a, b) => a + b, 0);
  return [...summen.entries()]
    .map(([kategorie, summe]) => ({ kategorie, summe, prozent: gesamt === 0 ? 0 : Math.round((summe / gesamt) * 100) }))
    .sort((a, b) => b.summe - a.summe);
}

function differenzInTagen(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86_400_000);
}

export function erkenneAbos(expenses) {
  const gruppen = new Map();
  for (const e of expenses) {
    if (!e.notiz) continue;
    const schluessel = e.notiz.trim().toLowerCase();
    if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
    gruppen.get(schluessel).push(e);
  }
  const abos = [];
  for (const eintraege of gruppen.values()) {
    if (eintraege.length < 2) continue;
    const sortiert = [...eintraege].sort((a, b) => a.datum.localeCompare(b.datum));
    const abstaende = [];
    for (let i = 1; i < sortiert.length; i++) {
      abstaende.push(differenzInTagen(sortiert[i - 1].datum, sortiert[i].datum));
    }
    const regelmaessig = abstaende.every((tage) => tage >= 25 && tage <= 35);
    if (!regelmaessig) continue;
    const letzter = sortiert[sortiert.length - 1];
    const naechsteFaelligkeit = new Date(letzter.datum);
    naechsteFaelligkeit.setDate(naechsteFaelligkeit.getDate() + 30);
    abos.push({
      haendler: letzter.notiz,
      betrag: letzter.betrag,
      naechsteFaelligkeit: naechsteFaelligkeit.toISOString().slice(0, 10),
    });
  }
  return abos.sort((a, b) => a.naechsteFaelligkeit.localeCompare(b.naechsteFaelligkeit));
}

const STATUS_PRIORITAET = { fehlt: 0, bestellt: 1, da: 2 };
const STATUS_ZYKLUS = { fehlt: 'bestellt', bestellt: 'da', da: 'fehlt' };

export function warenwert(teile) {
  return teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
}

export function sortiereTeile(teile) {
  return [...teile].sort((a, b) => {
    const p = STATUS_PRIORITAET[a.status] - STATUS_PRIORITAET[b.status];
    if (p !== 0) return p;
    return a.bezeichnung.localeCompare(b.bezeichnung, 'de');
  });
}

export function merkliste(teile) {
  return sortiereTeile(teile).filter((t) => t.status !== 'da');
}

export function naechsterStatus(status) {
  return STATUS_ZYKLUS[status];
}

export function unechterGesamtKontostand(konten, expenses, einnahmen, teile, heute) {
  return gesamtKontostand(konten, expenses, einnahmen, heute) + warenwert(teile);
}

const ICON_TYP_SCHLUESSELWOERTER = [
  { typ: 'auto', muster: /tanken|auto|kfz|sprit|werkstatt/i },
  { typ: 'essen', muster: /essen|lebensmittel|supermarkt|restaurant|einkauf/i },
  { typ: 'freizeit', muster: /kino|freizeit|hobby|sport|fun/i },
];

export function kategorisiereIconTyp(kategorie) {
  if (!kategorie) return 'sonstiges';
  for (const { typ, muster } of ICON_TYP_SCHLUESSELWOERTER) {
    if (muster.test(kategorie)) return typ;
  }
  return 'sonstiges';
}

export function schuldenRestbetrag(schuld, zahlungen) {
  const bezahlt = zahlungen
    .filter((z) => z.schuld_id === schuld.id)
    .reduce((s, z) => s + z.betrag, 0);
  return Math.round((schuld.gesamtbetrag - bezahlt) * 100) / 100;
}

export function offeneSchulden(schulden, zahlungen) {
  return schulden.filter((s) => schuldenRestbetrag(s, zahlungen) > 0);
}

export function sortiereSchulden(schulden, zahlungen) {
  return [...schulden].sort((a, b) => {
    const restA = schuldenRestbetrag(a, zahlungen);
    const restB = schuldenRestbetrag(b, zahlungen);
    const offenA = restA > 0;
    const offenB = restB > 0;
    if (offenA !== offenB) return offenA ? -1 : 1;
    if (offenA) return restB - restA;
    return a.erstellt_am < b.erstellt_am ? 1 : -1;
  });
}

export function nettoVermoegen(konten, expenses, einnahmen, teile, schulden, zahlungen, heute) {
  const forderungen = schulden.filter((s) => s.richtung === 'mir_wird_geschuldet')
    .reduce((sum, s) => sum + Math.max(0, schuldenRestbetrag(s, zahlungen)), 0);
  const verbindlichkeiten = schulden.filter((s) => s.richtung === 'ich_schulde')
    .reduce((sum, s) => sum + Math.max(0, schuldenRestbetrag(s, zahlungen)), 0);
  return unechterGesamtKontostand(konten, expenses, einnahmen, teile, heute) + forderungen - verbindlichkeiten;
}

export function zeitraumVon(bereich, heute) {
  const d = new Date(heute + 'T00:00:00Z');
  const TAGE = { '7T': 7, '30T': 30 };
  if (TAGE[bereich]) {
    d.setUTCDate(d.getUTCDate() - TAGE[bereich]);
  } else {
    const MONATE = { '3M': 3, '6M': 6, '1J': 12 };
    d.setUTCMonth(d.getUTCMonth() - MONATE[bereich]);
  }
  return d.toISOString().slice(0, 10);
}

export function summenProKategorieZeitraum(expenses, von, bis) {
  const summen = new Map();
  for (const e of expenses.filter((e) => e.datum >= von && e.datum <= bis)) {
    summen.set(e.kategorie, (summen.get(e.kategorie) || 0) + e.betrag);
  }
  const gesamt = [...summen.values()].reduce((a, b) => a + b, 0);
  return [...summen.entries()]
    .map(([kategorie, summe]) => ({ kategorie, summe, prozent: gesamt === 0 ? 0 : Math.round((summe / gesamt) * 100) }))
    .sort((a, b) => b.summe - a.summe);
}

export function summenProBezeichnungZeitraum(einnahmen, von, bis) {
  const summen = new Map();
  for (const e of einnahmen.filter((e) => e.datum >= von && e.datum <= bis)) {
    summen.set(e.bezeichnung, (summen.get(e.bezeichnung) || 0) + e.betrag);
  }
  return [...summen.entries()]
    .map(([bezeichnung, summe]) => ({ bezeichnung, summe }))
    .sort((a, b) => b.summe - a.summe);
}

export function letzteMonate(anzahl, heute) {
  const d = new Date(heute + 'T00:00:00Z');
  const ergebnis = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    ergebnis.push({ jahr: m.getUTCFullYear(), monat: m.getUTCMonth() + 1 });
  }
  return ergebnis;
}

export function jahresUebersicht(expenses, einnahmen, jahr) {
  const inJahr = (b) => Number(b.datum.slice(0, 4)) === jahr;
  const ausgabenSumme = expenses.filter(inJahr).reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = einnahmen.filter(inJahr).reduce((s, e) => s + e.betrag, 0);
  const sparquote = einnahmenSumme > 0
    ? Math.round(((einnahmenSumme - ausgabenSumme) / einnahmenSumme) * 1000) / 10
    : null;
  return { einnahmenSumme, ausgabenSumme, sparquote };
}

export function kontostandVerlauf(konten, expenses, einnahmen, tage, heute) {
  const ergebnis = [];
  const ende = new Date(heute + 'T00:00:00Z');
  for (let i = tage - 1; i >= 0; i--) {
    const tag = new Date(ende);
    tag.setUTCDate(tag.getUTCDate() - i);
    const datum = tag.toISOString().slice(0, 10);
    ergebnis.push({ datum, stand: gesamtKontostand(konten, expenses, einnahmen, datum) });
  }
  return ergebnis;
}

function csvFeldSicher(wert) {
  const text = String(wert);
  // Schutz vor CSV-Formel-Injection: Excel/Sheets interpretieren Zellen, die
  // mit =, +, - oder @ beginnen, als Formel. Ein vorangestelltes Apostroph
  // erzwingt Text-Interpretation, ohne den sichtbaren Inhalt zu veraendern.
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function zuCsvZeilen(transaktionen) {
  const header = 'Datum,Typ,Bezeichnung,Betrag,Quelle';
  const zeilen = transaktionen.map((t) =>
    [t.datum, t.typ, `"${csvFeldSicher(t.bezeichnung).replace(/"/g, '""')}"`, t.betrag.toFixed(2), t.quelle].join(','));
  return [header, ...zeilen];
}
