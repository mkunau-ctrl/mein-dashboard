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
      <div class="punkt-info">
        <span>${esc(t.text)}</span>
        <small>erledigt am ${t.erledigt_am.slice(0, 10)}</small>
      </div>`;
    liste.appendChild(zeile);
  }
}
