import { setzeFundStatus, entferneFund } from './daten.js';
import { sortiereFunde, naechsterFundStatus, sicherHttp } from './berechnung.js';

const STATUS_TEXT = { neu: 'neu', angeschrieben: 'angeschrieben', gekauft: 'gekauft', verworfen: 'verworfen' };
const STATUS_KLASSE = { neu: 'status-fehlt', angeschrieben: 'status-bestellt', gekauft: 'status-da', verworfen: 'status-da' };

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeFunde(container, zustand, aktualisieren) {
  if (zustand.funde.length === 0) {
    container.innerHTML = '<p class="lade">Noch keine Funde. Claude trägt hier geprüfte Angebote ein.</p>';
    return;
  }
  for (const [kat, titel] of [['heil', 'Heile iPhones (weit unter Marktwert)'], ['defekt', 'Defekte iPhones']]) {
    const funde = sortiereFunde(zustand.funde.filter((f) => (f.kategorie || 'heil') === kat));
    const h = document.createElement('h3');
    h.textContent = `${titel} (${funde.length})`;
    container.appendChild(h);
    const liste = document.createElement('div');
    liste.className = 'punkt-liste';
    container.appendChild(liste);
    if (funde.length === 0) liste.innerHTML = '<p class="lade">Noch nichts.</p>';
    zeichne(liste, funde, aktualisieren);
  }
}

function zeichne(liste, funde, aktualisieren) {
  for (const f of funde) {
    const preis = f.preis != null ? `${Number(f.preis).toFixed(2)} €${f.preis_vb ? ' VB' : ''}` : 'ohne Preis';
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong><a href="${esc(sicherHttp(f.url))}" target="_blank" rel="noopener noreferrer" class="fund-link">${esc(f.titel)} ↗</a></strong>
        <small>${preis}${f.ort ? ` · ${esc(f.ort)}` : ''}${f.bewertung ? ` · ${esc(f.bewertung)}` : ''}</small>
        ${f.marktwert != null && f.preis != null ? `<small>Marktwert ca. ${Number(f.marktwert).toFixed(0)} € · Marge ca. ${(f.marktwert - f.preis).toFixed(0)} €</small>` : ''}
        ${f.zustand ? `<small>Zustand: ${esc(f.zustand)}</small>` : ''}
        <small>${esc(f.zusammenfassung)}</small>
        <a href="${esc(sicherHttp(f.url))}" target="_blank" rel="noopener noreferrer" class="fund-oeffnen">Anzeige auf Kleinanzeigen öffnen ↗</a>
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
