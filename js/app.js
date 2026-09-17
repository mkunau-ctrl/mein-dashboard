import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, meldeAb, beiAuthWechsel,
         meldeAnMitPasskey, registrierePasskey } from './auth.js';
import { alleModule, holeModul } from './registry.js';
import './module/ernaehrung/index.js';
import './module/todos/index.js';
import './module/finanzen/index.js';
import './module/lager/index.js';
import './module/berichtsheft/index.js';

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const modulTitel = document.getElementById('modul-titel');
const modulDetail = document.getElementById('modul-detail');
const tabLeiste = document.getElementById('tab-leiste-unten');

let aktivesModulId = null;

function zeige(ansicht) {
  loginAnsicht.hidden = ansicht !== 'login';
  dashboardAnsicht.hidden = ansicht !== 'dashboard';
}

function rendereTabLeiste(aktivId) {
  tabLeiste.innerHTML = '';
  for (const modul of alleModule()) {
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
    await modul.init(modulDetail);
  }
}

async function route() {
  const session = await holeSession();
  zeige(entscheideAnsicht(session));
  if (!session) return;
  const { modul } = parseHash(location.hash);
  const gewaehlt = (modul ? holeModul(modul) : null) || alleModule()[0];
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

document.getElementById('passkey-registrieren').addEventListener('click', async (e) => {
  const knopf = e.currentTarget;
  const text = knopf.textContent;
  knopf.disabled = true;
  const { ok, fehler } = await registrierePasskey();
  knopf.textContent = ok ? 'Passkey gespeichert' : `Fehler: ${fehler}`;
  setTimeout(() => { knopf.textContent = text; knopf.disabled = false; }, 2500);
});

document.getElementById('logout').addEventListener('click', async () => {
  await meldeAb();
  location.hash = '';
  route();
});

beiAuthWechsel(() => route());
window.addEventListener('hashchange', () => { route(); });

route();
