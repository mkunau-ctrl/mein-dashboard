import { setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigePakete(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const sendung = zustand.sendungen.find((s) => s.id === detail);
    if (sendung) {
      const { zeigeSendungDetail } = await import('./sendung-detail.js');
      zeigeSendungDetail(container, sendung, zustand.ereignisse, () => { location.hash = '#/sendungen/pakete'; });
      return;
    }
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const s of sortiereSendungen(zustand.sendungen)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small>${s.beschreibung ? esc(s.beschreibung) : ''}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${s.status}">${STATUS_TEXT[s.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/sendungen/pakete/${s.id}`; });
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.stopPropagation();
      e.target.disabled = true;
      try { await setzeSendungStatus(s.id, naechsterSendungStatus(s.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Sendung von „${s.haendler}" entfernen?`)) return;
      try { await entferneSendung(s.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
