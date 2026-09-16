import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { merkliste } from './berechnung.js';

const TABS = [['teile', 'Teile'], ['bestellen', 'Bestellen']];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

export function offeneBestellungen() {
  if (!zustand) return 0;
  return merkliste(zustand.teile).length;
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Lager</h2>
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
    b.addEventListener('click', () => { location.hash = `#/lager/${b.dataset.tab}`; });
  });
}

const LADER = {
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'teile';
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
  if (modul === 'lager' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'lager',
  titel: 'Lager',
  renderKachel(el) {
    const n = offeneBestellungen();
    el.innerHTML = `Lager<span class="kachel-zahl">${n}</span>
      <small>${n === 1 ? 'zu bestellen/fehlt' : 'zu bestellen/fehlen'}</small>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
