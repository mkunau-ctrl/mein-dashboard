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
