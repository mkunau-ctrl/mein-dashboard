import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';

const TABS = [['ausgaben', 'Ausgaben'], ['kontostand', 'Kontostand'], ['monat', 'Monat'],
  ['abos', 'Abos'], ['teile', 'Teile'], ['bestellen', 'Bestellen']];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

export function heutigeSumme() {
  if (!zustand) return 0;
  const d = new Date().toISOString().slice(0, 10);
  return zustand.expenses.filter((e) => e.datum === d).reduce((s, e) => s + e.betrag, 0);
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Finanzen</h2>
      <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
    </header>
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelector('.zurueck')
    .addEventListener('click', () => { location.hash = ''; });
  container.querySelector('.neu-laden')
    .addEventListener('click', async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/finanzen/${b.dataset.tab}`; });
  });
}

const LADER = {
  ausgaben: () => import('./ausgaben.js').then((m) => m.zeigeAusgaben),
  kontostand: () => import('./kontostand.js').then((m) => m.zeigeKontostand),
  monat: () => import('./monat.js').then((m) => m.zeigeMonat),
  abos: () => import('./abos.js').then((m) => m.zeigeAbos),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'ausgaben';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'finanzen' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'finanzen',
  titel: 'Finanzen',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>',
  renderKachel(el) {
    const summe = heutigeSumme();
    el.innerHTML = `Finanzen<span class="kachel-zahl">${summe.toFixed(2)} €</span>
      <small>heute</small>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
