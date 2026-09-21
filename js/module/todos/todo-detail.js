const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function zeigeTodoDetail(container, todo, zurueck) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="tdd-zurueck" type="button">‹ To-dos</button>
      <h2>${esc(todo.text)}</h2>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge">${TODO_ICON}</div>
        <div class="punkt-info"><strong>Fällig</strong><small>${todo.faellig || 'kein Datum'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Wiederkehr</strong>
        <small>${todo.vorlage_id ? 'wiederkehrend' : 'einmalig'}</small></div></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Status</strong>
        <small>${todo.erledigt ? `erledigt am ${(todo.erledigt_am || '').slice(0, 10)}` : 'offen'}</small></div></div>
    </div>`;
  container.querySelector('#tdd-zurueck').addEventListener('click', zurueck);
}
