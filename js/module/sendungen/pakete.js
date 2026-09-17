import { legeSendungAn, setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigePakete(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Sendung hinzufügen';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular());
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const s of sortiereSendungen(zustand.sendungen)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small>${s.beschreibung ? esc(s.beschreibung) : ''}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${s.status}">${STATUS_TEXT[s.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=status]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try { await setzeSendungStatus(s.id, naechsterSendungStatus(s.status)); await aktualisieren(); }
      catch (err) { alert(err.message); e.target.disabled = false; }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Sendung von „${s.haendler}" entfernen?`)) return;
      try { await entferneSendung(s.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neue Sendung</h3>
        <label>Händler <input name="haendler" required></label>
        <label>Trackingnummer (optional) <input name="trackingnummer"></label>
        <label>Beschreibung (optional) <input name="beschreibung"></label>
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
      if (!form.haendler.value.trim()) { form.haendler.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeSendungAn({
          haendler: form.haendler.value.trim(),
          trackingnummer: form.trackingnummer.value.trim(),
          beschreibung: form.beschreibung.value.trim(),
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
