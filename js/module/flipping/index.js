import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';

const TABS = [
  ['uebersicht', 'Übersicht'], ['teile', 'Ersatzteile'], ['bestellen', 'Bestellen'],
  ['auftraege', 'Aufträge'], ['funde', 'Funde'], ['verkauf', 'Verkauf'],
];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueRahmen(container) {
  container.innerHTML = `
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/flipping/${b.dataset.tab}`; });
  });
}

const LADER = {
  uebersicht: () => import('./uebersicht.js').then((m) => m.zeigeUebersicht),
  teile: () => import('../finanzen/teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('../finanzen/bestellen.js').then((m) => m.zeigeBestellen),
  auftraege: () => import('../handyreparatur/index.js').then((m) => (inhalt) => m.zeigeAuftraege(inhalt, false)),
  funde: () => import('./funde.js').then((m) => m.zeigeFunde),
  verkauf: () => import('./verkauf.js').then((m) => m.zeigeVerkauf),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'uebersicht';
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
  if (modul === 'flipping' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'flipping',
  titel: 'Flipping',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3l4 4-4 4"/><path d="M3 11V9a2 2 0 0 1 2-2h16"/><path d="M7 21l-4-4 4-4"/><path d="M21 13v2a2 2 0 0 1-2 2H3"/></svg>',
  async init(container) {
    containerRef = container;
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    if (zustand) await zeigeAktuellenTab();
    await ladeZustand();
    if (containerRef === container && containerRef.isConnected) await zeigeAktuellenTab();
  },
  async aktualisieren() {
    await ladeZustand();
    if (containerRef && containerRef.isConnected) await zeigeAktuellenTab();
  },
});
