import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeNotizen, speichereNotiz, loescheNotiz } from './daten.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

async function zeigeListe(container) {
  container.innerHTML = `
    <div class="modul-kopf"><button id="not-zurueck" type="button">‹ Zurück</button></div>
    <button id="not-neu" type="button" class="knopf-neutral" style="margin-bottom:12px;">Neue Notiz</button>
    <p id="not-status" class="lade" hidden></p>
    <div class="punkt-liste" id="not-liste"></div>`;
  container.querySelector('#not-zurueck').addEventListener('click', () => { history.back(); });
  container.querySelector('#not-neu').addEventListener('click', () => { location.hash = '#/notizen/neu'; });
  const liste = container.querySelector('#not-liste');
  let notizen;
  try { notizen = await ladeNotizen(); }
  catch (e) {
    const status = container.querySelector('#not-status');
    status.hidden = false; status.textContent = e.message;
    return;
  }
  if (notizen.length === 0) liste.innerHTML = '<p class="lade">Noch keine Notizen.</p>';
  for (const n of notizen) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `<div class="punkt-info"><strong>${esc(n.titel || 'Ohne Titel')}</strong>
      <small>${esc(String(n.text).slice(0, 80))}</small></div>`;
    zeile.addEventListener('click', () => { location.hash = `#/notizen/${n.id}`; });
    liste.appendChild(zeile);
  }
}

async function zeigeEditor(container, id) {
  let notiz = { titel: '', text: '' };
  if (id !== 'neu') {
    try { notiz = (await ladeNotizen()).find((n) => n.id === id) ?? notiz; }
    catch (e) { container.textContent = e.message; return; }
  }
  container.innerHTML = `
    <div class="modul-kopf"><button id="not-zurueck" type="button">‹ Notizen</button></div>
    <input id="not-titel" type="text" placeholder="Titel" style="width:100%;margin-bottom:8px;">
    <textarea id="not-text" rows="14" placeholder="Notiz …" style="width:100%;margin-bottom:8px;"></textarea>
    <p id="not-status" class="lade" hidden></p>
    <button id="not-speichern" type="button" class="knopf-neutral">Speichern</button>
    ${id !== 'neu' ? '<button id="not-loeschen" type="button" class="knopf-neutral" style="margin-top:8px;">Löschen</button>' : ''}`;
  const titel = container.querySelector('#not-titel');
  const text = container.querySelector('#not-text');
  titel.value = notiz.titel;
  text.value = notiz.text;
  const status = container.querySelector('#not-status');
  const meldung = (t) => { status.hidden = !t; status.textContent = t ?? ''; };
  container.querySelector('#not-zurueck').addEventListener('click', () => { location.hash = '#/notizen'; });
  container.querySelector('#not-speichern').addEventListener('click', async () => {
    try {
      const neueId = await speichereNotiz({ id: id === 'neu' ? null : id, titel: titel.value.trim(), text: text.value });
      if (id === 'neu') location.hash = `#/notizen/${neueId}`; else meldung('Gespeichert.');
    } catch (e) { meldung(e.message); }
  });
  container.querySelector('#not-loeschen')?.addEventListener('click', async () => {
    if (!confirm('Notiz endgültig löschen?')) return;
    try { await loescheNotiz(id); location.hash = '#/notizen'; }
    catch (e) { meldung(e.message); }
  });
}

let beiHashwechsel = null;

async function rendere(container) {
  const { unterseite } = parseHash(location.hash);
  if (unterseite) await zeigeEditor(container, unterseite);
  else await zeigeListe(container);
}

registriere({
  id: 'notizen',
  titel: 'Notizen',
  async init(container) {
    // init läuft nur beim Modulwechsel; Liste <-> Editor wechselt per Hash
    if (beiHashwechsel) window.removeEventListener('hashchange', beiHashwechsel);
    beiHashwechsel = () => {
      if (!container.isConnected || parseHash(location.hash).modul !== 'notizen') return;
      rendere(container);
    };
    window.addEventListener('hashchange', beiHashwechsel);
    await rendere(container);
  },
});
