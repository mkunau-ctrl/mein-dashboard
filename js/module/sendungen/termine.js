import { hakeTerminAb, entferneTermin } from './daten.js';
import { sortiereTermine } from './berechnung.js';

const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const termin = zustand.termine.find((t) => t.id === detail);
    if (termin) {
      const { zeigeTerminDetail } = await import('./termin-detail.js');
      zeigeTerminDetail(container, termin, () => { location.hash = '#/sendungen/termine'; });
      return;
    }
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTermine(zustand.termine)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${KALENDER_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.titel)}</strong>
        <small>fällig am ${t.faellig_am}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="ab">✓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/sendungen/termine/${t.id}`; });
    zeile.querySelector('[data-a=ab]').addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await hakeTerminAb(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Termin „${t.titel}" entfernen?`)) return;
      try { await entferneTermin(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
