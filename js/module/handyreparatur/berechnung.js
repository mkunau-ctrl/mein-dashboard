// Reine Berechnungen fuers Handyreparatur-Modul. Kein Netz, keine DOM.

const STATUS_ZYKLUS = { offen: 'fertig', fertig: 'verkauft', verkauft: 'offen' };
const STATUS_RANG = { offen: 0, fertig: 1, verkauft: 2 };

export function naechsterAuftragStatus(status) {
  return STATUS_ZYKLUS[status];
}

export function erwarteterGewinn(auftraege) {
  return auftraege
    .filter((a) => a.status !== 'verkauft' && a.voraussichtlicher_verkaufspreis != null)
    .reduce((s, a) => s + (a.voraussichtlicher_verkaufspreis - a.warenwert), 0);
}

export function istGewinnImMonat(auftraege, jahr, monat) {
  return auftraege
    .filter((a) => a.status === 'verkauft' && a.verkauft_am
      && Number(a.verkauft_am.slice(0, 4)) === jahr && Number(a.verkauft_am.slice(5, 7)) === monat)
    .reduce((s, a) => s + (a.tatsaechlicher_verkaufspreis - a.warenwert), 0);
}

export function sortiereAuftraege(auftraege) {
  return [...auftraege].sort((a, b) => {
    const rang = STATUS_RANG[a.status] - STATUS_RANG[b.status];
    if (rang !== 0) return rang;
    return a.erstellt_am < b.erstellt_am ? 1 : -1;
  });
}
