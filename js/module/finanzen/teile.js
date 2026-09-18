import { speicherTeil, entferneTeil, setzeStatus } from './daten.js';
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

  const neu = document.createElement('button');
  neu.textContent = '+ Neues Teil';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular(null));
  container.appendChild(neu);

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
        <button data-a="bearbeiten">✎</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeStatus(t.id, naechsterStatus(t.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=bearbeiten]')
      .addEventListener('click', () => oeffneFormular(t));
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${t.bezeichnung}" entfernen?`)) return;
      try { await entferneTeil(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular(t) {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>${t ? 'Teil bearbeiten' : 'Neues Teil'}</h3>
        <label>Bezeichnung <input name="bezeichnung" required value="${esc(t?.bezeichnung ?? '')}"></label>
        <label>Bestand <input name="bestand" type="number" step="1" value="${t?.bestand ?? 0}"></label>
        <label>Soll-Bestand (optional) <input name="soll_bestand" type="number" step="1"
          value="${t?.soll_bestand ?? ''}"></label>
        <label>Einzelwert € (optional) <input name="einzelwert" type="number" step="0.01"
          value="${t?.einzelwert ?? ''}"></label>
        <label>Status
          <select name="status">
            <option value="fehlt" ${(!t || t.status === 'fehlt') ? 'selected' : ''}>fehlt</option>
            <option value="bestellt" ${t?.status === 'bestellt' ? 'selected' : ''}>bestellt</option>
            <option value="da" ${t?.status === 'da' ? 'selected' : ''}>da</option>
          </select>
        </label>
        <p class="dialog-fehler" role="alert" hidden></p>
        <menu>
          <button type="button" data-a="abbrechen">Abbrechen</button>
          <button type="submit" data-a="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);

    const form = dlg.querySelector('form');
    const fehlerEl = dlg.querySelector('.dialog-fehler');
    const schliesse = () => { dlg.close(); dlg.remove(); };
    dlg.querySelector('[data-a=abbrechen]').addEventListener('click', schliesse);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.bezeichnung.value.trim()) { form.bezeichnung.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await speicherTeil({
          id: t?.id,
          bezeichnung: form.bezeichnung.value.trim(),
          bestand: +form.bestand.value,
          soll_bestand: form.soll_bestand.value ? +form.soll_bestand.value : null,
          einzelwert: form.einzelwert.value ? +form.einzelwert.value : null,
          status: form.status.value,
        });
        schliesse();
        await aktualisieren();
      } catch (err) {
        fehlerEl.textContent = err.message;
        fehlerEl.hidden = false;
        knopf.disabled = false;
      }
    });
    dlg.showModal();
  }
}
