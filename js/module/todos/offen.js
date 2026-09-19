import { hakeAb, entferneTodo } from './daten.js';
import { sortiereOffeneTodos, istUeberfaellig } from './planung.js';

const WIEDERHOLUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5M20 20v-5h-5"/><path d="M4.5 15a8 8 0 0 0 14.7 3.2M19.5 9A8 8 0 0 0 4.8 5.8"/></svg>';
const KALENDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>';
const TODO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h10M9 12h10M9 18h10"/><path d="m4 6 1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeOffen(container, zustand, aktualisieren) {
  const heuteStr = heute();
  const todos = sortiereOffeneTodos(zustand.offen, heuteStr);

  if (todos.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Keine offenen Todos.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const t of todos) {
    const ueberfaellig = istUeberfaellig(t, heuteStr);
    const icon = t.vorlage_id ? WIEDERHOLUNG_ICON : t.faellig ? KALENDER_ICON : TODO_ICON;
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${icon}</div>
      <label class="heute-zeile" style="flex:1; padding:0;">
        <input type="checkbox">
        <span>${esc(t.text)}${t.faellig
          ? (ueberfaellig
              ? ` <span class="badge-ueberfaellig">überfällig, ${t.faellig}</span>`
              : ` <small>(${t.faellig})</small>`)
          : ''}</span>
      </label>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;

    const box = zeile.querySelector('input');
    box.addEventListener('change', async () => {
      box.disabled = true;
      try { await hakeAb(t); await aktualisieren(); }
      catch (e) { box.checked = false; box.disabled = false; alert(e.message); }
    });
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      const hinweis = t.vorlage_id
        ? `„${t.text}" entfernen? Die Wiederkehr wird beendet.`
        : `„${t.text}" entfernen?`;
      if (!confirm(hinweis)) return;
      try { await entferneTodo(t); await aktualisieren(); }
      catch (e) { alert(e.message); }
    });
    liste.appendChild(zeile);
  }
}
