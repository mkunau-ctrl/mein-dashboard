import { kategorisiereIconTyp } from './berechnung.js';

const KATEGORIE_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l2-6h14l2 6v6H3v-6z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></svg>',
  essen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v7a3 3 0 003 3v9M4 3v7M7 3v7"/><path d="M18 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  freizeit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
  sonstiges: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeKategorieDetail(container, zustand, kategorieSlug, zurueck) {
  const ausgaben = zustand.expenses
    .filter((e) => (e.kategorie || '').toLowerCase() === kategorieSlug)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  // Originalschreibweise (z. B. "Essen") aus einer echten Buchung
  // uebernehmen, falls vorhanden, sonst Slug mit grossem Anfangsbuchstaben.
  const kategorie = ausgaben[0]?.kategorie
    || kategorieSlug.charAt(0).toUpperCase() + kategorieSlug.slice(1);
  const summe = ausgaben.reduce((s, e) => s + e.betrag, 0);
  let suchtext = '';

  container.innerHTML = `
    <div class="modul-kopf">
      <button id="kd-zurueck" type="button">‹ Zurück</button>
      <h2>${esc(kategorie)}</h2>
    </div>
    <div class="stat-karte gross">
      <small>Gesamt</small>
      <span>${summe.toFixed(2)} €</span>
      <small>${ausgaben.length} Ausgabe${ausgaben.length === 1 ? '' : 'n'}</small>
    </div>
    <div class="searchbar"><input id="kd-suche" placeholder="In ${esc(kategorie)} suchen …"></div>
    <div class="punkt-liste" id="kd-liste"></div>`;

  container.querySelector('#kd-zurueck').addEventListener('click', zurueck);

  function zeichneListe() {
    const gefiltert = suchtext
      ? ausgaben.filter((e) => (e.notiz || '').toLowerCase().includes(suchtext.toLowerCase()))
      : ausgaben;
    const liste = container.querySelector('#kd-liste');
    liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Treffer.</p>' : gefiltert.map((e) => `
      <div class="punkt-zeile">
        <div class="icon-badge">${KATEGORIE_ICON[kategorisiereIconTyp(kategorie)]}</div>
        <div class="punkt-info"><strong>${esc(e.notiz || kategorie)}</strong><small>${e.datum}${e.quelle === 'foto' ? ' · Kassenbon' : ''}</small></div>
        <strong class="betrag-minus">-${e.betrag.toFixed(2)} €</strong>
      </div>`).join('');
  }

  container.querySelector('#kd-suche').addEventListener('input', (e) => {
    suchtext = e.target.value;
    zeichneListe();
  });
  zeichneListe();
}
