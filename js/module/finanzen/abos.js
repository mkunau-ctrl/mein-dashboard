import { erkenneAbos } from './berechnung.js';

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
      <div class="punkt-info">
        <strong>${esc(abo.haendler)}</strong>
        <small>${abo.betrag.toFixed(2)} € · nächste Abbuchung ca. ${abo.naechsteFaelligkeit}</small>
      </div>`;
    liste.appendChild(zeile);
  }
  container.appendChild(liste);
}
