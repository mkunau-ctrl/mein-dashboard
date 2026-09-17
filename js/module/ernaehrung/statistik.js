import { ladeLogSeit } from './daten.js';
import {
  heute, streak, prognose, quoteProPunkt, heatmapDaten,
} from './berechnung.js';

const STATUS_FARBE = {
  erfuellt: 'var(--hm-gruen)', teilweise: 'var(--hm-gelb)',
  offen: 'var(--hm-rot)', keine: 'var(--rand)',
};
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli',
  'August', 'September', 'Oktober', 'November', 'Dezember'];
const PUNKT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-3 0-5 2.2-5 5.5S9 20 12 20s5-2.7 5-6.5S15 8 12 8Z"/><path d="M12 8c0-2 1-3.5 3-4"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeStatistik(container, zustand) {
  const d = heute();
  const start = zustand.items.length
    ? zustand.items.map((it) => it.erstellt_am.slice(0, 10)).reduce((a, b) => (a < b ? a : b))
    : d;
  const logs = await ladeLogSeit(start);
  const items = zustand.items;

  const s = streak(items, logs, d);
  const p = prognose(items, logs, d);
  const quoten = quoteProPunkt(items, logs, d, 30);

  container.innerHTML = `
    <div class="stat-karten">
      <div class="stat-karte"><span>${s.aktuell}</span><small>aktuelle Serie (Tage)</small></div>
      <div class="stat-karte"><span>${s.laengste}</span><small>längste Serie</small></div>
    </div>
    <p class="stat-prognose">Bei aktuellem Tempo (${Math.round(p.quote * 100)} %):
      <strong>≈ ${p.erwartet} von ${p.zielTage} Tagen</strong> mit erreichtem Tagesziel.</p>
    <h3>Quote je Punkt (letzte 30 Tage)</h3>
    <div class="quote-liste">
      ${quoten.map((q) => `
        <div class="quote-zeile">
          <span class="quote-label"><span class="icon-badge">${PUNKT_ICON}</span>${esc(q.label)}</span>
          <span class="quote-bar"><i style="width:${Math.round(q.quote * 100)}%"></i></span>
          <span class="quote-zahl">${q.faelligeTage ? `${Math.round(q.quote * 100)} %` : '—'}</span>
        </div>`).join('')}
    </div>
    <h3>Kalender</h3>
    <div class="hm-kopf">
      <button id="hm-zurueck" type="button">‹</button>
      <span id="hm-titel"></span>
      <button id="hm-vor" type="button">›</button>
    </div>
    <div id="hm-grid" class="hm-grid"></div>`;

  let jahr = +d.slice(0, 4);
  let monat = +d.slice(5, 7);
  const jetztJahr = +d.slice(0, 4);
  const jetztMonat = +d.slice(5, 7);

  function zeichneHeatmap() {
    container.querySelector('#hm-titel').textContent = `${MONATE[monat - 1]} ${jahr}`;
    const tage = heatmapDaten(jahr, monat, items, logs);
    const ersterWt = (new Date(Date.UTC(jahr, monat - 1, 1)).getUTCDay() + 6) % 7;
    const grid = container.querySelector('#hm-grid');
    grid.innerHTML = '';
    for (let i = 0; i < ersterWt; i += 1) grid.appendChild(document.createElement('span'));
    for (const t of tage) {
      const zelle = document.createElement('span');
      zelle.className = 'hm-zelle';
      zelle.style.background = STATUS_FARBE[t.status];
      zelle.title = `${t.datum}: ${t.status}`;
      zelle.textContent = +t.datum.slice(8, 10);
      grid.appendChild(zelle);
    }
    container.querySelector('#hm-vor').disabled = (jahr === jetztJahr && monat === jetztMonat);
  }
  container.querySelector('#hm-zurueck').addEventListener('click', () => {
    monat -= 1; if (monat === 0) { monat = 12; jahr -= 1; } zeichneHeatmap();
  });
  container.querySelector('#hm-vor').addEventListener('click', () => {
    if (jahr === jetztJahr && monat === jetztMonat) return;
    monat += 1; if (monat === 13) { monat = 1; jahr += 1; } zeichneHeatmap();
  });
  zeichneHeatmap();
}
