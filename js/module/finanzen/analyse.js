import { summenProKategorie, summenProBezeichnungZeitraum, letzteMonate,
  summeProMonat, jahresUebersicht, kategorisiereIconTyp } from './berechnung.js';

const KATEGORIE_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l2-6h14l2 6v6H3v-6z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></svg>',
  essen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v7a3 3 0 003 3v9M4 3v7M7 3v7"/><path d="M18 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  freizeit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
  sonstiges: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function kategorieZeile(k) {
  return `<div class="kategorie-zeile" data-kategorie="${esc(k.kategorie.toLowerCase())}" style="cursor:pointer;">
    <div class="kategorie-zeile-kopf">
      <span class="kategorie-zeile-name"><span class="icon-badge">${KATEGORIE_ICON[kategorisiereIconTyp(k.kategorie)]}</span>${esc(k.kategorie)}</span>
      <span class="kategorie-zeile-wert">${k.prozent}%&nbsp;&nbsp;<strong>${k.summe.toFixed(2)} €</strong></span>
    </div>
    <div class="kategorie-balken-bg"><div class="kategorie-balken-fuellung" style="width:${k.prozent}%;"></div></div>
  </div>`;
}

export async function zeigeAnalyse(container, zustand, aktualisieren, zeitraum, setZeitraum, detail) {
  if (detail && detail.startsWith('kategorie-')) {
    const { zeigeKategorieDetail } = await import('./kategorie-detail.js');
    zeigeKategorieDetail(container, zustand, detail.slice('kategorie-'.length), () => {
      location.hash = '#/finanzen/analyse';
    });
    return;
  }
  const heuteStr = new Date().toISOString().slice(0, 10);
  const jahr = Number(heuteStr.slice(0, 4));
  const monat = Number(heuteStr.slice(5, 7));
  const monatsAnfang = `${heuteStr.slice(0, 7)}-01`;

  const ausgabenKategorien = summenProKategorie(zustand.expenses, jahr, monat);
  const einnahmenQuellen = summenProBezeichnungZeitraum(zustand.einnahmen, monatsAnfang, heuteStr);

  const monate = letzteMonate(6, heuteStr);
  const monatsDaten = monate.map(({ jahr: j, monat: m }) => ({
    label: MONATE_KURZ[m - 1],
    ausgaben: summeProMonat(zustand.expenses, j, m),
    einnahmen: summeProMonat(zustand.einnahmen, j, m),
  }));
  const maxWert = Math.max(1, ...monatsDaten.flatMap((m) => [m.ausgaben, m.einnahmen]));

  const jahresDaten = jahresUebersicht(zustand.expenses, zustand.einnahmen, jahr);

  container.innerHTML = `
    <div class="section-head"><h2>Ausgaben nach Kategorie (${MONATE_KURZ[monat - 1]})</h2></div>
    <div class="punkt-liste">
      ${ausgabenKategorien.length === 0 ? '<p class="lade">Keine Ausgaben diesen Monat.</p>' : ausgabenKategorien.map(kategorieZeile).join('')}
    </div>
    <div class="section-head"><h2>Einnahmen nach Quelle (${MONATE_KURZ[monat - 1]})</h2></div>
    <div class="punkt-liste">
      ${einnahmenQuellen.length === 0 ? '<p class="lade">Keine Einnahmen diesen Monat.</p>' : einnahmenQuellen.map((q) => `
        <div class="punkt-zeile">
          <div class="icon-badge gruen">${EINNAHME_ICON}</div>
          <div class="punkt-info"><strong>${esc(q.bezeichnung)}</strong></div>
          <strong class="betrag-plus">${q.summe.toFixed(2)} €</strong>
        </div>`).join('')}
    </div>
    <div class="section-head"><h2>Letzte 6 Monate</h2></div>
    <div class="punkt-liste">
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:14px 4px;">
        ${monatsDaten.map((m) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="display:flex;gap:2px;align-items:flex-end;height:90px;">
              <div style="width:8px;background:var(--hm-gruen);border-radius:3px 3px 0 0;height:${Math.max(2, (m.einnahmen / maxWert) * 90)}px;"></div>
              <div style="width:8px;background:var(--hm-rot);border-radius:3px 3px 0 0;height:${Math.max(2, (m.ausgaben / maxWert) * 90)}px;"></div>
            </div>
            <span style="font-size:.7rem;color:var(--gedaempft);">${m.label}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="section-head"><h2>Jahresübersicht ${jahr}</h2></div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="punkt-info"><strong>Einnahmen</strong></div><strong class="betrag-plus">+${jahresDaten.einnahmenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Ausgaben</strong></div><strong class="betrag-minus">-${jahresDaten.ausgabenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Sparquote</strong></div><strong>${jahresDaten.sparquote === null ? '–' : jahresDaten.sparquote + ' %'}</strong></div>
    </div>`;

  container.querySelectorAll('[data-kategorie]').forEach((el) => {
    el.addEventListener('click', () => {
      location.hash = `#/finanzen/analyse/kategorie-${el.dataset.kategorie}`;
    });
  });
}
