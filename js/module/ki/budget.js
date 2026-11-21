// Budget-Anzeige fuer AURORA: Prozent, Restbetrag, Stufenfarbe, Kill-Switch.

function zahl(wert) {
  const n = Number(wert);
  return Number.isFinite(n) ? n : 0;
}

export function budgetProzent(verbraucht, limit) {
  const l = zahl(limit);
  const v = zahl(verbraucht);
  if (l <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((v / l) * 100)));
}

const STUFEN_FARBEN = {
  OK: 'gruen',
  WARNUNG: 'gelb',
  WARN: 'gelb',
  KRITISCH: 'rot',
  STOP: 'rot',
  LIMIT: 'rot',
  FEHLER: 'rot',
};

export function stufenFarbe(stufe) {
  return STUFEN_FARBEN[String(stufe || '').toUpperCase()] || 'grau';
}

export function killSwitchHinweis(killSwitch) {
  return killSwitch ? 'Kill-Switch ist aktiv – AURORA führt keine neuen Aufgaben aus.' : null;
}

export function budgetInfo(status) {
  const zeile = status || {};
  const verbraucht = zahl(zeile.budget_verbraucht_eur);
  const limit = zahl(zeile.budget_limit_eur);
  const rest = Math.max(0, limit - verbraucht);
  const killSwitchAktiv = zeile.kill_switch === true;
  return {
    verbraucht,
    limit,
    rest,
    prozent: budgetProzent(verbraucht, limit),
    farbe: stufenFarbe(zeile.budget_stufe),
    stufeText: zeile.budget_stufe || 'unbekannt',
    killSwitchAktiv,
    killSwitchHinweis: killSwitchHinweis(killSwitchAktiv),
  };
}
