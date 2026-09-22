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
      <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
    </header>
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
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
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-3 0-5 2.2-5 5.5S9 20 12 20s5-2.7 5-6.5S15 8 12 8Z"/><path d="M12 8c0-2 1-3.5 3-4"/></svg>',
  renderKachel(el) {
    const f = heuteFortschritt();
    el.innerHTML = `Ernährung<span class="kachel-zahl">${f.erledigt}/${f.faellig}</span>`;
  },
  async init(container) {
    containerRef = container;
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    if (zustand) await zeigeAktuellenTab();
    await ladeZustand();
    if (containerRef === container && containerRef.isConnected) await zeigeAktuellenTab();
  },
});
