import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { sucheAlles } from './berechnung.js';

const SUCHE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
const CASH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
const RECEIPT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>';
const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';
const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
const HANDY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const VIDEO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>';
const X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
const TYP_ICON = { expense: RECEIPT_ICON, todo: TODO_ICON, sendung: BOX_ICON, termin: KALENDER_ICON, notiz: DOC_ICON };

const SCHNELLEINSTIEGE = [
  { label: 'Kontostand', icon: CASH_ICON, ziel: '#/finanzen' },
  { label: 'Rechnungen', icon: RECEIPT_ICON, ziel: '#/rechnungen' },
  { label: 'Sendungen', icon: BOX_ICON, ziel: '#/sendungen' },
  { label: 'Berichtsheft', icon: DOC_ICON, ziel: '#/berichtsheft' },
  { label: 'Flipping', icon: HANDY_ICON, ziel: '#/flipping' },
  { label: 'Handyreparaturen', icon: HANDY_ICON, ziel: '#/handyreparatur' },
  { label: 'Projekte', icon: FOLDER_ICON, ziel: '#/projekte' },
  { label: 'Dateien', icon: FOLDER_ICON, ziel: '#/dateien' },
  { label: 'Videos', icon: VIDEO_ICON, ziel: '#/videos' },
  { label: 'Agenten', icon: SUCHE_ICON, ziel: '#/agenten' },
  { label: 'Kalender', icon: KALENDER_ICON, ziel: '#/kalender' },
  { label: 'Notizen', icon: DOC_ICON, ziel: '#/notizen' },
  { label: 'Woche', icon: KALENDER_ICON, ziel: '#/woche' },
];

const LETZTE_SUCHEN_SCHLUESSEL = 'letzteSuchen';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function ladeLetzteSuchen() {
  try {
    const roh = localStorage.getItem(LETZTE_SUCHEN_SCHLUESSEL);
    return roh ? JSON.parse(roh) : [];
  } catch { return []; }
}

function speichereLetzteSuche(text) {
  if (!text.trim()) return;
  try {
    const bisherige = ladeLetzteSuchen().filter((s) => s !== text);
    const neu = [text, ...bisherige].slice(0, 5);
    localStorage.setItem(LETZTE_SUCHEN_SCHLUESSEL, JSON.stringify(neu));
  } catch { /* Storage evtl. blockiert, kein kritischer Zustand */ }
}

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function render(container, kompakt = false) {
  container.innerHTML = `
    <div class="searchbar${kompakt ? '' : ' searchbar-fix'}" style="margin:16px 0;">
      ${SUCHE_ICON}
      <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
      <button type="button" id="suche-leeren" class="suche-leeren" aria-label="Suche leeren" hidden>${X_ICON}</button>
    </div>
    <div id="suche-treffer" class="punkt-liste" hidden></div>
    <div id="suche-standard" ${kompakt ? 'hidden' : ''}>
      <div class="section-head"><h2>Schnelleinstiege</h2></div>
      <div class="punkt-liste" id="suche-schnell"></div>
      <div class="section-head"><h2>Letzte Suchen</h2></div>
      <div class="punkt-liste" id="suche-letzte">
        ${ladeLetzteSuchen().length === 0 ? '<p class="lade">Noch keine Suchen.</p>' : ''}
      </div>
    </div>`;

  const schnellBox = container.querySelector('#suche-schnell');
  SCHNELLEINSTIEGE.forEach((item) => {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `<div class="icon-badge">${item.icon}</div>
      <div class="punkt-info"><strong>${esc(item.label)}</strong></div>
      <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
    zeile.addEventListener('click', () => {
      if (item.ziel) location.hash = item.ziel;
      else alert('Noch nicht verfügbar.');
    });
    schnellBox.appendChild(zeile);
  });

  const letzteBox = container.querySelector('#suche-letzte');
  ladeLetzteSuchen().forEach((text) => {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `<div class="icon-badge">${SUCHE_ICON}</div><div class="punkt-info"><strong>${esc(text)}</strong></div>`;
    zeile.addEventListener('click', () => { eingabe.value = text; eingabe.dispatchEvent(new Event('input')); });
    letzteBox.appendChild(zeile);
  });

  const eingabe = container.querySelector('#suche-eingabe');
  const trefferListe = container.querySelector('#suche-treffer');
  const standardBox = container.querySelector('#suche-standard');
  let letzteSucheGespeichert = '';

  const leeren = container.querySelector('#suche-leeren');
  leeren.addEventListener('click', () => {
    eingabe.value = '';
    eingabe.dispatchEvent(new Event('input'));
    eingabe.focus();
  });

  eingabe.addEventListener('input', () => {
    const wert = eingabe.value;
    leeren.hidden = !wert;
    if (!wert.trim()) {
      trefferListe.hidden = true;
      standardBox.hidden = kompakt;
      return;
    }
    standardBox.hidden = true;
    trefferListe.hidden = false;
    const treffer = sucheAlles(zustand, wert);
    trefferListe.innerHTML = treffer.length === 0
      ? '<p class="lade">Keine Treffer.</p>'
      : treffer.map((t) => `
        <div class="punkt-zeile" data-ziel="${esc(t.ziel)}" style="cursor:pointer;">
          <div class="icon-badge">${TYP_ICON[t.typ] || SUCHE_ICON}</div>
          <div class="punkt-info"><strong>${esc(t.titel)}</strong><small>${esc(t.info)}</small></div>
          <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>
        </div>`).join('');
    trefferListe.querySelectorAll('[data-ziel]').forEach((zeile) => {
      zeile.addEventListener('click', () => { location.hash = zeile.dataset.ziel; });
    });
    if (wert !== letzteSucheGespeichert) {
      letzteSucheGespeichert = wert;
      speichereLetzteSuche(wert);
    }
  });
}

// Suchfeld eingebettet (z. B. auf Home): nur Eingabe und Treffer, ohne Schnelleinstiege.
export function zeigeSucheIn(container) {
  render(container, true);
  if (!zustand) ladeZustand();
}

registriere({
  id: 'suche',
  titel: 'Suche',
  icon: SUCHE_ICON,
  async init(container) {
    containerRef = container;
    render(container); // sofort anzeigen, sucheAlles() liest zustand erst beim Tippen
    ladeZustand(); // bewusst nicht awaited: laeuft im Hintergrund, zustand ist spaetestens beim ersten Tastendruck da
  },
});
