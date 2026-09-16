import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { wochenStart } from './berechnung.js';

const TABS = [['eintraege', 'Einträge'], ['drucken', 'Drucken']];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

export function eintraegeDieseWoche() {
  if (!zustand) return 0;
  const heute = new Date().toISOString().slice(0, 10);
  const start = wochenStart(heute);
  return zustand.eintraege.filter((e) => wochenStart(e.datum) === start).length;
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Berichtsheft</h2>
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
    b.addEventListener('click', () => { location.hash = `#/berichtsheft/${b.dataset.tab}`; });
  });
}

const LADER = {
  eintraege: () => import('./eintraege.js').then((m) => m.zeigeEintraege),
  drucken: () => import('./drucken.js').then((m) => m.zeigeDrucken),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'eintraege';
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
  if (modul === 'berichtsheft' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'berichtsheft',
  titel: 'Berichtsheft',
  renderKachel(el) {
    const n = eintraegeDieseWoche();
    el.innerHTML = `Berichtsheft<span class="kachel-zahl">${n}</span><small>diese Woche</small>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
