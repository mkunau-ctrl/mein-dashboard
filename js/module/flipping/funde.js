import { setzeFundStatus, entferneFund } from './daten.js';
import { sortiereFunde, naechsterFundStatus, sicherHttp } from './berechnung.js';

const STATUS_TEXT = { neu: 'neu', angeschrieben: 'angeschrieben', gekauft: 'gekauft', verworfen: 'verworfen' };
const STATUS_KLASSE = { neu: 'status-fehlt', angeschrieben: 'status-bestellt', gekauft: 'status-da', verworfen: 'status-da' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeFunde(container, zustand, aktualisieren) {
  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);
  if (zustand.funde.length === 0) {
    liste.innerHTML = '<p class="lade">Noch keine Funde. Claude trägt hier geprüfte Angebote mit guter Verkäufer-Bewertung ein.</p>';
    return;
  }
  for (const f of sortiereFunde(zustand.funde)) {
    const preis = f.preis != null ? `${Number(f.preis).toFixed(2)} €${f.preis_vb ? ' VB' : ''}` : 'ohne Preis';
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(f.titel)}</strong>
        <small>${preis}${f.ort ? ` · ${esc(f.ort)}` : ''}${f.bewertung ? ` · ${esc(f.bewertung)}` : ''}</small>
        <small>${esc(f.zusammenfassung)}</small>
        <small><a href="${esc(sicherHttp(f.url))}" target="_blank" rel="noopener noreferrer">Anzeige öffnen</a></small>
      </div>
      <button data-a="status" class="status-badge ${STATUS_KLASSE[f.status]}">${STATUS_TEXT[f.status]}</button>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeFundStatus(f.id, naechsterFundStatus(f.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${f.titel}" entfernen?`)) return;
      try { await entferneFund(f.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
