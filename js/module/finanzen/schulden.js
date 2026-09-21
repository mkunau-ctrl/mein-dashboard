import { legeSchuldAn, verbucheZahlung } from './daten.js';
import { schuldenRestbetrag, sortiereSchulden } from './berechnung.js';

const SCHULD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="person" type="text" placeholder="Person" required>
    <input name="gesamtbetrag" type="number" step="0.01" placeholder="Betrag" required>
    <select name="richtung" required>
      <option value="mir_wird_geschuldet">wird mir geschuldet</option>
      <option value="ich_schulde">ich schulde</option>
    </select>
    <input name="notiz" type="text" placeholder="Notiz (optional)">
    <button type="submit">+ Schuld anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeSchuldAn({
        person: daten.get('person'),
        gesamtbetrag: Number(daten.get('gesamtbetrag')),
        richtung: daten.get('richtung'),
        notiz: daten.get('notiz'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeSchulden(container, zustand, aktualisieren) {
  baueFormular(container, aktualisieren);

  const sortiert = sortiereSchulden(zustand.schulden, zustand.zahlungen);
  if (sortiert.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Keine Schulden eingetragen.';
    container.appendChild(p);
  }

  for (const s of sortiert) {
    const rest = schuldenRestbetrag(s, zustand.zahlungen);
    const richtungText = s.richtung === 'mir_wird_geschuldet' ? 'schuldet mir' : 'ich schulde';
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${SCHULD_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(s.person)}</strong>
        <small>${richtungText}, Gesamt ${s.gesamtbetrag.toFixed(2)} €${s.notiz ? ` · ${esc(s.notiz)}` : ''}</small>
      </div>
      <strong>${rest > 0 ? rest.toFixed(2) + ' €' : 'beglichen'}</strong>
      ${rest > 0 ? '<div class="punkt-aktionen"><button data-a="zahlung">+ Zahlung</button></div>' : ''}`;
    const zahlungBtn = zeile.querySelector('[data-a=zahlung]');
    if (zahlungBtn) {
      zahlungBtn.addEventListener('click', async () => {
        const betrag = prompt(`Zahlung für „${s.person}" (Restbetrag ${rest.toFixed(2)} €):`, rest.toFixed(2));
        if (betrag === null) return;
        const zahl = Number(betrag);
        if (Number.isNaN(zahl) || zahl <= 0) { alert('Bitte einen gültigen Betrag eingeben.'); return; }
        try { await verbucheZahlung(s.id, zahl); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
    }
    container.appendChild(zeile);

    const eigeneZahlungen = zustand.zahlungen.filter((z) => z.schuld_id === s.id)
      .sort((a, b) => (a.datum < b.datum ? 1 : -1));
    if (eigeneZahlungen.length > 0) {
      const verlauf = document.createElement('div');
      verlauf.className = 'punkt-liste';
      verlauf.innerHTML = eigeneZahlungen.map((z) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><small>${z.datum}${z.notiz ? ` · ${esc(z.notiz)}` : ''}</small></div>
          <strong class="betrag-plus">${z.betrag.toFixed(2)} €</strong>
        </div>`).join('');
      container.appendChild(verlauf);
    }
  }
}
