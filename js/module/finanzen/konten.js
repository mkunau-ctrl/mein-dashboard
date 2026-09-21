import { legeKontoAn } from './daten.js';
import { kontostandProKonto } from './berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="name" type="text" placeholder="Kontoname (z. B. Trade Republic)" required>
    <input name="kontostand_start" type="number" step="0.01" placeholder="Aktueller Stand" required>
    <input name="stand_datum" type="date" value="${heute()}" required>
    <button type="submit">+ Konto anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeKontoAn({
        name: daten.get('name'),
        kontostand_start: Number(daten.get('kontostand_start')),
        stand_datum: daten.get('stand_datum'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeKonten(container, zustand, aktualisieren) {
  baueFormular(container, aktualisieren);

  const heuteStr = heute();
  for (const k of zustand.konten) {
    const stand = kontostandProKonto(k, zustand.expenses, zustand.einnahmen, heuteStr);
    const kopf = document.createElement('div');
    kopf.className = 'punkt-zeile';
    kopf.innerHTML = `
      <div class="icon-badge">${WALLET_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(k.name)}</strong>
        <small>Stand seit ${k.stand_datum}: ${k.kontostand_start.toFixed(2)} €</small>
      </div>
      <strong>${stand.toFixed(2)} €</strong>
      <div class="punkt-aktionen"><button data-a="neusetzen">Neu setzen</button></div>`;
    kopf.querySelector('[data-a=neusetzen]').addEventListener('click', async () => {
      const neuerStand = prompt(`Neuen Stand für „${k.name}" (heute, ${heuteStr}):`, stand.toFixed(2));
      if (neuerStand === null) return;
      const zahl = Number(neuerStand);
      if (Number.isNaN(zahl)) { alert('Bitte eine Zahl eingeben.'); return; }
      try {
        await legeKontoAn({ id: k.id, name: k.name, kontostand_start: zahl, stand_datum: heuteStr });
        await aktualisieren();
      } catch (err) { alert(err.message); }
    });
    container.appendChild(kopf);

    const transaktionen = [
      ...zustand.expenses.filter((e) => e.konto_id === k.id)
        .map((e) => ({ datum: e.datum, text: e.notiz || e.kategorie, betrag: e.betrag, typ: 'ausgabe' })),
      ...zustand.einnahmen.filter((e) => e.konto_id === k.id)
        .map((e) => ({ datum: e.datum, text: e.bezeichnung, betrag: e.betrag, typ: 'einnahme' })),
    ].sort((a, b) => (a.datum < b.datum ? 1 : -1));

    const liste = document.createElement('div');
    liste.className = 'punkt-liste';
    liste.innerHTML = transaktionen.length === 0
      ? '<p class="lade">Noch keine Transaktionen auf diesem Konto.</p>'
      : transaktionen.map((t) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><small>${t.datum} · ${esc(t.text)}</small></div>
          <strong class="${t.typ === 'einnahme' ? 'betrag-plus' : 'betrag-minus'}">${t.typ === 'einnahme' ? '+' : '-'}${t.betrag.toFixed(2)} €</strong>
        </div>`).join('');
    container.appendChild(liste);
  }
}
