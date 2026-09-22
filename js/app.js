import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, beiAuthWechsel,
         meldeAnMitPasskey } from './auth.js';
import { holeModul } from './registry.js';
import { wendeThemeAn, wechsleTheme } from './theme.js';
import { wendeSchriftgroesseAn } from './module/einstellungen/schriftgroesse.js';
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

const NAV_MODULE = ['home', 'finanzen', 'berichtsheft', 'suche', 'profil'];

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const modulTitel = document.getElementById('modul-titel');
const modulDetail = document.getElementById('modul-detail');
const tabLeiste = document.getElementById('tab-leiste-unten');
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

function rendereTabLeiste(aktivId) {
  tabLeiste.innerHTML = '';
  for (const modulId of NAV_MODULE) {
    const modul = holeModul(modulId);
    if (!modul) continue;
    const tab = document.createElement('button');
    tab.className = modul.id === aktivId ? 'aktiv' : '';
    tab.innerHTML = `${modul.icon || ''}<span>${modul.titel}</span>`;
    tab.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
    tabLeiste.appendChild(tab);
  }
}

async function oeffneModul(modul) {
  modulTitel.textContent = modul.titel;
  rendereTabLeiste(modul.id);
  if (aktivesModulId !== modul.id) {
    aktivesModulId = modul.id;
    modulDetail.innerHTML = '';
    try {
      await modul.init(modulDetail);
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

route();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Registrierung fehlgeschlagen (z.B. alter Browser) - kein Blocker, App läuft ohne Cache weiter.
    });
  });
}
