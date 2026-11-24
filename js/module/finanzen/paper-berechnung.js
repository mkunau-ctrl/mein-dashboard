// Reine Logik fuer die Paper-Trading-Ansicht (kein Netz, kein DOM).

export const PAPER_START = 100000;

export function gewinnVerlust(equity, start = PAPER_START) {
  const betrag = Number(equity) - start;
  const prozent = start > 0 ? (betrag / start) * 100 : 0;
  return { betrag, prozent };
}

// Positionen nach Marktwert absteigend; unbekannte Werte als 0.
export function sortierePositionen(positionen) {
  return [...(positionen || [])].sort(
    (a, b) => Number(b.market_value || 0) - Number(a.market_value || 0),
  );
}

// Alpaca liefert unrealized_plpc als Bruchteil (0.05 = 5 %).
export function positionProzent(position) {
  const p = Number(position.unrealized_plpc);
  return Number.isFinite(p) ? p * 100 : 0;
}

export function formatBetrag(zahl, stellen = 2) {
  return Number(zahl).toLocaleString('de-DE', {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });
}

export const ART_LABEL = {
  trade: 'Trade',
  nachricht: 'Nachricht',
  analyse: 'Analyse',
  runde: 'Runde',
};

// Punkte fuer eine Mini-Kurve (SVG-polyline, viewBox 0 0 breite hoehe), aelteste zuerst.
export function kurvenPunkte(snapshots, breite = 300, hoehe = 60) {
  const werte = [...(snapshots || [])]
    .sort((a, b) => new Date(a.erstellt_am) - new Date(b.erstellt_am))
    .map((s) => Number(s.equity))
    .filter(Number.isFinite);
  if (werte.length < 2) return '';
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  return werte
    .map((w, i) => {
      const x = (i / (werte.length - 1)) * breite;
      const y = hoehe - ((w - min) / spanne) * (hoehe - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
