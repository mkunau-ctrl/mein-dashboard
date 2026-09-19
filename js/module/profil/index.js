import { registriere } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'profil',
  titel: 'Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    const email = session?.user?.email ?? '';
    const buchstabe = email ? email[0].toUpperCase() : '?';
    container.innerHTML = `
      <header class="modul-kopf"><h2>Profil</h2></header>
      <div class="avatar">${esc(buchstabe)}</div>
      <p style="text-align:center;">Angemeldet als <strong>${esc(email) || '–'}</strong></p>
      <p class="lade">Hell/Dunkel-Umschalter findest du oben rechts im Header.</p>
      <button id="profil-abmelden" class="knopf-neutral">Abmelden</button>`;
    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
