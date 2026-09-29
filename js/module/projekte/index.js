import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { zuHtml } from './markdown.js';

const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'projekte',
  titel: 'Projekte',
  async init(container) {
    const { projekte } = await ladeAlles();
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="proj-zurueck" type="button">‹ Zurück</button>
      </div>
      <div class="punkt-liste" id="proj-liste">
        ${projekte.length === 0 ? '<p class="lade">Noch keine Projekte synchronisiert.</p>' : ''}
      </div>
      <div id="proj-detail" hidden></div>`;
    container.querySelector('#proj-zurueck').addEventListener('click', () => { history.back(); });

    const liste = container.querySelector('#proj-liste');
    const detail = container.querySelector('#proj-detail');
    for (const p of projekte) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="icon-badge">${FOLDER_ICON}</div>
        <div class="punkt-info"><strong>${esc(p.name)}</strong>
        <small>zuletzt synchronisiert: ${esc(p.sync_zeitstempel.slice(0, 16).replace('T', ' '))}</small></div>`;
      zeile.addEventListener('click', () => {
        liste.hidden = true;
        detail.hidden = false;
        detail.innerHTML = `<button id="proj-detail-zurueck" type="button" style="margin-bottom:12px;">‹ Alle Projekte</button>
          <div class="punkt-liste" style="padding:14px;">${zuHtml(p.inhalt)}</div>`;
        detail.querySelector('#proj-detail-zurueck').addEventListener('click', () => {
          detail.hidden = true;
          liste.hidden = false;
        });
      });
      liste.appendChild(zeile);
    }
  },
});
