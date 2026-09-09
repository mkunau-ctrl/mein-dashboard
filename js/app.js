import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, meldeAb, beiAuthWechsel } from './auth.js';
import { alleModule, holeModul } from './registry.js';
import './module/ernaehrung/index.js';

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const kachelRaster = document.getElementById('kachel-raster');
const leerHinweis = document.getElementById('dashboard-leer-hinweis');
const modulDetail = document.getElementById('modul-detail');

let aktivesModulId = null;

function zeige(ansicht) {
  loginAnsicht.hidden = ansicht !== 'login';
  dashboardAnsicht.hidden = ansicht !== 'dashboard';
}

function rendereKacheln() {
  kachelRaster.innerHTML = '';
  for (const modul of alleModule()) {
    const kachel = document.createElement('button');
    kachel.className = 'kachel';
    kachel.textContent = modul.titel;
    kachel.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
    if (typeof modul.renderKachel === 'function') modul.renderKachel(kachel);
    kachelRaster.appendChild(kachel);
  }
}

function zeigeRaster() {
  aktivesModulId = null;
  modulDetail.hidden = true;
  modulDetail.innerHTML = '';
  kachelRaster.hidden = false;
  leerHinweis.hidden = kachelRaster.children.length > 0;
}

async function oeffneModul(modul) {
  kachelRaster.hidden = true;
  leerHinweis.hidden = true;
  modulDetail.hidden = false;
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
  rendereKacheln();
  const { modul } = parseHash(location.hash);
  const gewaehlt = modul ? holeModul(modul) : null;
  if (gewaehlt) await oeffneModul(gewaehlt);
  else zeigeRaster();
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

document.getElementById('logout').addEventListener('click', async () => {
  await meldeAb();
  location.hash = '';
  route();
});

beiAuthWechsel(() => route());
window.addEventListener('hashchange', () => { route(); });

route();
