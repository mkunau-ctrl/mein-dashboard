import { supabase } from './supabase.js';
import { zaehleUngelesen, zeitText, badgeText } from './glocke-berechnung.js';

const knopf = document.getElementById('glocke');
const badge = document.getElementById('glocke-badge');
const panel = document.getElementById('glocke-panel');
let meldungen = [];
let gestartet = false;

async function lade() {
  const { data } = await supabase.from('meldungen').select('*').order('erstellt_am', { ascending: false }).limit(30);
  meldungen = data ?? [];
  zeichne();
}

function zeichneBadge() {
  const t = badgeText(zaehleUngelesen(meldungen));
  badge.textContent = t;
  badge.hidden = !t;
}

function zeichne() {
  zeichneBadge();
  if (panel.hidden) return;
  panel.replaceChildren();
  const kopf = document.createElement('div');
  kopf.className = 'glocke-kopf';
  const ueberschrift = document.createElement('strong');
  ueberschrift.textContent = 'Meldungen';
  kopf.appendChild(ueberschrift);
  const alle = document.createElement('button');
  alle.type = 'button';
  alle.className = 'glocke-alle';
  alle.textContent = 'Alle gelesen';
  alle.addEventListener('click', alleGelesen);
  kopf.appendChild(alle);
  panel.appendChild(kopf);
  if (!meldungen.length) {
    const leer = document.createElement('p');
    leer.className = 'glocke-leer';
    leer.textContent = 'Keine Meldungen.';
    panel.appendChild(leer);
    return;
  }
  for (const m of meldungen) {
    const zeile = document.createElement('button');
    zeile.type = 'button';
    zeile.className = `glocke-zeile${m.gelesen ? '' : ' neu'}`;
    const titel = document.createElement('span'); titel.className = 'glocke-titel'; titel.textContent = m.titel;
    const text = document.createElement('span'); text.className = 'glocke-text'; text.textContent = m.text;
    const zeit = document.createElement('span'); zeit.className = 'glocke-zeit'; zeit.textContent = zeitText(m.erstellt_am);
    zeile.append(titel, text, zeit);
    zeile.addEventListener('click', () => oeffne(m));
    panel.appendChild(zeile);
  }
}

async function oeffne(m) {
  if (!m.gelesen) {
    m.gelesen = true;
    await supabase.from('meldungen').update({ gelesen: true }).eq('id', m.id);
  }
  schliesse();
  if (m.url) location.hash = m.url.startsWith('#') ? m.url : '#/home';
  zeichneBadge();
}

async function alleGelesen() {
  const ids = meldungen.filter((m) => !m.gelesen).map((m) => m.id);
  if (!ids.length) return;
  for (const m of meldungen) m.gelesen = true;
  zeichne();
  await supabase.from('meldungen').update({ gelesen: true }).in('id', ids);
}

function schliesse() { panel.hidden = true; }

export async function starteGlocke() {
  if (gestartet) { lade(); return; }
  gestartet = true;
  knopf.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) lade();
  });
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !knopf.contains(e.target)) schliesse();
  });
  window.addEventListener('hashchange', schliesse);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) lade(); });
  // Zeile fuer die Schalter anlegen, damit die Cloud-Funktion die Glocke auch ohne Geraet fuellt
  await supabase.from('benachrichtigung_einst').upsert({}, { onConflict: 'user_id', ignoreDuplicates: true });
  lade();
}
