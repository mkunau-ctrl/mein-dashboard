import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { istUeberfaellig } from './planung.js';

const TABS = [['offen', 'Offen'], ['erledigt', 'Erledigt']];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export function offenFortschritt() {
  if (!zustand) return { offen: 0, ueberfaellig: 0 };
  const d = heute();
  return {
    offen: zustand.offen.length,
    ueberfaellig: zustand.offen.filter((t) => istUeberfaellig(t, d)).length,
  };
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
    b.addEventListener('click', () => { location.hash = `#/todos/${b.dataset.tab}`; });
  });
}

const LADER = {
  offen: () => import('./offen.js').then((m) => m.zeigeOffen),
  erledigt: () => import('./erledigt.js').then((m) => m.zeigeErledigt),
};

async function zeigeAktuellenTab() {
  const { unterseite, detail } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'offen';
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
    }, null, null, detail);
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'todos' && containerRef && containerRef.isConnected) zeigeAktuellenTab();
}

registriere({
  id: 'todos',
  titel: 'To-dos',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  renderKachel(el) {
    const f = offenFortschritt();
    el.innerHTML = `To-dos<span class="kachel-zahl">${f.offen}</span>
      ${f.ueberfaellig ? `<small class="todo-ueberfaellig">${f.ueberfaellig} überfällig</small>` : ''}`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
