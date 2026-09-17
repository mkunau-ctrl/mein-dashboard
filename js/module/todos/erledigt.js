const ERLEDIGT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeErledigt(container, zustand) {
  if (zustand.erledigt.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch nichts erledigt (letzte 60 Tage).';
    container.appendChild(p);
    return;
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of zustand.erledigt) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${ERLEDIGT_ICON}</div>
      <div class="punkt-info">
        <span>${esc(t.text)}</span>
        <small>erledigt am ${t.erledigt_am.slice(0, 10)}</small>
      </div>`;
    liste.appendChild(zeile);
  }
}
