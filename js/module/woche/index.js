import { registriere } from '../../registry.js';
import { ladeAlles, setzeAufgabeErledigt, setzeKlaerenErledigt, legeKlaerenAn } from './daten.js';
import {
  segmenteFuerTag, flexFenster, restFlexWoche, offenePflichtenMinuten, aufgabeOffen, warnungen,
  schlafenszeit, montagVon, addTage, wochentagVon,
} from '../../../supabase/functions/push-senden/wochenplan.js';

const WOCHENTAGE = ['', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const uhr = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
const stunden = (min) => `${String(Math.round((min / 60) * 10) / 10).replace('.', ',')} h`;

// Aktuelles Datum und Minuten in Berlin (unabhaengig von der Geraetezeitzone)
function berlinJetzt() {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t) => teile.find((p) => p.type === t).value;
  return { heute: `${g('year')}-${g('month')}-${g('day')}`, minuten: Number(g('hour')) * 60 + Number(g('minute')) };
}

function zeile(inhaltHtml, extra = '') {
  return `<div class="punkt-zeile"${extra}>${inhaltHtml}</div>`;
}

function tagesZeile(s) {
  if (s.art === 'ganztags') return zeile(`<div class="punkt-info"><strong>${esc(s.titel)}</strong><small>ganztags</small></div>`);
  const zeit = s.art === 'routine' || s.ende_offen ? uhr(s.von) : `${uhr(s.von)} – ${uhr(s.bis)}`;
  const titel = s.art === 'routine' ? s.titel.split(',')[0] : s.titel;
  return zeile(`<div class="punkt-info"><strong>${esc(titel)}</strong><small>${zeit}</small></div>`);
}

function baueHtml(z, { heute, minuten }) {
  const daten = { bloecke: z.bloecke, ausnahmen: z.ausnahmen, termine: z.termine };
  const seg = segmenteFuerTag(heute, daten);
  const erstesRoutine = seg.find((s) => s.art === 'routine');
  const festes = seg.filter((s) => ['fest', 'arbeit', 'termin', 'ganztags'].includes(s.art) || s === erstesRoutine);
  const essen = seg.filter((s) => s.art === 'essen').map((s) => `${uhr(s.von)} ${esc(s.titel)}`);
  const fenster = flexFenster(heute, daten);
  const tagMin = fenster.reduce((s, f) => s + (f.bis - f.von), 0);
  const restMin = restFlexWoche(heute, minuten, daten);
  const pflichtenMin = offenePflichtenMinuten(z.aufgaben, heute);
  const warn = warnungen({ tagMin, restWocheMin: restMin, pflichtenMin });
  const schlaf = schlafenszeit(heute, daten);
  const morgen = addTage(heute, 1);
  const morgenFest = segmenteFuerTag(morgen, daten).filter((s) => ['arbeit', 'termin', 'fest', 'ganztags'].includes(s.art));

  const [, m, t] = heute.split('-').map(Number);
  const kopf = `${WOCHENTAGE[wochentagVon(heute)]}, ${t}.${m}.`;

  const aufgabenHtml = z.aufgaben.map((a) => {
    const offen = aufgabeOffen(a, heute);
    const dauer = a.dauer_min ? `${a.dauer_min} Min.` : (a.pflicht ? '' : 'ohne feste Zeit');
    return zeile(`<label style="display:flex;align-items:center;gap:10px;flex:1;">
      <input type="checkbox" data-aufgabe="${a.id}" ${offen ? '' : 'checked'}>
      <span class="punkt-info"><strong${offen ? '' : ' style="text-decoration:line-through;opacity:.6"'}>${esc(a.titel)}</strong>${dauer ? `<small>${dauer}</small>` : ''}</span></label>`);
  }).join('');

  const offeneKlaeren = z.klaeren.filter((k) => !k.erledigt);
  const erledigteKlaeren = z.klaeren.filter((k) => k.erledigt);
  const klaerenHtml = [...offeneKlaeren, ...erledigteKlaeren].map((k) => zeile(`<label style="display:flex;align-items:center;gap:10px;flex:1;">
      <input type="checkbox" data-klaeren="${k.id}" ${k.erledigt ? 'checked' : ''}>
      <span class="punkt-info"><strong${k.erledigt ? ' style="text-decoration:line-through;opacity:.6"' : ''}>${esc(k.titel)}</strong>${k.notiz ? `<small>${esc(k.notiz)}</small>` : ''}</span></label>`)).join('');

  return `
    <div class="settings-label">Heute · ${kopf}</div>
    <div class="punkt-liste">${festes.length ? festes.map(tagesZeile).join('') : zeile('<span class="row-sub">Nichts Festes.</span>')}</div>
    ${essen.length ? `<p class="lade" style="text-align:left;margin:8px 4px;">Essen: ${essen.join(', ')}</p>` : ''}

    <div class="settings-label">Flexible Zeit heute: ${tagMin ? stunden(tagMin) : 'keine'}</div>
    <div class="punkt-liste">${fenster.length ? fenster.map((f) => zeile(`<div class="punkt-info"><strong>${uhr(f.von)} – ${uhr(f.bis)}</strong></div>`)).join('') : zeile('<span class="row-sub">Kein freies Fenster mehr.</span>')}</div>
    ${warn.map((w) => `<p class="lade" style="text-align:left;margin:8px 4px;color:#E5484D;">${esc(w)}</p>`).join('')}
    <p class="lade" style="text-align:left;margin:8px 4px;">Woche noch ${stunden(restMin)} flexibel, Pflichten ca. ${stunden(pflichtenMin)} offen,
      Rest für Projekte und Handys: ${stunden(Math.max(0, restMin - pflichtenMin))}.</p>

    <div class="settings-label">Wochenaufgaben</div>
    <div class="punkt-liste">${aufgabenHtml}</div>

    <div class="settings-label">Zu klären</div>
    <div class="punkt-liste">${klaerenHtml || zeile('<span class="row-sub">Nichts offen.</span>')}</div>
    <form id="woche-klaeren-neu" style="display:flex;gap:8px;margin-top:8px;">
      <input id="woche-klaeren-text" type="text" placeholder="Neuer Punkt …" style="flex:1;">
      <button type="submit" class="knopf-neutral" style="width:auto;">Hinzufügen</button>
    </form>

    <div class="settings-label">Morgen</div>
    <p class="lade" style="text-align:left;margin:8px 4px;">${morgenFest.length
      ? morgenFest.map((s) => (s.art === 'arbeit' ? `Arbeit bis ${uhr(s.bis)}` : s.art === 'ganztags' ? esc(s.titel) : `${uhr(s.von)} ${esc(s.titel)}`)).join(', ')
      : 'Nichts Festes.'}${schlaf ? `<br>Schlafen heute: ${schlaf}` : ''}</p>`;
}

