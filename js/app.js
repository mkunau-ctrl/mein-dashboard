import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, meldeAb, beiAuthWechsel } from './auth.js';
import { alleModule } from './registry.js';

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const kachelRaster = document.getElementById('kachel-raster');

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

async function aktualisiere() {
  const session = await holeSession();
  zeige(entscheideAnsicht(session));
  if (session) rendereKacheln();
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
  aktualisiere();
});

beiAuthWechsel(() => aktualisiere());
window.addEventListener('hashchange', () => { void parseHash(location.hash); });

aktualisiere();
