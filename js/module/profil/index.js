import { registriere } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';
const USER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';
const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.1 0l2-2a5 5 0 00-7.1-7.1l-1 1"/><path d="M14 11a5 5 0 00-7.1 0l-2 2a5 5 0 007.1 7.1l1-1"/></svg>';
const FOLDER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/></svg>';
const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>';
const GEAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

const MENU = [
  { label: 'Persönliche Daten', icon: USER_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Konten & Verbindungen', icon: LINK_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Dokumente', icon: FOLDER_ICON, aktion: () => alert('Noch nicht verfügbar.') },
  { label: 'Berichtsheft', icon: DOC_ICON, aktion: () => { location.hash = '#/berichtsheft'; } },
  { label: 'App-Einstellungen', icon: GEAR_ICON, aktion: () => { location.hash = '#/einstellungen'; } },
];

registriere({
  id: 'profil',
  titel: 'Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    const email = session?.user?.email ?? '';
    const buchstabe = email ? email[0].toUpperCase() : '?';
    const name = email ? email.split('@')[0] : '–';
    container.innerHTML = `
      <header class="modul-kopf"><h2>Profil</h2></header>
      <div class="avatar">${esc(buchstabe)}</div>
      <p style="text-align:center;font-weight:700;margin:0;">${esc(name)}</p>
      <p style="text-align:center;color:var(--gedaempft);margin:2px 0 16px;">${esc(email) || '–'}</p>
      <div class="punkt-liste" id="profil-menu"></div>
      <button id="profil-abmelden" class="knopf-neutral" style="margin-top:16px;">Abmelden</button>`;

    const menu = container.querySelector('#profil-menu');
    MENU.forEach((item, i) => {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.style.cursor = 'pointer';
      zeile.innerHTML = `<div class="icon-badge">${item.icon}</div>
        <div class="punkt-info"><strong>${esc(item.label)}</strong></div>
        <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
      zeile.addEventListener('click', () => MENU[i].aktion());
      menu.appendChild(zeile);
    });

    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
