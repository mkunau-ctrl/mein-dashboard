import { speichereItem, deaktiviereItem } from './daten.js';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const ERNAEHRUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8c-3 0-5 2.2-5 5.5S9 20 12 20s5-2.7 5-6.5S15 8 12 8Z"/><path d="M12 8c0-2 1-3.5 3-4"/></svg>';
const SUPPLEMENT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function planText(it) {
  if (it.plan_typ === 'taeglich') return 'täglich';
  if (it.plan_typ === 'wochentage') {
    return (it.plan_wochentage || []).map((n) => WT[n - 1]).join(', ') || '—';
  }
  return `alle ${it.plan_intervall_tage} Tage`;
}

export async function zeigeListe(container, zustand, aktualisieren) {
  const items = [...zustand.items].sort((a, b) => a.sortierung - b.sortierung);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${it.kategorie === 'supplement' ? SUPPLEMENT_ICON : ERNAEHRUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(it.label)}</strong>
        <small>${it.kategorie === 'supplement' ? 'Supplement' : 'Ernährung'} · ${esc(planText(it))}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="hoch" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-a="runter" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${it.label}" entfernen? (bleibt in der Historie)`)) return;
      try { await deaktiviereItem(it.id); await aktualisieren(); }
      catch (e) { alert(e.message); }
    });
    zeile.querySelector('[data-a=hoch]').addEventListener('click', () => tausche(i, i - 1));
    zeile.querySelector('[data-a=runter]').addEventListener('click', () => tausche(i, i + 1));
    liste.appendChild(zeile);
  }

  async function tausche(a, b) {
    const s = items[a].sortierung;
    items[a].sortierung = items[b].sortierung;
    items[b].sortierung = s;
    try {
      await speichereItem(items[a]);
      await speichereItem(items[b]);
      await aktualisieren();
    } catch (e) { alert(e.message); }
  }
}
