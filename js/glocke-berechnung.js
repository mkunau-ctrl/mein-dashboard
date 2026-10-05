// Reine Hilfsfunktionen fuer die Glocke (Meldungsliste) – getestet in test/glocke-berechnung.test.js

export function zaehleUngelesen(meldungen) {
  return meldungen.filter((m) => !m.gelesen).length;
}

// "gerade eben", "vor 5 Min.", "vor 3 Std.", "gestern", sonst Datum
export function zeitText(isoZeit, jetztMs = Date.now()) {
  const min = Math.floor((jetztMs - Date.parse(isoZeit)) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  if (min < 24 * 60) return `vor ${Math.floor(min / 60)} Std.`;
  if (min < 48 * 60) return 'gestern';
  return new Date(isoZeit).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

// Badge-Text: leer bei 0, "9+" ab 10
export function badgeText(anzahl) {
  if (anzahl <= 0) return '';
  return anzahl > 9 ? '9+' : String(anzahl);
}
