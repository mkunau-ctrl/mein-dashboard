import { registriere } from '../../registry.js';
import { ladeDateien, ladeHoch, holeLink, loesche } from './daten.js';
import { formatiereGroesse, sortiereDateien } from './berechnung.js';

const DATEI_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'dateien',
  titel: 'Dateien',
  async init(container) {
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="dat-zurueck" type="button">‹ Zurück</button>
      </div>
      <label class="knopf-neutral" style="display:block;text-align:center;margin-bottom:12px;cursor:pointer;">
        Datei hochladen
        <input id="dat-auswahl" type="file" multiple hidden>
      </label>
      <p id="dat-status" class="lade" hidden></p>
      <div class="punkt-liste" id="dat-liste"></div>`;
    container.querySelector('#dat-zurueck').addEventListener('click', () => { history.back(); });
    const status = container.querySelector('#dat-status');
    const liste = container.querySelector('#dat-liste');

    const zeigeStatus = (text) => { status.hidden = !text; status.textContent = text ?? ''; };

    const rendere = async () => {
      let dateien;
      try { dateien = sortiereDateien(await ladeDateien()); }
      catch (e) { zeigeStatus(e.message); return; }
      liste.replaceChildren();
      if (dateien.length === 0) {
        liste.innerHTML = '<p class="lade">Noch keine Dateien. Hochladen und auf dem anderen Gerät abrufen.</p>';
        return;
      }
      for (const d of dateien) {
        const zeile = document.createElement('div');
        zeile.className = 'punkt-zeile';
        zeile.innerHTML = `<div class="icon-badge">${DATEI_ICON}</div>
          <div class="punkt-info"><strong>${esc(d.name)}</strong>
          <small>${esc(formatiereGroesse(d.groesse))} · ${esc(d.erstellt_am.slice(0, 16).replace('T', ' '))}</small></div>
          <button type="button" data-aktion="laden" class="knopf-neutral" style="width:auto;">Öffnen</button>
          <button type="button" data-aktion="loeschen" class="knopf-neutral" style="width:auto;">Löschen</button>`;
        zeile.querySelector('[data-aktion="laden"]').addEventListener('click', async () => {
          try { window.open(await holeLink(d.pfad), '_blank'); }
          catch (e) { zeigeStatus(e.message); }
        });
        zeile.querySelector('[data-aktion="loeschen"]').addEventListener('click', async () => {
          if (!confirm(`„${d.name}“ endgültig löschen?`)) return;
          try { await loesche(d); await rendere(); }
          catch (e) { zeigeStatus(e.message); }
        });
        liste.appendChild(zeile);
      }
    };

    container.querySelector('#dat-auswahl').addEventListener('change', async (e) => {
      const dateien = [...e.target.files];
      e.target.value = '';
      for (const [i, d] of dateien.entries()) {
        zeigeStatus(`Lade hoch (${i + 1}/${dateien.length}): ${d.name} …`);
        try { await ladeHoch(d); }
        catch (err) { zeigeStatus(err.message); return; }
      }
      zeigeStatus(null);
      await rendere();
    });

    await rendere();
  },
});
