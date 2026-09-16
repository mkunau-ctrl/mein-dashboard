import { legeAusgabeAn, entferneAusgabe } from './daten.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeAusgaben(container, zustand, aktualisieren) {
  const neu = document.createElement('button');
  neu.textContent = '+ Neue Ausgabe';
  neu.className = 'listen-neu';
  neu.addEventListener('click', oeffneFormular);
  container.appendChild(neu);

  if (zustand.expenses.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Ausgaben eingetragen.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const e of zustand.expenses) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${e.betrag.toFixed(2)} €${e.notiz ? ` – ${esc(e.notiz)}` : ''}</strong>
        <small>${e.datum} · ${esc(e.kategorie)}</small>
      </div>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm('Ausgabe entfernen?')) return;
      try { await entferneAusgabe(e.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }

  function oeffneFormular() {
    const bekannteKategorien = [...new Set(zustand.expenses.map((e) => e.kategorie))];
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neue Ausgabe</h3>
        <label>Betrag (€) <input name="betrag" type="number" step="0.01" min="0" required></label>
        <label>Kategorie
          <input name="kategorie" list="kategorien" placeholder="z. B. Tanken">
          <datalist id="kategorien">
            ${bekannteKategorien.map((k) => `<option value="${esc(k)}">`).join('')}
          </datalist>
        </label>
        <label>Notiz (optional) <input name="notiz"></label>
        <label>Datum <input name="datum" type="date" value="${heute()}"></label>
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
      const betrag = +form.betrag.value;
      if (!(betrag > 0)) { form.betrag.focus(); return; }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeAusgabeAn({
          betrag, kategorie: form.kategorie.value.trim(),
          notiz: form.notiz.value.trim(), datum: form.datum.value,
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
