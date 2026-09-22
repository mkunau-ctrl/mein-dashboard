import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';

const TABS = [
  ['uebersicht', 'Übersicht'], ['transaktionen', 'Transaktionen'], ['analyse', 'Analyse'],
  ['regelmaessige-ausgaben', 'Regelmäßige Ausgaben'],
  ['teile', 'Teile'], ['bestellen', 'Bestellen'],
];

let zustand = null;
let containerRef = null;
let zeitraum = '30T';

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
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/finanzen/${b.dataset.tab}`; });
  });
}

const LADER = {
  uebersicht: () => import('./uebersicht.js').then((m) => m.zeigeUebersicht),
  transaktionen: () => import('./transaktionen.js').then((m) => m.zeigeTransaktionen),
  analyse: () => import('./analyse.js').then((m) => m.zeigeAnalyse),
  'regelmaessige-ausgaben': () => import('./regelmaessige-ausgaben.js').then((m) => m.zeigeRegelmaessigeAusgaben),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};

async function zeigeAktuellenTab() {
  const { unterseite, detail } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'uebersicht';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.classList.remove('einblenden');
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  const setZeitraum = (neu) => { zeitraum = neu; zeigeAktuellenTab(); };

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    }, zeitraum, setZeitraum, detail);
    void inhalt.offsetWidth; // Reflow erzwingen, damit die Animation bei jedem Wechsel neu startet
    inhalt.classList.add('einblenden');
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
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    if (zustand) await zeigeAktuellenTab();
    await ladeZustand();
    if (containerRef === container && containerRef.isConnected) await zeigeAktuellenTab();
  },
  async aktualisieren() {
    await ladeZustand();
    await zeigeAktuellenTab();
  },
});
