import { gruppiereNachWoche, ausbildungsjahr } from './berechnung.js';
import { speichereSettings } from './daten.js';

const ART_TEXT = { betrieb: 'Betrieb', schule: 'Berufsschule', sonstiges: 'Sonstiges' };
const TAG_MS = 86_400_000;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function datumPlus(datumStr, tage) {
  return new Date(Date.parse(datumStr + 'T00:00:00Z') + tage * TAG_MS).toISOString().slice(0, 10);
}

export async function zeigeDrucken(container, zustand, aktualisieren) {
  const gruppen = gruppiereNachWoche(zustand.eintraege);
  const s = zustand.settings;
  const settingsGesetzt = s.name && s.ausbildungsberuf && s.ausbildungsbeginn;

  container.innerHTML = `
    <div class="bh-einstellungen">
      <p class="lade">${settingsGesetzt
        ? `${esc(s.name)} · ${esc(s.ausbildungsberuf)} · Beginn ${s.ausbildungsbeginn}`
        : 'Für den Ausdruck bitte einmal Name, Ausbildungsberuf und Ausbildungsbeginn eintragen.'}</p>
      <button class="listen-neu" id="bh-einstellungen-knopf" type="button">
        ${settingsGesetzt ? 'Kopfdaten ändern' : 'Kopfdaten eintragen'}</button>
    </div>`;

  if (gruppen.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Einträge zum Drucken.';
    container.appendChild(p);
  } else {
    const nav = document.createElement('div');
    nav.className = 'hm-kopf';
    nav.innerHTML = `<button id="bh-zurueck" type="button">‹ ältere Woche</button>
      <span id="bh-titel"></span>
      <button id="bh-vor" type="button">neuere Woche ›</button>`;
    container.appendChild(nav);

    const druckKnopf = document.createElement('button');
    druckKnopf.className = 'listen-neu';
    druckKnopf.textContent = '🖶 Diese Woche drucken / als PDF speichern';
    druckKnopf.addEventListener('click', () => window.print());
    container.appendChild(druckKnopf);

    const ansicht = document.createElement('div');
    ansicht.className = 'druck-ansicht';
    container.appendChild(ansicht);

    let index = 0;

    function zeichne() {
      const woche = gruppen[index];
      const ende = datumPlus(woche.start, 6);
      container.querySelector('#bh-titel').textContent = `${woche.start} – ${ende}`;
      container.querySelector('#bh-zurueck').disabled = index >= gruppen.length - 1;
      container.querySelector('#bh-vor').disabled = index <= 0;

      const jahr = settingsGesetzt ? ausbildungsjahr(s.ausbildungsbeginn, woche.start) : '?';
      ansicht.innerHTML = `
        <h2>Ausbildungsnachweis</h2>
        <p><strong>Name:</strong> ${settingsGesetzt ? esc(s.name) : '—'} ·
           <strong>Ausbildungsberuf:</strong> ${settingsGesetzt ? esc(s.ausbildungsberuf) : '—'} ·
           <strong>Ausbildungsjahr:</strong> ${jahr}</p>
        <p><strong>Zeitraum:</strong> ${woche.start} – ${ende}</p>
        <table class="bh-tabelle">
          <thead><tr><th>Datum</th><th>Art</th><th>Tätigkeiten / Themen</th><th>Std.</th></tr></thead>
          <tbody>
            ${woche.eintraege.map((e) => `<tr>
              <td>${e.datum}</td><td>${ART_TEXT[e.art]}</td>
              <td>${esc(e.taetigkeiten)}</td><td>${e.stunden}</td></tr>`).join('')}
          </tbody>
          <tfoot><tr><td colspan="3">Summe</td>
            <td>${woche.eintraege.reduce((sum, e) => sum + e.stunden, 0)}</td></tr></tfoot>
        </table>
        <div class="bh-unterschriften">
          <div>Datum, Unterschrift Auszubildende(r)</div>
          <div>Datum, Unterschrift Ausbilder(in)</div>
        </div>`;
    }
    container.querySelector('#bh-zurueck').addEventListener('click', () => {
      if (index < gruppen.length - 1) { index += 1; zeichne(); }
    });
    container.querySelector('#bh-vor').addEventListener('click', () => {
      if (index > 0) { index -= 1; zeichne(); }
    });
    zeichne();
  }

  container.querySelector('#bh-einstellungen-knopf').addEventListener('click', () => {
    oeffneEinstellungen();
  });

  function oeffneEinstellungen() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Kopfdaten</h3>
        <label>Name <input name="name" required value="${esc(s.name ?? '')}"></label>
        <label>Ausbildungsberuf <input name="ausbildungsberuf" required
          value="${esc(s.ausbildungsberuf ?? '')}"></label>
        <label>Ausbildungsbeginn <input name="ausbildungsbeginn" type="date" required
          value="${s.ausbildungsbeginn ?? ''}"></label>
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
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await speichereSettings({
          name: form.name.value.trim(),
          ausbildungsberuf: form.ausbildungsberuf.value.trim(),
          ausbildungsbeginn: form.ausbildungsbeginn.value,
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
