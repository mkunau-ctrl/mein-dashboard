import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { sucheAlles } from './berechnung.js';

const SUCHE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

registriere({
  id: 'suche',
  titel: 'Suche',
  icon: SUCHE_ICON,
  async init(container) {
    if (!zustand) await ladeZustand();
    container.innerHTML = `
      <header class="modul-kopf"><h2>Suche</h2></header>
      <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …" style="width:100%">
      <div id="suche-treffer" class="punkt-liste"></div>`;
    const eingabe = container.querySelector('#suche-eingabe');
    const trefferListe = container.querySelector('#suche-treffer');
    eingabe.addEventListener('input', () => {
      trefferListe.innerHTML = '';
      for (const t of sucheAlles(zustand, eingabe.value)) {
        const zeile = document.createElement('div');
        zeile.className = 'punkt-zeile';
        zeile.style.cursor = 'pointer';
        zeile.innerHTML = `<div class="punkt-info"><strong>${esc(t.titel)}</strong><small>${esc(t.info)}</small></div>`;
        zeile.addEventListener('click', () => { location.hash = t.ziel; });
        trefferListe.appendChild(zeile);
      }
    });
  },
});
