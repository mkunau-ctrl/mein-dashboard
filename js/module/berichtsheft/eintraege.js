import { entferneEintrag } from './daten.js';

const ART_TEXT = { betrieb: 'Betrieb', schule: 'Berufsschule', sonstiges: 'Sonstiges' };
const BETRIEB_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M2 13h20"/></svg>';
const SCHULE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5-10-5Z"/><path d="M6 11v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5"/></svg>';
const SONSTIGES_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
const ART_ICON = { betrieb: BETRIEB_ICON, schule: SCHULE_ICON, sonstiges: SONSTIGES_ICON };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeEintraege(container, zustand, aktualisieren) {
  if (zustand.eintraege.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Einträge.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const e of zustand.eintraege) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${ART_ICON[e.art]}</div>
      <div class="punkt-info">
        <strong>${e.datum} · ${ART_TEXT[e.art]} · ${e.stunden} Std.</strong>
        <small>${esc(e.taetigkeiten)}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Eintrag vom ${e.datum} entfernen?`)) return;
      try { await entferneEintrag(e.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
