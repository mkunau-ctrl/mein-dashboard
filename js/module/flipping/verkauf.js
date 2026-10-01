import { setzeNachrichtErledigt } from './daten.js';
import { teileKaufinteresse, gruppenNachKategorie } from './verkauf-berechnung.js';

const STATUS_TEXT = {
  beantwortet: 'beantwortet', eskaliert_offen: 'bitte selbst antworten',
  kaufinteresse: 'Kaufinteresse!', erledigt: 'erledigt',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatiereZeit(iso) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export async function zeigeVerkauf(container, zustand, aktualisieren) {
  const alle = zustand.verkaufsNachrichten ?? [];
  if (alle.length === 0) {
    container.innerHTML = '<p class="lade">Noch keine Käufer-Nachrichten. Der Kleinanzeigen-Wächter trägt sie hier ein.</p>';
    return;
  }

  const { kaufinteresse, rest } = teileKaufinteresse(alle);
  if (kaufinteresse.length > 0) {
    const h = document.createElement('h3');
    h.textContent = `🔥 Kaufinteresse jetzt (${kaufinteresse.length})`;
    container.appendChild(h);
    const liste = document.createElement('div');
    liste.className = 'punkt-liste';
    container.appendChild(liste);
    zeichne(liste, kaufinteresse, aktualisieren, true);
  }

  for (const [kat, eintraege] of gruppenNachKategorie(rest)) {
    const h = document.createElement('h3');
    h.textContent = `${kat} (${eintraege.length})`;
    container.appendChild(h);
    const liste = document.createElement('div');
    liste.className = 'punkt-liste';
    container.appendChild(liste);
    zeichne(liste, eintraege, aktualisieren, false);
  }
}

function zeichne(liste, eintraege, aktualisieren, hervorgehoben) {
  for (const n of eintraege) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(n.kaeufer)}</strong>
        <small>${esc(n.anzeige_titel)}</small>
        <small>„${esc(n.frage)}"</small>
        ${n.antwort ? `<small>Antwort: „${esc(n.antwort)}"</small>` : ''}
        <small>${formatiereZeit(n.erstellt_am)}</small>
      </div>
      <span class="${hervorgehoben ? 'badge-ueberfaellig' : 'status-badge status-fehlt'}">${STATUS_TEXT[n.status] ?? n.status}</span>
      ${n.status !== 'erledigt' ? '<div class="punkt-aktionen"><button data-a="erledigt">✓</button></div>' : ''}`;
    const erledigtBtn = zeile.querySelector('[data-a=erledigt]');
    if (erledigtBtn) {
      erledigtBtn.addEventListener('click', async () => {
        erledigtBtn.disabled = true;
        try { await setzeNachrichtErledigt(n.id); await aktualisieren(); }
        catch (err) { alert(err.message); erledigtBtn.disabled = false; }
      });
    }
    liste.appendChild(zeile);
  }
}
