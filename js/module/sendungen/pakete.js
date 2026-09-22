import { setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus, kategorisiereSendungIcon } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
const STATUS_PUNKT_FARBE = { unterwegs: 'akzent', abholbereit: 'gelb', zugestellt: 'gruen', unbekannt: 'grau' };
const ICON = {
  handy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  kopfhoerer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="2" y="14" width="5" height="7" rx="1.5"/><rect x="17" y="14" width="5" height="7" rx="1.5"/></svg>',
  kleidung: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7l4-4Z"/></svg>',
  elektronik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
};

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
      <div class="icon-badge">${ICON[kategorisiereSendungIcon(`${s.haendler} ${s.beschreibung || ''}`)]}</div>
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small><span class="dot ${STATUS_PUNKT_FARBE[s.status]}"></span> ${STATUS_TEXT[s.status]}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="status" title="Status weiterschalten">${STATUS_TEXT[s.status] === 'zugestellt' ? '' : '›'}</button>
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
