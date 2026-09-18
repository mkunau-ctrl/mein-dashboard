import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { kontostand, unechterKontostand } from '../finanzen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';
import { sortiereSendungen, sortiereTermine } from '../sendungen/berechnung.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function abschnitt(titel, ziel, zeilenHtml) {
  return `
    <div class="section-head"><h2>${titel}</h2><a href="${ziel}" class="link-muted">Alle anzeigen</a></div>
    <div class="punkt-liste">${zeilenHtml || '<p class="lade">Nichts Offenes.</p>'}</div>`;
}

registriere({
  id: 'home',
  titel: 'Home',
  icon: HOME_ICON,
  async init(container) {
    if (!zustand) await ladeZustand();
    const { finanzen, todos, sendungen } = zustand;
    const gesetzt = finanzen.settings.kontostand_start !== undefined;
    const stand = gesetzt ? kontostand(finanzen.settings, finanzen.expenses, heute()) : null;
    const unecht = gesetzt ? unechterKontostand(finanzen.settings, finanzen.expenses, finanzen.teile, heute()) : null;

    const termineHtml = sortiereTermine(sendungen.termine).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
      .join('');
    const sendungenHtml = sortiereSendungen(sendungen.sendungen).filter((s) => s.status !== 'zugestellt').slice(0, 3)
      .map((s) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(s.haendler)}</strong><small>${s.status}</small></div></div>`)
      .join('');
    const todosHtml = sortiereOffeneTodos(todos.offen, heute()).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
      .join('');

    container.innerHTML = `
      <header class="modul-kopf"><h2>Home</h2></header>
      <div class="stat-karte gross">
        <small>Kontostand</small>
        <span>${gesetzt ? stand.toFixed(2) + ' €' : '–'}</span>
        ${gesetzt ? `<small>${unecht.toFixed(2)} € inkl. Warenwert</small>` : ''}
      </div>
      <section>${abschnitt('Nächste Termine', '#/sendungen/termine', termineHtml)}</section>
      <section>${abschnitt('Aktuelle Sendungen', '#/sendungen/pakete', sendungenHtml)}</section>
      <section>${abschnitt('Offene To-dos', '#/todos', todosHtml)}</section>`;
  },
});
