import { entferneAusgabe } from './daten.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z"/><path d="M9 8h6M9 12h6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeAusgaben(container, zustand, aktualisieren) {
  if (zustand.expenses.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Ausgaben eingetragen.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const e of zustand.expenses) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${AUSGABE_ICON}</div>
      <div class="punkt-info">
        <strong>${e.notiz ? esc(e.notiz) : esc(e.kategorie)}</strong>
        <small>${e.datum}${e.notiz ? ` · ${esc(e.kategorie)}` : ''}${e.quelle !== 'manuell' ? ` · aus ${e.quelle === 'email' ? 'E-Mail' : 'Foto'}` : ''}</small>
      </div>
      <strong class="betrag-minus">-${e.betrag.toFixed(2)} €</strong>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm('Ausgabe entfernen?')) return;
      try { await entferneAusgabe(e.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
