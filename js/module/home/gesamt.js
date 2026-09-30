import { warenwert, erwarteterWarenwert, schuldenSumme, gesamtKontostand } from '../finanzen/berechnung.js';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeGesamtDetail(container, zustand) {
  const { finanzen, handyreparatur } = zustand;
  const eur = (v) => `${v.toFixed(2)} €`;
  const stand = gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute());
  const wertMin = warenwert(finanzen.teile, handyreparatur.auftraege);
  const wertErw = erwarteterWarenwert(finanzen.teile, handyreparatur.auftraege);
  const { forderungen, verbindlichkeiten } = schuldenSumme(finanzen.schulden, finanzen.zahlungen);
  const saldo = forderungen - verbindlichkeiten;
  const zeile = (name, info, betrag) => `
    <div class="punkt-zeile">
      <div class="punkt-info"><strong>${name}</strong><small>${info}</small></div>
      <strong class="${betrag < 0 ? 'betrag-minus' : 'betrag-plus'}">${eur(betrag)}</strong>
    </div>`;
  const block = (titel, wert, summe) => `
    <div class="section-head"><h2>${titel}</h2></div>
    <div class="punkt-liste">
      ${zeile('Kontostand', 'alle Konten', stand)}
      ${zeile('Warenwert', 'Lager und Handyaufträge', wert)}
      ${zeile('Schulden-Saldo', `mir geschuldet ${eur(forderungen)} − ich schulde ${eur(verbindlichkeiten)}`, saldo)}
      ${zeile('Summe', '', summe)}
    </div>`;

  container.innerHTML = `
    <div class="modul-kopf">
      <button id="gs-zurueck" type="button">‹ Home</button>
      <h2>Gesamt</h2>
    </div>
    <div class="stat-karte gross">
      <small>Gesamt erwartet</small>
      <span class="betrag-plus">${eur(stand + wertErw + saldo)}</span>
      <small>mindestens <span class="betrag-minus">${eur(stand + wertMin + saldo)}</span></small>
    </div>
    ${block('Erwartet (mit erwartetem Warenwert)', wertErw, stand + wertErw + saldo)}
    ${block('Mindestens (mit Warenwert)', wertMin, stand + wertMin + saldo)}`;
  container.querySelector('#gs-zurueck').addEventListener('click', () => { location.hash = '#/home'; });
}
