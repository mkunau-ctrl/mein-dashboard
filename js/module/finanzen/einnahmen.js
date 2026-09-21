import { legeEinnahmeAn, bestaetigeEinnahmenVorlage, entferneEinnahme } from './daten.js';

const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function baueFormular(container, zustand, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  const kontoOptionen = zustand.konten
    .map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  form.innerHTML = `
    <input name="betrag" type="number" step="0.01" placeholder="Betrag" required>
    <input name="bezeichnung" type="text" placeholder="Bezeichnung (z. B. Handyreparaturen)">
    <input name="datum" type="date" value="${heute()}" required>
    <select name="konto_id" required>${kontoOptionen}</select>
    <button type="submit">+ Einnahme anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeEinnahmeAn({
        betrag: Number(daten.get('betrag')),
        bezeichnung: daten.get('bezeichnung') || 'sonstiges',
        datum: daten.get('datum'),
        konto_id: daten.get('konto_id'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeEinnahmen(container, zustand, aktualisieren) {
  baueFormular(container, zustand, aktualisieren);

  const faelligeVorlagen = zustand.einnahmenVorlagen.filter((v) => v.naechste_faelligkeit <= heute());
  if (faelligeVorlagen.length > 0) {
    const abschnitt = document.createElement('div');
    abschnitt.className = 'punkt-liste';
    for (const v of faelligeVorlagen) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.innerHTML = `
        <div class="icon-badge">${EINNAHME_ICON}</div>
        <div class="punkt-info">
          <strong>${esc(v.bezeichnung)}</strong>
          <small>fällig seit ${v.naechste_faelligkeit} · ${v.betrag.toFixed(2)} €</small>
        </div>
        <button data-a="eingegangen">Eingegangen</button>`;
      zeile.querySelector('[data-a=eingegangen]').addEventListener('click', async () => {
        try { await bestaetigeEinnahmenVorlage(v); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
      abschnitt.appendChild(zeile);
    }
    container.appendChild(abschnitt);
  }

  if (zustand.einnahmen.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Einnahmen eingetragen.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const e of zustand.einnahmen) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${EINNAHME_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(e.bezeichnung)}</strong>
        <small>${e.datum}${e.notiz ? ` · ${esc(e.notiz)}` : ''}</small>
      </div>
      <strong class="betrag-plus">+${e.betrag.toFixed(2)} €</strong>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      const hinweis = e.vorlage_id
        ? `„${e.bezeichnung}" entfernen? Die Wiederkehr wird beendet.`
        : `„${e.bezeichnung}" entfernen?`;
      if (!confirm(hinweis)) return;
      try { await entferneEinnahme(e); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
