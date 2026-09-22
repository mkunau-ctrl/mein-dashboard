const SCHLUESSEL = 'schriftgroesse';
const STUFEN = ['klein', 'normal', 'gross'];

export function aktuelleSchriftgroesse() {
  try {
    const gespeichert = localStorage.getItem(SCHLUESSEL);
    return STUFEN.includes(gespeichert) ? gespeichert : 'normal';
  } catch { return 'normal'; }
}

export function setzeSchriftgroesse(stufe) {
  if (!STUFEN.includes(stufe)) return;
  document.documentElement.setAttribute('data-schriftgroesse', stufe);
  try { localStorage.setItem(SCHLUESSEL, stufe); } catch { /* Storage evtl. blockiert, kein kritischer Zustand */ }
}

export function wendeSchriftgroesseAn() {
  setzeSchriftgroesse(aktuelleSchriftgroesse());
}
