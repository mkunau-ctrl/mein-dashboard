import { gesamtKontostand, unechterGesamtKontostand, kontostandVerlauf, warenwert } from '../finanzen/berechnung.js';

const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0112 5c7 0 11 7 11 7a17.6 17.6 0 01-3.2 4M6.5 6.5C3.6 8.3 1 12 1 12s4 7 11 7c1.4 0 2.7-.2 3.9-.6"/><path d="M9.9 9.9A3 3 0 0014 14"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function sparklinePunkte(verlauf) {
  if (verlauf.length < 2) return '';
  const werte = verlauf.map((v) => v.stand);
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  const breite = 280;
  const hoehe = 60;
  return verlauf.map((v, i) => {
    const x = (i / (verlauf.length - 1)) * breite;
    const y = hoehe - ((v.stand - min) / spanne) * hoehe;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

let ausgeblendet = false;

export async function zeigeKontostandDetail(container, zustand) {
  const { finanzen } = zustand;
  const heuteStr = heute();
  const stand = gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heuteStr);
  const unecht = unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heuteStr);
  const verlauf = kontostandVerlauf(finanzen.konten, finanzen.expenses, finanzen.einnahmen, 30, heuteStr);
  const wert = warenwert(finanzen.teile);

  function zeichne() {
    const anzeige = ausgeblendet ? '••••••,•• €' : `${stand.toFixed(2)} €`;
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="kd-zurueck" type="button">‹ Home</button>
        <h2>Kontostand</h2>
      </div>
      <div class="stat-karte gross">
        <div class="stat-kopf">
          <small>Kontostand</small>
          <button id="kd-auge" type="button" style="background:none;border:none;padding:0;color:var(--gedaempft);">${ausgeblendet ? EYE_OFF_ICON : EYE_ICON}</button>
        </div>
        <span>${anzeige}</span>
        <svg width="280" height="60" viewBox="0 0 280 60" style="margin-top:8px;">
          <polyline points="${sparklinePunkte(verlauf)}" fill="none" stroke="var(--gedaempft)" stroke-width="2"/>
        </svg>
        <small>${unecht.toFixed(2)} € inkl. Warenwert</small>
        <small>Warenwert: ${wert.toFixed(2)} €</small>
      </div>`;
    container.querySelector('#kd-zurueck').addEventListener('click', () => { location.hash = '#/home'; });
    container.querySelector('#kd-auge').addEventListener('click', () => { ausgeblendet = !ausgeblendet; zeichne(); });
  }
  zeichne();
}
