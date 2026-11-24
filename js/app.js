import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, beiAuthWechsel,
         meldeAnMitPasskey } from './auth.js';
import { holeModul } from './registry.js';
import { wendeThemeAn, wechsleTheme } from './theme.js';
import { wendeSchriftgroesseAn } from './module/einstellungen/schriftgroesse.js';
import { starteGlocke } from './glocke.js';
import { ICONS, NAV_GRUPPEN, gruppeVon } from './icons.js';
import { starteBefehlsleiste } from './palette.js';
import './module/ernaehrung/index.js';
import './module/todos/index.js';
import './module/finanzen/index.js';
import './module/berichtsheft/index.js';
import './module/sendungen/index.js';
import './module/home/index.js';
import './module/suche/index.js';
import './module/profil/index.js';
import './module/einstellungen/index.js';
import './module/rechnungen/index.js';
import './module/projekte/index.js';
import './module/handyreparatur/index.js';
import './module/flipping/index.js';
import './module/dateien/index.js';
import './module/videos/index.js';
import './module/notizen/index.js';
import './module/kalender/index.js';
import './module/woche/index.js';
import './module/ki/index.js';

// Untere Leiste am Handy: vier feste Seiten (Home in der Mitte) plus "Mehr" (öffnet die Befehlsleiste mit allen Seiten).
const NAV_MODULE = ['ki', 'finanzen', 'home', 'todos'];

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const modulTitel = document.getElementById('modul-titel');
const modulDetail = document.getElementById('modul-detail');
const tabLeiste = document.getElementById('tab-leiste-unten');
const seitenleiste = document.getElementById('seitenleiste');
const kopfPfad = document.getElementById('kopf-pfad');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const themeKnoepfe = [
  document.getElementById('theme-toggle-login'),
  document.getElementById('theme-toggle-dashboard'),
];

const SONNE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';

function aktualisiereThemeUI(aufgeloest) {
  const zielIstHell = aufgeloest === 'dark';
  const label = zielIstHell ? 'Helles Design aktivieren' : 'Dunkles Design aktivieren';
  for (const knopf of themeKnoepfe) {
    knopf.innerHTML = zielIstHell ? SONNE_ICON : MOND_ICON;
    knopf.setAttribute('aria-label', label);
    knopf.title = label;
  }
  themeMeta.setAttribute('content', aufgeloest === 'dark' ? '#000000' : '#ffffff');
}

let aktivesModulId = null;

function zeige(ansicht) {
  loginAnsicht.hidden = ansicht !== 'login';
  dashboardAnsicht.hidden = ansicht !== 'dashboard';
}

function navKnopf(modulId, aktivId, klasse) {
  const modul = holeModul(modulId);
  if (!modul) return null;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  if (klasse) knopf.className = klasse;
  if (modul.id === aktivId) knopf.classList.add('aktiv');
  knopf.innerHTML = `${ICONS[modul.id] || modul.icon || ''}<span>${modul.titel}</span>`;
  knopf.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
  return knopf;
}

function rendereSeitenleiste(aktivId) {
  const nutzerMail = document.getElementById('seitenleiste').dataset.mail || '';
  seitenleiste.innerHTML = `
    <div class="marke"><span class="marke-zeichen">${ICONS.marke}</span><span>Mein Dashboard</span></div>
    <button type="button" class="seite-suche" id="seite-suche">${ICONS.suche}<span>Suchen</span><kbd>Strg K</kbd></button>`;
  seitenleiste.querySelector('#seite-suche').addEventListener('click', () => befehlsleiste.oeffne());
  for (const gruppe of NAV_GRUPPEN) {
    const knoepfe = gruppe.ids.map((id) => navKnopf(id, aktivId, 'nav-punkt')).filter(Boolean);
    if (!knoepfe.length) continue;
    const bereich = document.createElement('div');
    bereich.className = 'nav-gruppe';
    bereich.innerHTML = `<div class="nav-gruppe-titel">${gruppe.titel}</div>`;
    knoepfe.forEach((k) => bereich.appendChild(k));
    seitenleiste.appendChild(bereich);
  }
  const fuss = document.createElement('div');
  fuss.className = 'seiten-fuss';
  for (const id of ['einstellungen']) {
    const k = navKnopf(id, aktivId, 'nav-punkt');
    if (k) fuss.appendChild(k);
  }
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'nutzer-chip';
  chip.innerHTML = `<span class="avatar-klein">${(nutzerMail[0] || 'M').toUpperCase()}</span><span>Profil<small>${nutzerMail || 'Angemeldet'}</small></span>`;
  chip.addEventListener('click', () => { location.hash = '#/profil'; });
  fuss.appendChild(chip);
  seitenleiste.appendChild(fuss);
}

