const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeSendungDetail(container, sendung, ereignisse, zurueck) {
  const eigene = ereignisse.filter((e) => e.sendung_id === sendung.id)
    .sort((a, b) => (a.erstellt_am < b.erstellt_am ? -1 : 1));
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="sd-zurueck" type="button">‹ Sendungen</button>
      <h2>${esc(sendung.haendler)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${BOX_ICON}</div>
        <div class="punkt-info"><strong>${esc(sendung.beschreibung || sendung.haendler)}</strong>
        <small>${sendung.trackingnummer ? esc(sendung.trackingnummer) : 'keine Trackingnummer'}</small></div>
        <span class="status-badge status-${sendung.status}">${esc(sendung.status)}</span></div>
      ${sendung.abholcode ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholcode</strong><small>${esc(sendung.abholcode)}</small></div></div>` : ''}
      ${sendung.abholadresse ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholadresse</strong><small>${esc(sendung.abholadresse)}</small></div></div>` : ''}
      ${sendung.abholzeiten ? `<div class="punkt-zeile"><div class="punkt-info"><strong>Abholzeiten</strong><small>${esc(sendung.abholzeiten)}</small></div></div>` : ''}
    </div>
    <div class="section-head"><h2>Verlauf</h2></div>
    <div class="punkt-liste">
      ${eigene.length === 0 ? '<p class="lade">Noch keine Status-Ereignisse erfasst.</p>' : eigene.map((e) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><strong>${esc(e.beschreibung)}</strong>
          <small>${e.erstellt_am.slice(0, 16).replace('T', ' ')}${e.ort ? ` · ${esc(e.ort)}` : ''}</small></div>
        </div>`).join('')}
    </div>`;
  container.querySelector('#sd-zurueck').addEventListener('click', zurueck);
}
