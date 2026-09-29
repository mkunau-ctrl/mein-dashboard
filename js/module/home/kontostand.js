import { gesamtKontostand, kontostandProKonto, kontostandVerlauf, warenwert } from '../finanzen/berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0112 5c7 0 11 7 11 7a17.6 17.6 0 01-3.2 4M6.5 6.5C3.6 8.3 1 12 1 12s4 7 11 7c1.4 0 2.7-.2 3.9-.6"/><path d="M9.9 9.9A3 3 0 0014 14"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function sparklinePunkte(verlauf) {
  if (verlauf.length < 2) return '';
  const werte = verlauf.map((v) => v.stand);
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  const breite = 280;
  const hoehe = 60;
  return verlauf.map((v, i) => {
    const x = (i / (verlauf.length - 1)) * breite;
    const y = hoehe - ((v.stand - min) / spanne) * hoehe;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function transaktionenVonKonto(konto, finanzen) {
  return [
    ...finanzen.expenses.filter((e) => e.konto_id === konto.id)
      .map((e) => ({ datum: e.datum, text: e.notiz || e.kategorie, betrag: e.betrag, typ: 'ausgabe' })),
    ...finanzen.einnahmen.filter((e) => e.konto_id === konto.id)
      .map((e) => ({ datum: e.datum, text: e.bezeichnung, betrag: e.betrag, typ: 'einnahme' })),
  ].sort((a, b) => (a.datum < b.datum ? 1 : -1));
}

let ausgeblendet = false;
const offeneKonten = new Set();

export async function zeigeKontostandDetail(container, zustand) {
  const { finanzen } = zustand;
  const heuteStr = heute();
  const stand = gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heuteStr);
  const wert = warenwert(finanzen.teile, zustand.handyreparatur.auftraege);
  const unecht = stand + wert;
  const verlauf = kontostandVerlauf(finanzen.konten, finanzen.expenses, finanzen.einnahmen, 30, heuteStr);
  const kontenMitStand = finanzen.konten
    .map((k) => ({ konto: k, stand: kontostandProKonto(k, finanzen.expenses, finanzen.einnahmen, heuteStr) }))
    .sort((a, b) => b.stand - a.stand);

  function kontoHtml({ konto, stand: kStand }) {
    const offen = offeneKonten.has(konto.id);
    const trans = offen ? transaktionenVonKonto(konto, finanzen) : [];
    return `
      <div class="punkt-zeile" data-konto="${esc(konto.id)}" style="cursor:pointer;">
        <div class="icon-badge">${WALLET_ICON}</div>
        <div class="punkt-info">
          <strong>${esc(konto.name)}</strong>
          <small>Stand seit ${konto.stand_datum}: ${konto.kontostand_start.toFixed(2)} €</small>
        </div>
        <strong>${ausgeblendet ? '••••,•• €' : kStand.toFixed(2) + ' €'}</strong>
      </div>
      ${offen ? (trans.length === 0
        ? '<p class="lade">Noch keine Buchungen auf diesem Konto.</p>'
        : trans.map((t) => `
          <div class="punkt-zeile">
            <div class="punkt-info"><small>${t.datum} · ${esc(t.text)}</small></div>
            <strong class="${t.typ === 'einnahme' ? 'betrag-plus' : 'betrag-minus'}">${t.typ === 'einnahme' ? '+' : '-'}${t.betrag.toFixed(2)} €</strong>
          </div>`).join('')) : ''}`;
  }

  function zeichne() {
    const anzeige = ausgeblendet ? '••••••,•• €' : `${stand.toFixed(2)} €`;
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="kd-zurueck" type="button">‹ Home</button>
        <h2>Kontostand</h2>
      </div>
      <div class="stat-karte gross">
        <div class="stat-kopf">
          <small>Kontostand</small>
          <button id="kd-auge" type="button" style="background:none;border:none;padding:0;color:var(--gedaempft);">${ausgeblendet ? EYE_OFF_ICON : EYE_ICON}</button>
        </div>
        <span>${anzeige}</span>
        <svg width="280" height="60" viewBox="0 0 280 60" style="margin-top:8px;">
          <polyline points="${sparklinePunkte(verlauf)}" fill="none" stroke="var(--gedaempft)" stroke-width="2"/>
        </svg>
        <small>${unecht.toFixed(2)} € inkl. Warenwert</small>
        <small id="kd-warenwert" style="cursor:pointer;">Warenwert: ${wert.toFixed(2)} € ›</small>
      </div>
      <div class="section-head"><h2>Auf welchem Konto?</h2></div>
      <div class="punkt-liste">
        ${kontenMitStand.length === 0 ? '<p class="lade">Noch kein Konto angelegt.</p>' : kontenMitStand.map(kontoHtml).join('')}
      </div>`;
    container.querySelector('#kd-zurueck').addEventListener('click', () => { location.hash = '#/home'; });
    container.querySelector('#kd-auge').addEventListener('click', () => { ausgeblendet = !ausgeblendet; zeichne(); });
    container.querySelector('#kd-warenwert').addEventListener('click', () => { location.hash = '#/home/warenwert'; });
    container.querySelectorAll('[data-konto]').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.konto;
        if (offeneKonten.has(id)) offeneKonten.delete(id); else offeneKonten.add(id);
        zeichne();
      });
    });
  }
  zeichne();
}
