const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeTerminDetail(container, termin, zurueck) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="td-zurueck" type="button">‹ Termine</button>
      <h2>${esc(termin.titel)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${KALENDER_ICON}</div>
        <div class="punkt-info"><strong>Fällig am</strong><small>${termin.faellig_am}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Quelle</strong>
        <small>${termin.quelle === 'email' ? 'E-Mail-Automatisierung' : 'manuell'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Status</strong>
        <small>${termin.erledigt ? 'erledigt' : 'offen'}</small></div></div>
    </div>`;
  container.querySelector('#td-zurueck').addEventListener('click', zurueck);
}
