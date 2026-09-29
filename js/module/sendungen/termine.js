import { hakeTerminAb, entferneTermin, ladeOffeneTodosMitFrist } from './daten.js';
import { sortiereTermine } from './berechnung.js';
import { zuIcsDatei } from './ics.js';

function ladeIcsDatei(inhalt, dateiname) {
  const blob = new Blob([inhalt], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  a.click();
  URL.revokeObjectURL(url);
}

const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export async function zeigeTermine(container, zustand, aktualisieren, _zeitraum, _setZeitraum, detail) {
  if (detail) {
    const termin = zustand.termine.find((t) => t.id === detail);
    if (termin) {
      const { zeigeTerminDetail } = await import('./termin-detail.js');
      zeigeTerminDetail(container, termin, () => { location.hash = '#/sendungen/termine'; });
      return;
    }
  }

  const export_ = document.createElement('button');
  export_.type = 'button';
  export_.textContent = 'Kalender exportieren (.ics)';
  export_.addEventListener('click', async () => {
    export_.disabled = true;
    try {
      const todos = await ladeOffeneTodosMitFrist();
      const eintraege = [
        ...zustand.termine.map((t) => ({ titel: t.titel, datum: t.faellig_am, uhrzeit: t.uhrzeit, ort: t.ort, notiz: t.notiz })),
        ...todos.map((t) => ({ titel: t.text, datum: t.faellig })),
      ];
      ladeIcsDatei(zuIcsDatei(eintraege), `termine-${new Date().toISOString().slice(0, 10)}.ics`);
    } catch (err) { alert(err.message); }
    export_.disabled = false;
  });
  container.appendChild(export_);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of sortiereTermine(zustand.termine)) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `
      <div class="icon-badge">${KALENDER_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(t.titel)}</strong>
        <small>fällig am ${t.faellig_am}${t.uhrzeit ? ` · ${esc(t.uhrzeit)} Uhr` : ''}${t.ort ? ` · ${esc(t.ort)}` : ''}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="ab">✓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.addEventListener('click', () => { location.hash = `#/sendungen/termine/${t.id}`; });
    zeile.querySelector('[data-a=ab]').addEventListener('click', async (e) => {
      e.stopPropagation();
      try { await hakeTerminAb(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Termin „${t.titel}" entfernen?`)) return;
      try { await entferneTermin(t.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
