import { hakeTerminAb, entferneTermin } from './daten.js';
import { sortiereTermine } from './berechnung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren) {
  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTermine(zustand.termine)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(t.titel)}</strong>
        <small>fällig am ${t.faellig_am}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="ab">✓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=ab]').addEventListener('click', async () => {
      try { await hakeTerminAb(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Termin „${t.titel}" entfernen?`)) return;
      try { await entferneTermin(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
