import { warenwert, erwarteterWarenwert, merkliste } from '../finanzen/berechnung.js';
import { erwarteterGewinn } from '../handyreparatur/berechnung.js';
import { neueFunde } from './berechnung.js';

export async function zeigeUebersicht(container, zustand) {
  const min = warenwert(zustand.teile, zustand.handyreparaturAuftraege);
  const erw = erwarteterWarenwert(zustand.teile, zustand.handyreparaturAuftraege);
  const offen = zustand.handyreparaturAuftraege.filter((a) => a.status !== 'verkauft').length;
  container.innerHTML = `
    <div class="stat-karte gross">
      <small>Warenwert (mindestens)</small>
      <span>${min.toFixed(2)} €</span>
      <small>erwartet ${erw.toFixed(2)} €</small>
    </div>
    <div class="stat-karte">
      <small>Erwarteter Gewinn aus Aufträgen</small>
      <span>${erwarteterGewinn(zustand.handyreparaturAuftraege).toFixed(2)} €</span>
      <small>${offen} offene/fertige Aufträge</small>
    </div>
    <div class="stat-karte">
      <small>Ersatzteile</small>
      <span>${zustand.teile.length}</span>
      <small>${merkliste(zustand.teile).length} auf der Bestell-Merkliste</small>
    </div>
    <div class="stat-karte">
      <small>Neue Funde</small>
      <span>${neueFunde(zustand.funde)}</span>
      <small>Kleinanzeigen, nur gute Bewertungen</small>
    </div>`;
}
