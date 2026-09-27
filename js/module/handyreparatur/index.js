import { registriere } from '../../registry.js';
import { ladeAlles, legeAuftragAn, setzeAuftragStatus, entferneAuftrag } from './daten.js';
import { naechsterAuftragStatus, erwarteterGewinn, sortiereAuftraege } from './berechnung.js';

const HANDY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>';
const FILTER = ['alle', 'offen', 'fertig', 'verkauft'];
const FILTER_TEXT = { alle: 'Alle', offen: 'Offen', fertig: 'Fertig', verkauft: 'Verkauft' };
const STATUS_TEXT = { offen: 'Offen', fertig: 'Fertig', verkauft: 'Verkauft' };
const STATUS_KLASSE = { offen: 'status-fehlt', fertig: 'status-bestellt', verkauft: 'status-da' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let zustand = null;
let filter = 'alle';

async function ladeZustand() {
  zustand = await ladeAlles();
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="geraet" type="text" placeholder="Gerät (z. B. iPhone 14 Pro)" required>
    <input name="warenwert" type="number" step="0.01" placeholder="Warenwert (€)" required>
    <input name="voraussichtlich" type="number" step="0.01" placeholder="Voraussichtlicher Verkaufspreis (€, optional)">
    <input name="notiz" type="text" placeholder="Notiz (optional)">
    <button type="submit">+ Auftrag anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeAuftragAn({
        geraet: daten.get('geraet'),
        warenwert: Number(daten.get('warenwert')),
        voraussichtlicher_verkaufspreis: daten.get('voraussichtlich') ? Number(daten.get('voraussichtlich')) : null,
        notiz: daten.get('notiz'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

function zeichneListe(container, aktualisieren) {
  const gefiltert = sortiereAuftraege(zustand.auftraege).filter((a) => filter === 'alle' || a.status === filter);
  const liste = container.querySelector('#hr-liste');
  liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Aufträge in dieser Ansicht.</p>' : '';
  for (const a of gefiltert) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${HANDY_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(a.geraet)}</strong>
        <small>Warenwert ${a.warenwert.toFixed(2)} €${a.voraussichtlicher_verkaufspreis ? ` · voraussichtlich ${a.voraussichtlicher_verkaufspreis.toFixed(2)} €` : ''}</small>
      </div>
      <span class="status-badge ${STATUS_KLASSE[a.status]}">${STATUS_TEXT[a.status]}</span>
      <div class="punkt-aktionen">
        ${a.status !== 'verkauft' ? '<button data-a="weiter">›</button>' : ''}
        <button data-a="weg">✕</button>
      </div>`;
    if (a.status !== 'verkauft') {
      zeile.querySelector('[data-a=weiter]').addEventListener('click', async () => {
        const neuerStatus = naechsterAuftragStatus(a.status);
        try {
          if (neuerStatus === 'verkauft') {
            const vorschlag = a.voraussichtlicher_verkaufspreis ?? a.warenwert;
            const preisText = prompt('Tatsächlicher Verkaufspreis (€):', vorschlag);
            if (preisText === null) return;
            const kontoId = zustand.konten?.[0]?.id;
            await setzeAuftragStatus(a, 'verkauft', { tatsaechlicherVerkaufspreis: Number(preisText), kontoId });
          } else {
            await setzeAuftragStatus(a, neuerStatus);
          }
          await aktualisieren();
        } catch (err) { alert(err.message); }
      });
    }
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`Auftrag „${a.geraet}" entfernen?`)) return;
      try { await entferneAuftrag(a.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}

registriere({
  id: 'handyreparatur',
  titel: 'Handyreparaturen',
  async init(container) {
    if (!zustand) await ladeZustand();
    const aktualisieren = async () => { await ladeZustand(); render(); };

    function render() {
      container.innerHTML = `
        <div class="modul-kopf">
          <button id="hr-zurueck" type="button">‹ Zurück</button>
        </div>
        <div class="stat-karte gross">
          <small>Erwarteter Gewinn</small>
          <span>${erwarteterGewinn(zustand.auftraege).toFixed(2)} €</span>
        </div>
        <div class="chips">
          ${FILTER.map((f) => `<button type="button" class="chip${f === filter ? ' aktiv' : ''}" data-f="${f}">${FILTER_TEXT[f]}</button>`).join('')}
        </div>
        <div class="punkt-liste" id="hr-liste"></div>`;
      container.querySelector('#hr-zurueck').addEventListener('click', () => { history.back(); });
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
