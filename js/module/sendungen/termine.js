import { legeTerminAn, hakeTerminAb, entferneTermin } from './daten.js';
import { sortiereTermine } from './berechnung.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Termin hinzufügen';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular());
  container.appendChild(neu);

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

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neuer Termin</h3>
        <label>Titel <input name="titel" required></label>
        <label>Fällig am <input name="faellig_am" type="date" required></label>
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
      if (!form.titel.value.trim() || !form.faellig_am.value) return;
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeTerminAn({ titel: form.titel.value.trim(), faellig_am: form.faellig_am.value });
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
