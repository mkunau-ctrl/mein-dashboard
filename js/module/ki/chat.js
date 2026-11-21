// Reine Logik fuer den Agenten-Chat (Verlauf, Wartestatus, Eingabepruefung).

const WARTE_STATUS = new Set(['neu', 'angenommen', 'in_arbeit']);

function zeitWert(zeile) {
  const zeit = Date.parse(zeile?.erstellt_am);
  return Number.isFinite(zeit) ? zeit : Number.POSITIVE_INFINITY;
}

export function chatZustand(zeilen) {
  const verlauf = (Array.isArray(zeilen) ? zeilen.filter(Boolean) : [])
    .map((zeile, index) => ({ zeile, index }))
    .sort((a, b) => (zeitWert(a.zeile) - zeitWert(b.zeile)) || (a.index - b.index))
    .map((eintrag) => eintrag.zeile);

  let letzterNutzer = null;
  for (let i = verlauf.length - 1; i >= 0; i -= 1) {
    if (verlauf[i].rolle === 'nutzer') { letzterNutzer = verlauf[i]; break; }
  }

  const letzte = verlauf[verlauf.length - 1] || null;
  const letzterStatus = letzte && letzte.rolle === 'nutzer'
    ? (letzte.status || 'neu')
    : null;
  const wartetAufAntwort = Boolean(letzterStatus && WARTE_STATUS.has(letzterStatus));

  return {
    verlauf,
    letzterNutzer,
    statusLetzterNutzer: letzterNutzer ? (letzterNutzer.status || 'neu') : null,
    wartetAufAntwort,
  };
}

export function pruefeEingabe(text) {
  if (typeof text !== 'string') {
    return { ok: false, fehler: 'Bitte eine Nachricht eingeben.' };
  }
  const sauber = text.trim();
  if (sauber.length === 0) {
    return { ok: false, fehler: 'Bitte eine Nachricht eingeben.' };
  }
  if (sauber.length > 4000) {
    return { ok: false, fehler: 'Höchstens 4000 Zeichen.' };
  }
  return { ok: true, text: sauber };
}

const CHAT_STATUS_TEXT = {
  neu: 'gesendet',
  angenommen: 'angenommen',
  in_arbeit: 'arbeitet …',
  fertig: 'beantwortet',
  fehler: 'Fehler',
};

export function chatStatusText(status) {
  return CHAT_STATUS_TEXT[status] || 'unbekannt';
}
