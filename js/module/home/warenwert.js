import { warenwert, warenwertPositionen, gesamtKontostand } from '../finanzen/berechnung.js';

const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const PHONE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeWarenwertDetail(container, zustand) {
  const { finanzen, handyreparatur } = zustand;
  const summe = warenwert(finanzen.teile, handyreparatur.auftraege);
  const positionen = warenwertPositionen(finanzen.teile, handyreparatur.auftraege);
  const stand = gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute());

  container.innerHTML = `
    <div class="modul-kopf">
      <button id="ww-zurueck" type="button">‹ Home</button>
      <h2>Warenwert</h2>
    </div>
    <div class="stat-karte gross">
      <small>Warenwert</small>
      <span>${summe.toFixed(2)} €</span>
      <small>Kontostand ${stand.toFixed(2)} € + Warenwert ${summe.toFixed(2)} € = ${(stand + summe).toFixed(2)} €</small>
    </div>
    <div class="section-head"><h2>Woraus er besteht</h2></div>
    <div class="punkt-liste">
      ${positionen.length === 0 ? '<p class="lade">Kein Warenwert erfasst.</p>' : positionen.map((p) => `
        <div class="punkt-zeile">
          <div class="icon-badge">${p.typ === 'auftrag' ? PHONE_ICON : BOX_ICON}</div>
          <div class="punkt-info">
            <strong>${esc(p.name)}</strong>
            <small>${p.typ === 'auftrag' ? 'Handyauftrag' : 'Lager'} · ${esc(p.info)}</small>
          </div>
          <strong>${p.betrag.toFixed(2)} €</strong>
        </div>`).join('')}
    </div>`;
  container.querySelector('#ww-zurueck').addEventListener('click', () => { location.hash = '#/home'; });
}
