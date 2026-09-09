import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { heute, letzteErledigungVor } from './berechnung.js';
import { istFaellig } from './zeitplan.js';

const TABS = [
  ['heute', 'Heute'], ['liste', 'Liste'], ['gewicht', 'Gewicht'],
  ['statistik', 'Statistik'], ['infos', 'Infos'],
];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

// Heute fällige Pflicht-Punkte + davon erledigt (für Kachel + Ring).
export function heuteFortschritt() {
  if (!zustand) return { faellig: 0, erledigt: 0 };
  const d = heute();
  const faellig = zustand.items.filter((it) => {
    if (!it.pflicht) return false;
    const k = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigungVor(it.id, d, zustand.logs) } : {};
    return istFaellig(it, d, k);
  });
  const erledigt = faellig.filter((it) =>
    zustand.logs.some((l) => l.datum === d && l.item_id === it.id && l.erledigt));
  return { faellig: faellig.length, erledigt: erledigt.length };
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Ernährung</h2>
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
    b.addEventListener('click', () => { location.hash = `#/ernaehrung/${b.dataset.tab}`; });
  });
}

const LADER = {
  heute: () => import('./heute.js').then((m) => m.zeigeHeute),
  liste: () => import('./liste.js').then((m) => m.zeigeListe),
  gewicht: () => import('./gewicht.js').then((m) => m.zeigeGewicht),
  statistik: () => import('./statistik.js').then((m) => m.zeigeStatistik),
  infos: () => import('./infos.js').then((m) => m.zeigeInfos),
};

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'heute';
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
  if (modul === 'ernaehrung' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'ernaehrung',
  titel: 'Ernährung',
  renderKachel(el) {
    const f = heuteFortschritt();
    el.innerHTML = `Ernährung<span class="kachel-zahl">${f.erledigt}/${f.faellig}</span>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
