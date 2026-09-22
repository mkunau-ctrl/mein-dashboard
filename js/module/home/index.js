import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { gesamtKontostand, unechterGesamtKontostand, summeProMonat } from '../finanzen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';
import { sortiereSendungen, sortiereTermine } from '../sendungen/berechnung.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function abschnitt(titel, ziel, zeilenHtml) {
  return `
    <div class="section-head"><h2>${titel}</h2><a href="${ziel}" class="link-muted">Alle anzeigen</a></div>
    <div class="punkt-liste">${zeilenHtml || '<p class="lade">Nichts Offenes.</p>'}</div>`;
}

function renderHome(container) {
  const { finanzen, todos, sendungen } = zustand;
  const gesetzt = finanzen.konten.length > 0;
  const stand = gesetzt ? gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute()) : null;
  const unecht = gesetzt ? unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heute()) : null;
  const heuteDatum = new Date();
  const ausgabenMonat = summeProMonat(finanzen.expenses, heuteDatum.getFullYear(), heuteDatum.getMonth() + 1);

  const termineHtml = sortiereTermine(sendungen.termine).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
    .join('');
  const sendungenHtml = sortiereSendungen(sendungen.sendungen).filter((s) => s.status !== 'zugestellt').slice(0, 3)
    .map((s) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(s.haendler)}</strong><small>${esc(s.status)}</small></div></div>`)
    .join('');
  const todosHtml = sortiereOffeneTodos(todos.offen, heute()).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
    .join('');

  container.innerHTML = `
    <header class="modul-kopf"><h2>Home</h2></header>
    <div class="stat-karte gross" id="home-kontostand" style="cursor:pointer;">
      <small>Kontostand</small>
      <span>${gesetzt ? stand.toFixed(2) + ' €' : '–'}</span>
      ${gesetzt ? `<small>${unecht.toFixed(2)} € inkl. Warenwert</small>` : ''}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="icon-badge">${WALLET_ICON}</div>
        <div class="stat-lbl">Kontostand</div>
        <div class="stat-val">${gesetzt ? stand.toFixed(2) + ' €' : '–'}</div></div>
      <div class="stat"><div class="icon-badge">${BOX_ICON}</div>
        <div class="stat-lbl">Unecht</div>
        <div class="stat-val">${gesetzt ? unecht.toFixed(2) + ' €' : '–'}</div></div>
      <div class="stat"><div class="icon-badge rot">${AUSGABE_ICON}</div>
        <div class="stat-lbl">Ausgaben Monat</div>
        <div class="stat-val">${ausgabenMonat.toFixed(2)} €</div></div>
    </div>
    <section>${abschnitt('Nächste Termine', '#/sendungen/termine', termineHtml)}</section>
    <section>${abschnitt('Aktuelle Sendungen', '#/sendungen/pakete', sendungenHtml)}</section>
    <section>${abschnitt('Offene To-dos', '#/todos', todosHtml)}</section>`;

  if (gesetzt) {
    container.querySelector('#home-kontostand').addEventListener('click', () => {
      location.hash = '#/home/kontostand';
    });
  }
}

async function zeigeAktuelleAnsicht() {
  const { unterseite } = parseHash(location.hash);
  if (unterseite === 'kontostand') {
    const { zeigeKontostandDetail } = await import('./kontostand.js');
    containerRef.innerHTML = '';
    await zeigeKontostandDetail(containerRef, zustand);
  } else {
    renderHome(containerRef);
  }
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'home' && containerRef && containerRef.isConnected) zeigeAktuelleAnsicht();
}

registriere({
  id: 'home',
  titel: 'Home',
  icon: HOME_ICON,
  async init(container) {
    containerRef = container;
    await ladeZustand();
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuelleAnsicht();
  },
});
