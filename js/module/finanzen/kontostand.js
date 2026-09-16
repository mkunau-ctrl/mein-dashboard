import { kontostand } from './berechnung.js';
import { setzeKontostandStart } from './daten.js';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeKontostand(container, zustand, aktualisieren) {
  const gesetzt = zustand.settings.kontostand_start !== undefined;

  if (gesetzt) {
    const stand = kontostand(zustand.settings, zustand.expenses, heute());
    const box = document.createElement('div');
    box.className = 'stat-karte';
    box.innerHTML = `<span>${stand.toFixed(2)} €</span><small>aktueller Kontostand</small>`;
    container.appendChild(box);
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = `Ausgangswert ${zustand.settings.kontostand_start.toFixed(2)} € `
      + `am ${zustand.settings.stand_datum}, seither alle Ausgaben abgezogen.`;
    container.appendChild(hinweis);
  } else {
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = 'Noch kein Kontostand gesetzt.';
    container.appendChild(hinweis);
  }

  const knopf = document.createElement('button');
  knopf.className = 'listen-neu';
  knopf.textContent = gesetzt ? 'Kontostand neu setzen' : 'Kontostand setzen';
  knopf.addEventListener('click', oeffneFormular);
  container.appendChild(knopf);

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Kontostand setzen</h3>
        <label>Aktueller Kontostand (€)
          <input name="betrag" type="number" step="0.01" required
            value="${gesetzt ? zustand.settings.kontostand_start : ''}"></label>
        <label>Zum Datum <input name="datum" type="date" value="${heute()}"></label>
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
      const knopfSp = form.querySelector('[data-a=speichern]');
      knopfSp.disabled = true;
      try {
        await setzeKontostandStart(+form.betrag.value, form.datum.value);
        schliesse();
        await aktualisieren();
      } catch (err) {
        fehlerEl.textContent = err.message;
        fehlerEl.hidden = false;
        knopfSp.disabled = false;
      }
    });
    dlg.showModal();
  }
}
