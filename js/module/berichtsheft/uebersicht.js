import { ausbildungsFortschritt } from './berechnung.js';
import { sortiereTermine } from '../sendungen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeUebersicht(container, zustand) {
  const heuteStr = heute();
  const beginn = zustand.settings.ausbildungsbeginn;
  const dauer = zustand.settings.ausbildungsdauer_jahre;
  const gesetzt = beginn != null && dauer != null;
  const fortschritt = gesetzt ? ausbildungsFortschritt(beginn, dauer, heuteStr) : null;

  const termineHtml = sortiereTermine(zustand.termine).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
    .join('');
  const aufgabenHtml = sortiereOffeneTodos(zustand.todosOffen, heuteStr).slice(0, 5)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
    .join('');

  container.innerHTML = `
    <div class="punkt-liste" style="padding:18px;text-align:center;">
      ${gesetzt ? `
        <div class="fortschritt-ring" style="--prozent:${fortschritt.prozent};">
          <span>${fortschritt.prozent}%</span>
          <small>Jahr ${fortschritt.jahr}</small>
        </div>
        <p style="margin:0;color:var(--gedaempft);">Ausbildungsjahr ${fortschritt.jahr} von ${dauer}</p>
      ` : '<p class="lade">Ausbildungsbeginn noch nicht hinterlegt.</p>'}
    </div>
    <div class="section-head"><h2>Nächste Termine</h2></div>
    <div class="punkt-liste">${termineHtml || '<p class="lade">Keine Termine.</p>'}</div>
    <div class="section-head"><h2>Offene Aufgaben</h2></div>
    <div class="punkt-liste">${aufgabenHtml || '<p class="lade">Keine offenen Aufgaben.</p>'}</div>`;
}
