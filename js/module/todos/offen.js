import { legeTodoAn, hakeAb, entferneTodo } from './daten.js';
import { sortiereOffeneTodos, istUeberfaellig } from './planung.js';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
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
  const neu = document.createElement('button');
  neu.textContent = '+ Neues Todo';
  neu.className = 'listen-neu';
  neu.addEventListener('click', oeffneFormular);
  container.appendChild(neu);

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
      <div class="icon-badge${ueberfaellig ? ' rot' : ''}">${icon}</div>
      <label class="heute-zeile" style="flex:1; padding:0;">
        <input type="checkbox">
        <span>${esc(t.text)}${t.faellig
          ? ` <small class="${ueberfaellig ? 'todo-ueberfaellig' : ''}">
              (${ueberfaellig ? 'überfällig, ' : ''}${t.faellig})</small>` : ''}</span>
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

  function oeffneFormular() {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form>
        <h3>Neues Todo</h3>
        <label>Text <input name="text" required></label>
        <label>Fällig am (optional) <input type="date" name="faellig"></label>
        <label style="flex-direction:row; align-items:center; gap:8px;">
          <input type="checkbox" name="wiederkehrend"> wiederkehrend
        </label>
        <div class="wiederkehr-feld" hidden>
          <label>Rhythmus
            <select name="plan_typ">
              <option value="taeglich">täglich</option>
              <option value="wochentage">bestimmte Wochentage</option>
              <option value="monatlich">monatlich (Tag im Monat)</option>
            </select>
          </label>
          <fieldset class="wt-feld">
            ${WT.map((t, idx) => `<label><input type="checkbox" name="wt" value="${idx + 1}">${t}</label>`).join('')}
          </fieldset>
          <label class="monat-feld" hidden>Tag im Monat
            <input type="number" name="tag_im_monat" min="1" max="31" value="1"></label>
        </div>
        <p class="dialog-fehler" role="alert" hidden></p>
        <menu>
          <button type="button" data-a="abbrechen">Abbrechen</button>
          <button type="submit" data-a="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);

    const form = dlg.querySelector('form');
    const fehlerEl = dlg.querySelector('.dialog-fehler');
    const wiederkehrFeld = dlg.querySelector('.wiederkehr-feld');
    const wtFeld = dlg.querySelector('.wt-feld');
    const monatFeld = dlg.querySelector('.monat-feld');
    const schliesse = () => { dlg.close(); dlg.remove(); };

    form.wiederkehrend.addEventListener('change', () => {
      wiederkehrFeld.hidden = !form.wiederkehrend.checked;
    });
    const syncPlanTyp = () => {
      wtFeld.hidden = form.plan_typ.value !== 'wochentage';
      monatFeld.hidden = form.plan_typ.value !== 'monatlich';
    };
    form.plan_typ.addEventListener('change', syncPlanTyp);
    syncPlanTyp();

    dlg.querySelector('[data-a=abbrechen]').addEventListener('click', schliesse);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.text.value.trim()) { form.text.focus(); return; }
      const wt = [...form.querySelectorAll('input[name=wt]:checked')].map((c) => +c.value);
      const wiederkehr = form.wiederkehrend.checked ? {
        plan_typ: form.plan_typ.value,
        plan_wochentage: wt,
        plan_tag_im_monat: +form.tag_im_monat.value,
      } : null;
      if (wiederkehr && wiederkehr.plan_typ === 'wochentage' && wt.length === 0) {
        fehlerEl.textContent = 'Mindestens einen Wochentag wählen.';
        fehlerEl.hidden = false;
        return;
      }
      const knopf = form.querySelector('[data-a=speichern]');
      knopf.disabled = true;
      try {
        await legeTodoAn({
          text: form.text.value.trim(),
          faellig: form.faellig.value || null,
          wiederkehr,
        });
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
