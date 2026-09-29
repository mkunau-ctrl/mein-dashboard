import { setzeStatus } from './daten.js';
import { merkliste, naechsterStatus, angekommeneTeile } from './berechnung.js';
import { ladeZugestellteSendungen } from '../sendungen/daten.js';

const STATUS_TEXT = { fehlt: 'fehlt', bestellt: 'bestellt', da: 'da' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function zeigeAngekommen(container, zustand, aktualisieren) {
  let treffer = [];
  try { treffer = angekommeneTeile(zustand.teile, await ladeZugestellteSendungen()); }
  catch { return; }
  if (treffer.length === 0 || !container.isConnected) return;
  const box = document.createElement('div');
  box.className = 'punkt-liste';
  box.innerHTML = '<p class="lade">Wahrscheinlich angekommen:</p>';
  for (const { teil, sendung } of treffer) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(teil.bezeichnung)}</strong>
        <small>Sendung „${esc(sendung.haendler)}" ist zugestellt</small>
      </div>
      <button data-a="da" class="status-badge status-da">als „da" markieren</button>`;
    zeile.querySelector('[data-a=da]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(teil.id, 'da'); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    box.appendChild(zeile);
  }
  container.prepend(box);
}

export async function zeigeBestellen(container, zustand, aktualisieren) {
  zeigeAngekommen(container, zustand, aktualisieren);
  const liste = merkliste(zustand.teile);

  if (liste.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Nichts zu bestellen – alles da.';
    container.appendChild(p);
    return;
  }

  const box = document.createElement('div');
  box.className = 'punkt-liste';
  container.appendChild(box);

  for (const t of liste) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.bezeichnung)}</strong>
        <small>${t.soll_bestand != null ? `Bestand ${t.bestand} / Soll ${t.soll_bestand}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${t.status}">${STATUS_TEXT[t.status]} →</button>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(t.id, naechsterStatus(t.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    box.appendChild(zeile);
  }
}
