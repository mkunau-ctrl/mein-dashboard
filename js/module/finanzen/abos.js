import { erkenneAbos } from './berechnung.js';

const WIEDERHOLUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5M20 20v-5h-5"/><path d="M4.5 15a8 8 0 0 0 14.7 3.2M19.5 9A8 8 0 0 0 4.8 5.8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeAbos(container, zustand) {
  const abos = erkenneAbos(zustand.expenses);
  if (abos.length === 0) {
    container.innerHTML = '<p class="lade">Noch keine wiederkehrenden Zahlungen erkannt.</p>';
    return;
  }
  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  for (const abo of abos) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${WIEDERHOLUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(abo.haendler)}</strong>
        <small>${abo.betrag.toFixed(2)} € · nächste Abbuchung ca. ${abo.naechsteFaelligkeit}</small>
      </div>`;
    liste.appendChild(zeile);
  }
  container.appendChild(liste);
}
