import { gesamtKontostand, zeitraumVon, summenProKategorieZeitraum, kategorisiereIconTyp } from './berechnung.js';

const RANGES = [['7T', '7T'], ['30T', '30T'], ['3M', '3M'], ['6M', '6M'], ['1J', '1J']];

const DOWN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16"/><path d="M6 14l6 6 6-6"/></svg>';
const UP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="M6 10l6-6 6 6"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
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

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum) {
  const heuteStr = heute();
  const von = zeitraumVon(zeitraum, heuteStr);
  const stand = gesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, heuteStr);
  const imFenster = (b) => b.datum >= von && b.datum <= heuteStr;
  const ausgabenSumme = zustand.expenses.filter(imFenster).reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = zustand.einnahmen.filter(imFenster).reduce((s, e) => s + e.betrag, 0);
  const differenz = einnahmenSumme - ausgabenSumme;
  const kategorien = summenProKategorieZeitraum(zustand.expenses, von, heuteStr).slice(0, 4);

  container.innerHTML = `
    <div class="stat-karte gross" id="uebersicht-kontostand" style="cursor:pointer;">
      <small>Kontostand</small>
      <span>${stand.toFixed(2)} €</span>
      <div class="range-row">
        ${RANGES.map(([id, txt]) => `<button type="button" data-range="${id}" class="range${id === zeitraum ? ' aktiv' : ''}">${txt}</button>`).join('')}
      </div>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge gruen">${DOWN_ICON}</div>
        <div class="punkt-info"><strong>Einnahmen</strong></div>
        <strong class="betrag-plus">+${einnahmenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="icon-badge rot">${UP_ICON}</div>
        <div class="punkt-info"><strong>Ausgaben</strong></div>
        <strong class="betrag-minus">-${ausgabenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="icon-badge">${PLUS_ICON}</div>
        <div class="punkt-info"><strong>Differenz</strong></div>
        <strong>${differenz >= 0 ? '+' : ''}${differenz.toFixed(2)} €</strong></div>
    </div>
    <div class="section-head"><h2>Ausgaben nach Kategorie</h2>
      <button type="button" class="link-muted" id="uebersicht-alle-kategorien">Alle anzeigen</button></div>
    <div class="punkt-liste">
      ${kategorien.length === 0 ? '<p class="lade">Keine Ausgaben in diesem Zeitraum.</p>' : kategorien.map((k) => `
        <div class="kategorie-zeile">
          <div class="kategorie-zeile-kopf">
            <span class="kategorie-zeile-name"><span class="icon-badge">${KATEGORIE_ICON[kategorisiereIconTyp(k.kategorie)]}</span>${esc(k.kategorie)}</span>
            <span class="kategorie-zeile-wert">${k.prozent}%&nbsp;&nbsp;<strong>${k.summe.toFixed(2)} €</strong></span>
          </div>
          <div class="kategorie-balken-bg"><div class="kategorie-balken-fuellung" style="width:${k.prozent}%;"></div></div>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => setZeitraum(btn.dataset.range));
  });
  container.querySelector('#uebersicht-kontostand').addEventListener('click', () => {
    location.hash = '#/home/kontostand';
  });
  container.querySelector('#uebersicht-alle-kategorien').addEventListener('click', () => {
    location.hash = '#/finanzen/analyse';
  });
}
