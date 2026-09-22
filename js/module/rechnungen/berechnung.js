// Reine Berechnungen fuers Rechnungen-Modul. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

export function istUeberfaellig(rechnung, heute) {
  return rechnung.status === 'offen' && rechnung.faellig_am < heute;
}

export function sortiereRechnungen(rechnungen, heute) {
  const rang = (r) => {
    if (istUeberfaellig(r, heute)) return 0;
    if (r.status === 'offen') return 1;
    return 2;
  };
  return [...rechnungen].sort((a, b) => {
    const rangA = rang(a);
    const rangB = rang(b);
    if (rangA !== rangB) return rangA - rangB;
    if (rangA === 2) return (b.bezahlt_am || '') < (a.bezahlt_am || '') ? -1 : 1;
    return a.faellig_am < b.faellig_am ? -1 : 1;
  });
}

export function summeOffenerRechnungen(rechnungen) {
  return rechnungen.filter((r) => r.status === 'offen').reduce((s, r) => s + r.betrag, 0);
}
