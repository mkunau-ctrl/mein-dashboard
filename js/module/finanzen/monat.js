import { summeProMonat, summenProKategorie } from './berechnung.js';

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];
const KATEGORIE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeMonat(container, zustand) {
  const d = new Date().toISOString().slice(0, 10);
  let jahr = +d.slice(0, 4);
  let monat = +d.slice(5, 7);
  const jetztJahr = jahr;
  const jetztMonat = monat;

  container.innerHTML = `
    <div class="hm-kopf">
      <button id="m-zurueck" type="button">‹</button>
      <span id="m-titel"></span>
      <button id="m-vor" type="button">›</button>
    </div>
    <div class="stat-karte gross">
      <small>Ausgaben im Monat</small>
      <span id="m-summe"></span>
    </div>
    <div id="m-kategorien"></div>`;

  function zeichne() {
    container.querySelector('#m-titel').textContent = `${MONATE[monat - 1]} ${jahr}`;
    const summe = summeProMonat(zustand.expenses, jahr, monat);
    container.querySelector('#m-summe').textContent = `${summe.toFixed(2)} €`;
    const kategorien = summenProKategorie(zustand.expenses, jahr, monat);
    const max = kategorien.length ? kategorien[0].summe : 0;
    const box = container.querySelector('#m-kategorien');
    box.innerHTML = kategorien.length ? kategorien.map((k) => `
      <div class="quote-zeile betrag">
        <span class="quote-label"><span class="icon-badge">${KATEGORIE_ICON}</span>${esc(k.kategorie)}</span>
        <span class="quote-bar"><i style="width:${max ? Math.round((k.summe / max) * 100) : 0}%"></i></span>
        <span class="quote-zahl">${k.summe.toFixed(2)} €</span>
      </div>`).join('') : '<p class="lade">Keine Ausgaben in diesem Monat.</p>';
    container.querySelector('#m-vor').disabled = (jahr === jetztJahr && monat === jetztMonat);
  }
  container.querySelector('#m-zurueck').addEventListener('click', () => {
    monat -= 1; if (monat === 0) { monat = 12; jahr -= 1; } zeichne();
  });
  container.querySelector('#m-vor').addEventListener('click', () => {
    if (jahr === jetztJahr && monat === jetztMonat) return;
    monat += 1; if (monat === 13) { monat = 1; jahr += 1; } zeichne();
  });
  zeichne();
}
