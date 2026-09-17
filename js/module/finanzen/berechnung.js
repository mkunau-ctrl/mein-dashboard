// Reine Berechnungen fuers Finanzen-Modul. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

export function kontostand(settings, expenses, heute) {
  const summe = expenses
    .filter((e) => e.datum >= settings.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  return settings.kontostand_start - summe;
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
  return [...summen.entries()]
    .map(([kategorie, summe]) => ({ kategorie, summe }))
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
