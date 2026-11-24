import { ladePaperTrading } from './paper-daten.js';
import {
  PAPER_START, gewinnVerlust, sortierePositionen, positionProzent, formatBetrag, kurvenPunkte, ART_LABEL,
} from './paper-berechnung.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function zeit(iso) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function quellenHtml(text) {
  const teile = String(text || '').split(/\s+/).filter(Boolean);
  return teile.map((t) => (/^https?:\/\//.test(t)
    ? `<a href="${esc(t)}" target="_blank" rel="noopener noreferrer">${esc(new URL(t).hostname.replace(/^www\./, ''))}</a>`
    : esc(t))).join(' · ');
}

export async function zeigePaperTrading(container) {
  container.innerHTML = '<p class="lade">Lade Paper-Trading …</p>';
  let daten;
  try {
    daten = await ladePaperTrading();
  } catch (err) {
    container.innerHTML = `<p class="lade">Konnte Paper-Trading nicht laden: ${esc(err.message)}</p>`;
    return;
  }
  const { snapshots, aktivitaeten } = daten;
  const aktuell = snapshots[0];

  if (!aktuell) {
    container.innerHTML = `
      <div class="stat-karte gross"><small>Paper-Trading</small><span>${formatBetrag(PAPER_START, 0)} $</span>
        <small>Startkapital, nur Spielgeld. Noch keine Handelsrunde protokolliert.</small></div>`;
    return;
  }

  const gv = gewinnVerlust(aktuell.equity);
  const vorzeichen = gv.betrag >= 0 ? '+' : '';
  const positionen = sortierePositionen(aktuell.positionen);
  const orders = Array.isArray(aktuell.offene_orders) ? aktuell.offene_orders : [];
  const kurve = kurvenPunkte(snapshots);

  container.innerHTML = `
    <div class="stat-karte gross">
      <small>Claudes Paper-Depot (Alpaca, nur Spielgeld)</small>
      <span style="font-size:1.8rem;">${formatBetrag(aktuell.equity)} $</span>
      <small>${vorzeichen}${formatBetrag(gv.betrag)} $ (${vorzeichen}${formatBetrag(gv.prozent)} %) seit Start (${formatBetrag(PAPER_START, 0)} $)</small>
      <small>Cash ${formatBetrag(aktuell.cash)} $ · Stand ${zeit(aktuell.erstellt_am)}</small>
      ${kurve ? `<svg viewBox="0 0 300 60" preserveAspectRatio="none" style="width:100%;height:60px;margin-top:8px;" aria-hidden="true"><polyline points="${kurve}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>` : ''}
    </div>
    <div class="section-head"><h2>Positionen (${positionen.length})</h2></div>
    <div class="punkt-liste">
      ${positionen.length === 0 ? '<p class="lade">Keine Positionen, alles in Cash.</p>' : positionen.map((p) => {
    const pr = positionProzent(p);
    return `<div class="punkt-zeile">
          <div class="punkt-info"><strong>${esc(p.symbol)}</strong>
            <small>${esc(p.qty)} Stk. · Einstand ${formatBetrag(p.avg_entry_price)} $ · aktuell ${formatBetrag(p.current_price)} $</small></div>
          <div style="text-align:right;"><strong>${formatBetrag(p.market_value)} $</strong>
            <br><small>${pr >= 0 ? '+' : ''}${formatBetrag(pr)} %</small></div>
        </div>`;
  }).join('')}
    </div>
    ${orders.length ? `<div class="section-head"><h2>Offene Orders (${orders.length})</h2></div>
    <div class="punkt-liste">${orders.map((o) => `<div class="punkt-zeile"><div class="punkt-info">
        <strong>${esc(o.side)} ${esc(o.symbol)}</strong>
        <small>${esc(o.qty)} Stk. · ${esc(o.type)}${o.limit_price ? ` ${formatBetrag(o.limit_price)} $` : ''}${o.stop_price ? ` · Stop ${formatBetrag(o.stop_price)} $` : ''} · ${esc(o.status)}</small></div></div>`).join('')}</div>` : ''}
    <div class="section-head"><h2>Was Claude gemacht hat</h2></div>
    <div class="punkt-liste">
      ${aktivitaeten.length === 0 ? '<p class="lade">Noch keine Aktivitäten.</p>' : aktivitaeten.map((a) => `
        <div class="punkt-zeile" style="align-items:flex-start;">
          <div class="punkt-info">
            <strong>${esc(ART_LABEL[a.art] || a.art)}${a.symbol ? ` · ${esc(a.symbol)}` : ''}: ${esc(a.titel)}</strong>
            ${a.text ? `<small style="display:block;white-space:pre-wrap;">${esc(a.text)}</small>` : ''}
            ${a.quellen ? `<small style="display:block;">Quellen: ${quellenHtml(a.quellen)}</small>` : ''}
          </div>
          <small>${zeit(a.erstellt_am)}</small>
        </div>`).join('')}
    </div>
    <p class="lade" style="margin-top:20px;">Nur Spielgeld, keine Anlageberatung. Daten schreibt Claude nach jeder Handelsrunde.</p>`;
}
