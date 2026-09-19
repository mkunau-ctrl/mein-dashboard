import { entferneTeil, setzeStatus } from './daten.js';
import { warenwert, sortiereTeile, naechsterStatus } from './berechnung.js';

const STATUS_TEXT = { fehlt: 'fehlt', bestellt: 'bestellt', da: 'da' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTeile(container, zustand, aktualisieren) {
  const wert = document.createElement('div');
  wert.className = 'stat-karte gross';
  wert.innerHTML = `
    <div class="stat-kopf">
      <div class="icon-badge">${BOX_ICON}</div>
      <small>Warenwert</small>
    </div>
    <span>${warenwert(zustand.teile).toFixed(2)} €</span>`;
  container.appendChild(wert);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTeile(zustand.teile)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.bezeichnung)}</strong>
        <small>Bestand ${t.bestand}${t.soll_bestand != null ? ` / Soll ${t.soll_bestand}` : ''}
          ${t.einzelwert != null ? ` · ${t.einzelwert.toFixed(2)} € /Stk` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${t.status}">${STATUS_TEXT[t.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(t.id, naechsterStatus(t.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${t.bezeichnung}" entfernen?`)) return;
      try { await entferneTeil(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