let aktuell = null; // { container, rendere }

async function rendere(container) {
  const jetzt = berlinJetzt();
  container.innerHTML = '<p class="lade">Lade …</p>';
  let z;
  try { z = await ladeAlles(jetzt.heute); }
  catch (e) { container.innerHTML = `<p class="lade">${esc(e.message)}</p>`; return; }

  container.innerHTML = `<div class="modul-kopf"><button id="woche-zurueck" type="button">‹ Zurück</button></div>${baueHtml(z, jetzt)}`;
  container.querySelector('#woche-zurueck').addEventListener('click', () => { location.hash = '#/home'; });

  const montag = montagVon(jetzt.heute);
  const speichere = async (fn, box) => {
    box.disabled = true;
    try { await fn(); await rendere(container); }
    catch (e) { alert(e.message); box.checked = !box.checked; box.disabled = false; }
  };
  container.querySelectorAll('[data-aufgabe]').forEach((box) => {
    box.addEventListener('change', () => speichere(() => setzeAufgabeErledigt(box.dataset.aufgabe, box.checked ? montag : null), box));
  });
  container.querySelectorAll('[data-klaeren]').forEach((box) => {
    box.addEventListener('change', () => speichere(() => setzeKlaerenErledigt(box.dataset.klaeren, box.checked), box));
  });
  container.querySelector('#woche-klaeren-neu').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feld = container.querySelector('#woche-klaeren-text');
    const titel = feld.value.trim();
    if (!titel) return;
    try { await legeKlaerenAn(titel, z.klaeren.length + 1); await rendere(container); }
    catch (err) { alert(err.message); }
  });
}

registriere({
  id: 'woche',
  titel: 'Woche',
  async init(container) {
    aktuell = container;
    await rendere(container);
  },
  async aktualisieren() {
    if (aktuell?.isConnected) await rendere(aktuell);
  },
});
