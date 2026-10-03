import { registriere } from '../../registry.js';
import { ladeKalenderDaten, legeTerminAn, entferneTermin } from './daten.js';
import { monatsRaster, eintraegeProTag, monatsName, verschiebeMonat } from './berechnung.js';

const ART_LABEL = { termin: 'Termin', todo: 'To-do', rechnung: 'Rechnung' };
const ART_ZIEL = { termin: null, todo: '#/todos', rechnung: '#/rechnungen' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const heuteIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

registriere({
  id: 'kalender',
  titel: 'Kalender',
  async init(container) {
    const heute = heuteIso();
    let jahr = Number(heute.slice(0, 4));
    let monat = Number(heute.slice(5, 7));
    let gewaehlt = heute;
    let tage = {};

    container.innerHTML = `
      <div class="modul-kopf"><button id="kal-zurueck" type="button">‹ Zurück</button></div>
      <div class="settings-row" style="justify-content:space-between;">
        <button id="kal-vor" type="button" class="knopf-neutral" style="width:auto;">‹</button>
        <strong id="kal-monat"></strong>
        <button id="kal-weiter" type="button" class="knopf-neutral" style="width:auto;">›</button>
      </div>
      <div id="kal-raster" style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:8px 0;"></div>
      <p id="kal-status" class="lade" hidden></p>
      <div id="kal-tag"></div>`;
    container.querySelector('#kal-zurueck').addEventListener('click', () => { history.back(); });
    const status = container.querySelector('#kal-status');
    const meldung = (t) => { status.hidden = !t; status.textContent = t ?? ''; };

    const rendereRaster = () => {
      container.querySelector('#kal-monat').textContent = `${monatsName(monat)} ${jahr}`;
      const raster = container.querySelector('#kal-raster');
      raster.replaceChildren();
      for (const k of ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']) {
        const kopf = document.createElement('small');
        kopf.style.textAlign = 'center';
        kopf.textContent = k;
        raster.appendChild(kopf);
      }
      for (const tag of monatsRaster(jahr, monat)) {
        const zelle = document.createElement('button');
        zelle.type = 'button';
        if (!tag) {
          zelle.disabled = true;
          zelle.style.visibility = 'hidden';
          raster.appendChild(zelle);
          continue;
        }
        const anzahl = tage[tag]?.length ?? 0;
        zelle.className = 'knopf-neutral';
        zelle.style.cssText = `padding:8px 0;${tag === gewaehlt ? 'outline:2px solid currentColor;' : ''}${tag === heute ? 'font-weight:700;' : ''}`;
        zelle.textContent = String(Number(tag.slice(8)));
        if (anzahl > 0) {
          const punkt = document.createElement('div');
          punkt.textContent = '•'.repeat(Math.min(anzahl, 3));
          punkt.style.fontSize = '10px';
          zelle.appendChild(punkt);
        }
        zelle.addEventListener('click', () => { gewaehlt = tag; rendere(); });
        raster.appendChild(zelle);
      }
    };

    const rendereTag = () => {
      const box = container.querySelector('#kal-tag');
      const [j, m, t] = gewaehlt.split('-');
      box.innerHTML = `<div class="settings-label">${esc(`${Number(t)}. ${monatsName(Number(m))} ${j}`)}</div>
        <div class="punkt-liste" id="kal-eintraege"></div>
        <div class="settings-label">Termin hinzufügen</div>
        <input id="kal-titel" type="text" placeholder="Titel" style="width:100%;margin-bottom:8px;">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input id="kal-zeit" type="time" style="flex:1;">
          <input id="kal-ort" type="text" placeholder="Ort (optional)" style="flex:2;">
        </div>
        <button id="kal-neu" type="button" class="knopf-neutral">Termin speichern</button>`;
      const liste = box.querySelector('#kal-eintraege');
      const eintraege = tage[gewaehlt] ?? [];
      if (eintraege.length === 0) liste.innerHTML = '<p class="lade">Nichts eingetragen.</p>';
      for (const e of eintraege) {
        const zeile = document.createElement('div');
        zeile.className = 'punkt-zeile';
        const zeit = e.uhrzeit ? `${esc(e.uhrzeit)} · ` : '';
        zeile.innerHTML = `<div class="punkt-info"><strong>${zeit}${esc(e.titel)}</strong>
          <small>${ART_LABEL[e.art]}${e.ort ? ` · ${esc(e.ort)}` : ''}</small></div>`;
        if (e.art === 'termin') {
          const weg = document.createElement('button');
          weg.type = 'button';
          weg.className = 'knopf-neutral';
          weg.style.width = 'auto';
          weg.textContent = 'Löschen';
          weg.addEventListener('click', async () => {
            if (!confirm(`Termin „${e.titel}“ löschen?`)) return;
            try { await entferneTermin(e.id); await ladeNeu(); } catch (err) { meldung(err.message); }
          });
          zeile.appendChild(weg);
        } else {
          zeile.style.cursor = 'pointer';
          zeile.addEventListener('click', () => { location.hash = ART_ZIEL[e.art]; });
        }
        liste.appendChild(zeile);
      }
      box.querySelector('#kal-neu').addEventListener('click', async () => {
        const titel = box.querySelector('#kal-titel').value.trim();
        if (!titel) { meldung('Bitte einen Titel eingeben.'); return; }
        if (gewaehlt < heute) {
          meldung('Termine in der Vergangenheit werden automatisch gelöscht – bitte ein heutiges oder späteres Datum wählen.');
          return;
        }
        try {
          await legeTerminAn({
            titel,
            faellig_am: gewaehlt,
            uhrzeit: box.querySelector('#kal-zeit').value || null,
            ort: box.querySelector('#kal-ort').value.trim() || null,
          });
          await ladeNeu();
        } catch (err) { meldung(err.message); }
      });
    };

    const rendere = () => { rendereRaster(); rendereTag(); };

    const ladeNeu = async () => {
      try { tage = eintraegeProTag(await ladeKalenderDaten()); meldung(null); }
      catch (e) { meldung(e.message); }
      rendere();
    };

    container.querySelector('#kal-vor').addEventListener('click', () => {
      ({ jahr, monat } = verschiebeMonat(jahr, monat, -1));
      rendere();
    });
    container.querySelector('#kal-weiter').addEventListener('click', () => {
      ({ jahr, monat } = verschiebeMonat(jahr, monat, 1));
      rendere();
    });

    rendere();
    await ladeNeu();
  },
});
