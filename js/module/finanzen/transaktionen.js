import { zeitraumVon, zuCsvZeilen, kategorisiereIconTyp } from './berechnung.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const KATEGORIEN = ['alle', 'auto', 'essen', 'freizeit', 'sonstiges'];
const KATEGORIE_TEXT = { alle: 'Alle', auto: 'Auto', essen: 'Essen', freizeit: 'Freizeit', sonstiges: 'Sonstiges' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let suchtext = '';
let kategorie = 'alle';

function baueTransaktionen(zustand, von, bis) {
  const ausgaben = zustand.expenses.filter((e) => e.datum >= von && e.datum <= bis)
    .map((e) => ({ datum: e.datum, typ: 'ausgabe', bezeichnung: e.notiz || e.kategorie, kategorie: e.kategorie, betrag: e.betrag, quelle: e.quelle }));
  const einnahmen = zustand.einnahmen.filter((e) => e.datum >= von && e.datum <= bis)
    .map((e) => ({ datum: e.datum, typ: 'einnahme', bezeichnung: e.bezeichnung, kategorie: null, betrag: e.betrag, quelle: e.quelle }));
  return [...ausgaben, ...einnahmen].sort((a, b) => (a.datum < b.datum ? 1 : -1));
}

function ladeCsv(transaktionen) {
  const zeilen = zuCsvZeilen(transaktionen);
  const blob = new Blob([zeilen.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transaktionen-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function zeigeTransaktionen(container, zustand, aktualisieren, zeitraum) {
  const heuteStr = new Date().toISOString().slice(0, 10);
  const von = zeitraumVon(zeitraum, heuteStr);
  const alleTransaktionen = baueTransaktionen(zustand, von, heuteStr);

  container.innerHTML = `
    <div class="searchbar"><input id="tx-suche" placeholder="Transaktionen suchen …" value="${esc(suchtext)}"></div>
    <div class="chips">
      ${KATEGORIEN.map((k) => `<button type="button" class="chip${k === kategorie ? ' aktiv' : ''}" data-k="${k}">${KATEGORIE_TEXT[k]}</button>`).join('')}
    </div>
    <button type="button" id="tx-csv" class="knopf-neutral">CSV exportieren</button>
    <div class="punkt-liste" id="tx-liste"></div>`;

  function zeichneListe() {
    const gefiltert = alleTransaktionen.filter((t) => {
      if (kategorie !== 'alle' && (t.typ !== 'ausgabe' || kategorisiereIconTyp(t.kategorie) !== kategorie)) return false;
      return t.bezeichnung.toLowerCase().includes(suchtext.toLowerCase());
    });
    const liste = container.querySelector('#tx-liste');
    liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Treffer.</p>' : gefiltert.map((t) => `
      <div class="punkt-zeile">
        <div class="icon-badge">${t.typ === 'einnahme' ? EINNAHME_ICON : AUSGABE_ICON}</div>
        <div class="punkt-info"><strong>${esc(t.bezeichnung)}</strong><small>${t.datum}</small></div>
        <strong class="${t.typ === 'einnahme' ? 'betrag-plus' : 'betrag-minus'}">${t.typ === 'einnahme' ? '+' : '-'}${t.betrag.toFixed(2)} €</strong>
      </div>`).join('');
  }

  container.querySelector('#tx-suche').addEventListener('input', (e) => {
    suchtext = e.target.value;
    zeichneListe();
  });
  container.querySelectorAll('[data-k]').forEach((btn) => {
    btn.addEventListener('click', () => {
      kategorie = btn.dataset.k;
      container.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('aktiv', b.dataset.k === kategorie));
      zeichneListe();
    });
  });
  container.querySelector('#tx-csv').addEventListener('click', () => ladeCsv(alleTransaktionen));
  zeichneListe();
}
