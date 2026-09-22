import { registriere } from '../../registry.js';
import { ladeAlles, legeRechnungAn, setzeRechnungBezahlt, entferneRechnung } from './daten.js';
import { sortiereRechnungen, summeOffenerRechnungen, istUeberfaellig } from './berechnung.js';

const RECHNUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const FILTER = ['alle', 'offen', 'bezahlt', 'ueberfaellig'];
const FILTER_TEXT = { alle: 'Alle', offen: 'Offen', bezahlt: 'Bezahlt', ueberfaellig: 'Überfällig' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;
let filter = 'offen';

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="haendler" type="text" placeholder="Händler (z. B. E.ON)" required>
    <input name="betrag" type="number" step="0.01" placeholder="Betrag" required>
    <input name="faellig_am" type="date" required>
    <button type="submit">+ Rechnung anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeRechnungAn({
        haendler: daten.get('haendler'),
        betrag: Number(daten.get('betrag')),
        faellig_am: daten.get('faellig_am'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

function zeichneListe(container, aktualisieren) {
  const heuteStr = heute();
  const gefiltert = sortiereRechnungen(zustand.rechnungen, heuteStr).filter((r) => {
    if (filter === 'alle') return true;
    if (filter === 'ueberfaellig') return istUeberfaellig(r, heuteStr);
    return r.status === filter;
  });
  const liste = container.querySelector('#rn-liste');
  liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Rechnungen in dieser Ansicht.</p>' : '';
  for (const r of gefiltert) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    const ueberfaellig = istUeberfaellig(r, heuteStr);
    const statusText = r.status === 'bezahlt' ? 'Bezahlt' : ueberfaellig ? 'Überfällig' : 'Offen';
    const statusKlasse = r.status === 'bezahlt' ? 'status-da' : ueberfaellig ? 'status-fehlt' : 'status-bestellt';
    zeile.innerHTML = `
      <div class="icon-badge">${RECHNUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(r.haendler)}</strong>
        <small>${r.betrag.toFixed(2)} € · fällig ${r.faellig_am}</small>
      </div>
      <span class="status-badge ${statusKlasse}">${statusText}</span>
      <div class="punkt-aktionen">
        ${r.status === 'offen' ? '<button data-a="bezahlt">✓</button>' : ''}
        <button data-a="weg">✕</button>
      </div>`;
    if (r.status === 'offen') {
      zeile.querySelector('[data-a=bezahlt]').addEventListener('click', async () => {
        try { await setzeRechnungBezahlt(r.id); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
    }
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Rechnung „${r.haendler}" entfernen?`)) return;
      try { await entferneRechnung(r.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}

registriere({
  id: 'rechnungen',
  titel: 'Rechnungen',
  async init(container) {
    if (!zustand) await ladeZustand();
    const aktualisieren = async () => { await ladeZustand(); render(); };

    function render() {
      container.innerHTML = `
        <div class="modul-kopf">
          <button id="rn-zurueck" type="button">‹ Zurück</button>
          <h2>Rechnungen</h2>
        </div>
        <div class="stat-karte gross">
          <small>Offene Rechnungen</small>
          <span>${summeOffenerRechnungen(zustand.rechnungen).toFixed(2)} €</span>
        </div>
        <div class="chips">
          ${FILTER.map((f) => `<button type="button" class="chip${f === filter ? ' aktiv' : ''}" data-f="${f}">${FILTER_TEXT[f]}</button>`).join('')}
        </div>
        <div class="punkt-liste" id="rn-liste"></div>`;
      container.querySelector('#rn-zurueck').addEventListener('click', () => { history.back(); });
      baueFormular(container, aktualisieren);
      container.querySelectorAll('[data-f]').forEach((btn) => {
        btn.addEventListener('click', () => {
          filter = btn.dataset.f;
          container.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('aktiv', b.dataset.f === filter));
          zeichneListe(container, aktualisieren);
        });
      });
      zeichneListe(container, aktualisieren);
    }
    render();
  },
});
