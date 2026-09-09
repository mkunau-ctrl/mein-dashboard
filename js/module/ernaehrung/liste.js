import { speichereItem, deaktiviereItem } from './daten.js';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

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

  const neu = document.createElement('button');
  neu.textContent = '+ Neuer Punkt';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular(null));
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${esc(it.label)}</strong>
        <small>${it.kategorie === 'supplement' ? 'Supplement' : 'Ernährung'} · ${esc(planText(it))}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="hoch" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-a="runter" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-a="bearbeiten">✎</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=bearbeiten]')
      .addEventListener('click', () => oeffneFormular(it));
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

  function oeffneFormular(it) {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>${it ? 'Punkt bearbeiten' : 'Neuer Punkt'}</h3>
        <label>Name <input name="label" required value="${esc(it?.label ?? '')}"></label>
        <label>Kategorie
          <select name="kategorie">
            <option value="ernaehrung" ${it?.kategorie !== 'supplement' ? 'selected' : ''}>Ernährung</option>
            <option value="supplement" ${it?.kategorie === 'supplement' ? 'selected' : ''}>Supplement</option>
          </select>
        </label>
        <label>Zeitplan
          <select name="plan_typ">
            <option value="taeglich" ${(!it || it.plan_typ === 'taeglich') ? 'selected' : ''}>täglich</option>
            <option value="wochentage" ${it?.plan_typ === 'wochentage' ? 'selected' : ''}>bestimmte Wochentage</option>
            <option value="intervall" ${it?.plan_typ === 'intervall' ? 'selected' : ''}>alle N Tage</option>
          </select>
        </label>
        <fieldset class="wt-feld">
          ${WT.map((t, idx) => `<label><input type="checkbox" name="wt" value="${idx + 1}"
            ${(it?.plan_wochentage || []).includes(idx + 1) ? 'checked' : ''}>${t}</label>`).join('')}
        </fieldset>
        <label class="intervall-feld">alle
          <input type="number" name="intervall" min="1" value="${it?.plan_intervall_tage ?? 5}"> Tage</label>
        <p class="dialog-fehler" role="alert" hidden></p>
        <menu>
          <button type="button" data-a="abbrechen">Abbrechen</button>
          <button type="submit" data-a="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);

    const form = dlg.querySelector('form');
    const fehlerEl = dlg.querySelector('.dialog-fehler');
    const schliesse = () => { dlg.close(); dlg.remove(); };

    const sync = () => {
      const t = form.plan_typ.value;
      dlg.querySelector('.wt-feld').hidden = t !== 'wochentage';
      dlg.querySelector('.intervall-feld').hidden = t !== 'intervall';
    };
    form.plan_typ.addEventListener('change', sync);
    sync();

    dlg.querySelector('[data-a=abbrechen]').addEventListener('click', schliesse);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.label.value.trim()) { form.label.focus(); return; }
      const wt = [...form.querySelectorAll('input[name=wt]:checked')].map((c) => +c.value);
      const daten = {
        id: it?.id,
        label: form.label.value.trim(),
        kategorie: form.kategorie.value,
        plan_typ: form.plan_typ.value,
        plan_wochentage: form.plan_typ.value === 'wochentage' ? wt : null,
        plan_intervall_tage: form.plan_typ.value === 'intervall' ? +form.intervall.value : null,
        sortierung: it?.sortierung ?? (zustand.items.length + 1) * 10,
        pflicht: it?.pflicht ?? true,
      };
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await speichereItem(daten);
        schliesse();
        await aktualisieren();
      } catch (err) {
        fehlerEl.textContent = err.message;
        fehlerEl.hidden = false;
        knopf.disabled = false;
      }
    });
    dlg.showModal();
  }
}
