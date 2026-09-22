const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeTransaktionDetail(container, transaktion, zurueck) {
  const istEinnahme = transaktion.typ === 'einnahme';
  const titel = istEinnahme ? transaktion.bezeichnung : (transaktion.notiz || transaktion.kategorie);
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="txd-zurueck" type="button">‹ Transaktionen</button>
      <h2>${esc(titel)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${istEinnahme ? EINNAHME_ICON : AUSGABE_ICON}</div>
        <div class="punkt-info"><strong>Betrag</strong><small>${transaktion.datum}</small></div>
        <strong class="${istEinnahme ? 'betrag-plus' : 'betrag-minus'}">${istEinnahme ? '+' : '-'}${transaktion.betrag.toFixed(2)} €</strong></div>
      ${!istEinnahme ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Kategorie</strong>
        <small>${esc(transaktion.kategorie || 'ohne Kategorie')}</small></div></div>` : ''}
      <div class="punkt-zeile"><div class="punkt-info"><strong>Quelle</strong>
        <small>${esc(transaktion.quelle || 'manuell')}</small></div></div>
      ${transaktion.konto_id ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Konto</strong>
        <small>${esc(transaktion.konto_id)}</small></div></div>` : ''}
    </div>`;
  container.querySelector('#txd-zurueck').addEventListener('click', zurueck);
}