function rendereTabLeiste(aktivId) {
  tabLeiste.innerHTML = '';
  for (const modulId of NAV_MODULE) {
    const tab = navKnopf(modulId, aktivId, '');
    if (tab) tabLeiste.appendChild(tab);
  }
  const mehr = document.createElement('button');
  mehr.type = 'button';
  mehr.innerHTML = `${ICONS.mehr}<span>Mehr</span>`;
  if (!NAV_MODULE.includes(aktivId)) mehr.classList.add('aktiv');
  mehr.addEventListener('click', () => befehlsleiste.oeffne());
  tabLeiste.appendChild(mehr);
  rendereSeitenleiste(aktivId);
}

async function oeffneModul(modul) {
  modulTitel.textContent = modul.titel;
  kopfPfad.textContent = gruppeVon(modul.id);
  document.title = `${modul.titel} · Mein Dashboard`;
  rendereTabLeiste(modul.id);
  if (aktivesModulId !== modul.id) {
    aktivesModulId = modul.id;
    modulDetail.innerHTML = '';
    try {
      await modul.init(modulDetail);
      modulDetail.classList.remove('einblenden');
      void modulDetail.offsetWidth;
      modulDetail.classList.add('einblenden');
    } catch (e) {
      aktivesModulId = null;
      modulDetail.innerHTML = `<p class="lade">Fehler beim Laden: ${e.message}</p>`;
    }
  }
}

async function route() {
  const session = await holeSession();
  zeige(entscheideAnsicht(session));
  if (!session) return;
  starteGlocke().catch(() => { /* Glocke ist optional, die App läuft ohne sie weiter */ });
  seitenleiste.dataset.mail = session.user?.email || '';
  const { modul } = parseHash(location.hash);
  const gewaehlt = (modul ? holeModul(modul) : null) || holeModul('home');
  if (gewaehlt) await oeffneModul(gewaehlt);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = loginForm.querySelector('button');
  knopf.disabled = true;
  loginHinweis.textContent = 'Sende Link …';
  const { ok, fehler } = await sendeMagicLink(emailFeld.value.trim());
  loginHinweis.textContent = ok
    ? 'Link ist unterwegs. Schau in dein Postfach.'
    : `Fehler: ${fehler}`;
  knopf.disabled = false;
});

document.getElementById('passkey-login').addEventListener('click', async () => {
  loginHinweis.textContent = 'Passkey wird abgefragt …';
  const { ok, fehler } = await meldeAnMitPasskey();
  if (!ok) loginHinweis.textContent = `Fehler: ${fehler}`;
});

beiAuthWechsel(() => route());
window.addEventListener('hashchange', () => { route(); });

for (const knopf of themeKnoepfe) {
  knopf.addEventListener('click', () => aktualisiereThemeUI(wechsleTheme()));
}
aktualisiereThemeUI(wendeThemeAn());
wendeSchriftgroesseAn();

document.getElementById('neu-laden-global').addEventListener('click', async (e) => {
  const knopf = e.currentTarget;
  const modul = aktivesModulId ? holeModul(aktivesModulId) : null;
  if (!modul || typeof modul.aktualisieren !== 'function') return;
  knopf.disabled = true;
  try { await modul.aktualisieren(); }
  finally { knopf.disabled = false; }
});

const befehlsleiste = starteBefehlsleiste({
  holeEintraege: () => {
    const seiten = [];
    for (const g of NAV_GRUPPEN) {
      for (const id of g.ids) {
        const m = holeModul(id);
        if (m) seiten.push({ gruppe: 'Seiten', titel: m.titel, hinweis: g.titel, icon: ICONS[id], stichworte: id, aktion: () => { location.hash = `#/${id}`; } });
      }
    }
    for (const id of ['profil', 'einstellungen']) {
      const m = holeModul(id);
      if (m) seiten.push({ gruppe: 'Seiten', titel: m.titel, hinweis: 'System', icon: ICONS[id], stichworte: id, aktion: () => { location.hash = `#/${id}`; } });
    }
    const befehle = [
      { gruppe: 'Befehle', titel: 'Zwischen Hell und Dunkel wechseln', icon: ICONS.sonne, stichworte: 'theme design modus', aktion: () => document.getElementById('theme-toggle-dashboard').click() },
      { gruppe: 'Befehle', titel: 'Ansicht aktualisieren', icon: ICONS.neuladen, stichworte: 'neu laden refresh', aktion: () => document.getElementById('neu-laden-global').click() },
    ];
    return [...seiten, ...befehle];
  },
});
document.getElementById('palette-oeffnen').addEventListener('click', () => befehlsleiste.oeffne());
document.getElementById('palette-oeffnen-icon').addEventListener('click', () => befehlsleiste.oeffne());

route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Registrierung fehlgeschlagen (z.B. alter Browser) - kein Blocker, App läuft ohne Cache weiter.
    });
  });
}
