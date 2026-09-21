import { gesamtKontostand, unechterGesamtKontostand, nettoVermoegen, summeProMonat } from './berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeKontostand(container, zustand, aktualisieren) {
  const gesetzt = zustand.konten.length > 0;

  if (gesetzt) {
    const stand = gesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, heute());
    const jetzt = new Date();
    const ausgabenMonat = summeProMonat(zustand.expenses, jetzt.getFullYear(), jetzt.getMonth() + 1);
    const unecht = unechterGesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, zustand.teile, heute());
    const netto = nettoVermoegen(zustand.konten, zustand.expenses, zustand.einnahmen, zustand.teile, zustand.schulden, zustand.zahlungen, heute());
    const box = document.createElement('div');
    box.className = 'stat-karte gross';
    box.innerHTML = `
      <div class="stat-kopf">
        <div class="icon-badge">${WALLET_ICON}</div>
        <small>Aktueller Kontostand (alle Konten)</small>
      </div>
      <span>${stand.toFixed(2)} €</span>
      <small class="betrag-minus">-${ausgabenMonat.toFixed(2)} € Ausgaben diesen Monat</small>
      <small>${unecht.toFixed(2)} € inkl. Warenwert (unechter Kontostand)</small>
      <small>${netto.toFixed(2)} € Netto-Vermögen (inkl. Warenwert und offener Schulden)</small>`;
    container.appendChild(box);
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = `Aufgeteilt auf ${zustand.konten.length} Konto${zustand.konten.length === 1 ? '' : 'en'} — Details im Tab „Konten".`;
    container.appendChild(hinweis);
  } else {
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = 'Noch kein Konto angelegt.';
    container.appendChild(hinweis);
  }
}
