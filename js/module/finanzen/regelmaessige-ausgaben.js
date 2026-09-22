import { legeAusgabenVorlageAn, bestaetigeAusgabenVorlage } from './daten.js';
import { erkenneAbos } from './berechnung.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const WIEDERHOLUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5M20 20v-5h-5"/><path d="M4.5 15a8 8 0 0 0 14.7 3.2M19.5 9A8 8 0 0 0 4.8 5.8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeRegelmaessigeAusgaben(container, zustand, aktualisieren) {
  const heuteStr = heute();
  const alleVorlagen = zustand.ausgabenVorlagen || [];
  const faellig = alleVorlagen.filter((v) => v.naechste_faelligkeit <= heuteStr);
  const erkannt = erkenneAbos(zustand.expenses);
  const bekannteBezeichnungen = new Set(alleVorlagen.map((v) => v.bezeichnung.toLowerCase()));
  const neueErkannte = erkannt.filter((a) => !bekannteBezeichnungen.has(a.haendler.toLowerCase()));

  container.innerHTML = `
    ${faellig.length > 0 ? '<div class="section-head"><h2>Fällig</h2></div><div class="punkt-liste" id="ra-faellig"></div>' : ''}
    <div class="section-head"><h2>Regelmäßige Ausgaben</h2></div>
    <div class="punkt-liste" id="ra-liste">
      ${alleVorlagen.length === 0 ? '<p class="lade">Noch keine regelmäßigen Ausgaben angelegt.</p>' : ''}
    </div>
    <div class="section-head"><h2>Erkannte Muster</h2></div>
    <div class="punkt-liste" id="ra-erkannt">
      ${neueErkannte.length === 0 ? '<p class="lade">Keine neuen Muster erkannt.</p>' : ''}
    </div>`;

  if (faellig.length > 0) {
    const box = container.querySelector('#ra-faellig');
    for (const v of faellig) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.innerHTML = `
        <div class="icon-badge">${AUSGABE_ICON}</div>
        <div class="punkt-info">
          <strong>${esc(v.bezeichnung)}</strong>
          <small>fällig seit ${v.naechste_faelligkeit} · ${v.betrag.toFixed(2)} €</small>
        </div>
        <button data-a="bezahlt">Bezahlt</button>`;
      zeile.querySelector('[data-a=bezahlt]').addEventListener('click', async () => {
        try { await bestaetigeAusgabenVorlage(v); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
      box.appendChild(zeile);
    }
  }

  const liste = container.querySelector('#ra-liste');
  for (const v of alleVorlagen) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${WIEDERHOLUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(v.bezeichnung)}</strong>
        <small>${v.betrag.toFixed(2)} € · nächste Fälligkeit ${v.naechste_faelligkeit}</small>
      </div>`;
    liste.appendChild(zeile);
  }

  const erkanntBox = container.querySelector('#ra-erkannt');
  for (const a of neueErkannte) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${WIEDERHOLUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(a.haendler)}</strong>
        <small>${a.betrag.toFixed(2)} € · ca. ${a.naechsteFaelligkeit}</small>
      </div>
      <button data-a="uebernehmen">Als Vorlage übernehmen</button>`;
    zeile.querySelector('[data-a=uebernehmen]').addEventListener('click', async () => {
      const tag = Number(a.naechsteFaelligkeit.slice(8, 10));
      try {
        await legeAusgabenVorlageAn({
          bezeichnung: a.haendler, betrag: a.betrag, plan_tag_im_monat: tag,
          konto_id: zustand.konten[0]?.id, naechste_faelligkeit: a.naechsteFaelligkeit,
        });
        await aktualisieren();
      } catch (err) { alert(err.message); }
    });
    erkanntBox.appendChild(zeile);
  }
}
