import { speichereEintrag, entferneEintrag } from './daten.js';

const ART_TEXT = { betrieb: 'Betrieb', schule: 'Berufsschule', sonstiges: 'Sonstiges' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeEintraege(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Neuer Eintrag';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular(null));
  container.appendChild(neu);

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
      <div class="punkt-info">
        <strong>${e.datum} · ${ART_TEXT[e.art]} · ${e.stunden} Std.</strong>
        <small>${esc(e.taetigkeiten)}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="bearbeiten">✎</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=bearbeiten]')
      .addEventListener('click', () => oeffneFormular(e));
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Eintrag vom ${e.datum} entfernen?`)) return;
      try { await entferneEintrag(e.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular(e) {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>${e ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}</h3>
        <label>Datum <input name="datum" type="date" required value="${e?.datum ?? heute()}"></label>
        <label>Art
          <select name="art">
            <option value="betrieb" ${(!e || e.art === 'betrieb') ? 'selected' : ''}>Betrieb</option>
            <option value="schule" ${e?.art === 'schule' ? 'selected' : ''}>Berufsschule</option>
            <option value="sonstiges" ${e?.art === 'sonstiges' ? 'selected' : ''}>Sonstiges (Urlaub/Krank)</option>
          </select>
        </label>
        <label>Tätigkeiten / Themen
          <textarea name="taetigkeiten" required rows="4">${esc(e?.taetigkeiten ?? '')}</textarea></label>
        <label>Stunden <input name="stunden" type="number" step="0.5" min="0" required
          value="${e?.stunden ?? 8}"></label>
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

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!form.taetigkeiten.value.trim()) { form.taetigkeiten.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await speichereEintrag({
          id: e?.id, datum: form.datum.value, art: form.art.value,
          taetigkeiten: form.taetigkeiten.value.trim(), stunden: +form.stunden.value,
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
