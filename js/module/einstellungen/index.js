import { registriere } from '../../registry.js';
import { registrierePasskey } from '../../auth.js';
import { aufgeloestesTheme, wechsleTheme } from '../../theme.js';
import { aktuelleSchriftgroesse, setzeSchriftgroesse } from './schriftgroesse.js';
import { sammleAlleDaten, ladeAlsDatei } from './export.js';

function baueAbschnitt(titel) {
  const h = document.createElement('div');
  h.className = 'settings-label';
  h.textContent = titel;
  return h;
}

export function zeigeEinstellungen(container) {
  container.innerHTML = `
    <div class="modul-kopf">
      <button id="ein-zurueck" type="button">‹ Profil</button>
    </div>`;
  container.querySelector('#ein-zurueck').addEventListener('click', () => { location.hash = '#/profil'; });

  container.appendChild(baueAbschnitt('Darstellung'));
  const darstellung = document.createElement('div');
  darstellung.className = 'punkt-liste';
  const dunkelAktiv = aufgeloestesTheme() === 'dark';
  darstellung.innerHTML = `
    <div class="settings-row"><span class="row-title">Dark Mode</span>
      <div class="switch${dunkelAktiv ? ' on' : ''}" id="ein-dark-mode"></div></div>
    <div class="settings-row"><span class="row-title">Schriftgröße</span>
      <select id="ein-schriftgroesse">
        <option value="klein">Klein</option>
        <option value="normal">Normal</option>
        <option value="gross">Groß</option>
      </select></div>
    <div class="settings-row"><span class="row-title">Push-Benachrichtigungen</span>
      <div class="switch on" data-deko-switch></div></div>
    <div class="settings-row"><span class="row-title">E-Mail-Benachrichtigungen</span>
      <div class="switch" data-deko-switch></div></div>`;
  container.appendChild(darstellung);
  darstellung.querySelector('#ein-dark-mode').addEventListener('click', (e) => {
    const istDunkel = wechsleTheme() === 'dark';
    e.currentTarget.classList.toggle('on', istDunkel);
  });
  const auswahl = darstellung.querySelector('#ein-schriftgroesse');
  auswahl.value = aktuelleSchriftgroesse();
  auswahl.addEventListener('change', () => setzeSchriftgroesse(auswahl.value));
  darstellung.querySelectorAll('[data-deko-switch]').forEach((sw) => {
    sw.addEventListener('click', () => sw.classList.toggle('on'));
  });

  container.appendChild(baueAbschnitt('Verbundene Dienste'));
  const dienste = document.createElement('div');
  dienste.className = 'punkt-liste';
  dienste.innerHTML = `
    <div class="settings-row"><span class="row-title">Bankkonto</span><span class="row-sub">nicht verbunden</span></div>
    <div class="settings-row"><span class="row-title">Google Drive</span><span class="row-sub">nicht verbunden</span></div>`;
  container.appendChild(dienste);

  container.appendChild(baueAbschnitt('Sicherheit'));
  const sicherheit = document.createElement('div');
  sicherheit.className = 'punkt-liste';
  sicherheit.innerHTML = `
    <div class="settings-row"><span class="row-title">Passkey</span>
      <button id="ein-passkey" class="knopf-neutral" style="width:auto;">Einrichten</button></div>`;
  container.appendChild(sicherheit);
  container.querySelector('#ein-passkey').addEventListener('click', async (e) => {
    const knopf = e.currentTarget;
    knopf.disabled = true;
    knopf.textContent = 'Wird eingerichtet …';
    const { ok, fehler } = await registrierePasskey();
    knopf.textContent = ok ? 'Eingerichtet' : 'Einrichten';
    knopf.disabled = ok;
    if (!ok) alert(`Fehler: ${fehler}`);
  });

  container.appendChild(baueAbschnitt('App'));
  const app = document.createElement('div');
  app.className = 'punkt-liste';
  app.innerHTML = `
    <div class="settings-row"><span class="row-title">Alle Daten exportieren</span>
      <button id="ein-export" class="knopf-neutral" style="width:auto;">Herunterladen</button></div>
    <div class="settings-row"><span class="row-title">Version</span><span class="row-sub">1.0.0</span></div>`;
  container.appendChild(app);
  container.querySelector('#ein-export').addEventListener('click', async (e) => {
    const knopf = e.currentTarget;
    knopf.disabled = true;
    knopf.textContent = 'Sammle Daten …';
    try {
      const daten = await sammleAlleDaten();
      ladeAlsDatei(daten);
    } catch (err) { alert(err.message); }
    knopf.disabled = false;
    knopf.textContent = 'Herunterladen';
  });
}

registriere({
  id: 'einstellungen',
  titel: 'Einstellungen',
  async init(container) {
    zeigeEinstellungen(container);
  },
});
