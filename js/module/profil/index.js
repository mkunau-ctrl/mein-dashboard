import { registriere, holeModul } from '../../registry.js';
import { holeSession, meldeAb } from '../../auth.js';
import { ICONS, NAV_GRUPPEN } from '../../icons.js';

const PROFIL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';
const CHEVRON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'profil',
  titel: 'Mein Profil',
  icon: PROFIL_ICON,
  async init(container) {
    const session = await holeSession();
    const email = session?.user?.email ?? '';
    const buchstabe = email ? email[0].toUpperCase() : '?';
    const name = email ? email.split('@')[0] : '–';
    container.innerHTML = `
      <div class="avatar">${esc(buchstabe)}</div>
      <p style="text-align:center;font-weight:700;margin:0;">${esc(name)}</p>
      <p style="text-align:center;color:var(--gedaempft);margin:2px 0 16px;">${esc(email) || '–'}</p>
      <div id="profil-bereiche"></div>
      <div class="section-head"><h2>System</h2></div>
      <div class="punkt-liste" id="profil-system"></div>
      <button id="profil-abmelden" class="knopf-neutral" style="margin-top:16px;">Abmelden</button>`;

    // Alle Bereiche der App, gruppiert wie in der Seitenleiste (nur registrierte Module)
    const zeile = (id, titel, icon) => {
      const z = document.createElement('div');
      z.className = 'punkt-zeile';
      z.style.cursor = 'pointer';
      z.innerHTML = `<div class="icon-badge">${icon}</div>
        <div class="punkt-info"><strong>${esc(titel)}</strong></div>
        <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
      z.addEventListener('click', () => { location.hash = `#/${id}`; });
      return z;
    };
    const bereiche = container.querySelector('#profil-bereiche');
    for (const gruppe of NAV_GRUPPEN) {
      const module = gruppe.ids.map((id) => holeModul(id)).filter(Boolean);
      if (!module.length) continue;
      const kopf = document.createElement('div');
      kopf.className = 'section-head';
      kopf.innerHTML = `<h2>${esc(gruppe.titel)}</h2>`;
      const liste = document.createElement('div');
      liste.className = 'punkt-liste';
      module.forEach((m) => liste.appendChild(zeile(m.id, m.titel, ICONS[m.id] || m.icon || '')));
      bereiche.append(kopf, liste);
    }
    const system = container.querySelector('#profil-system');
    const einst = holeModul('einstellungen');
    if (einst) system.appendChild(zeile('einstellungen', einst.titel, ICONS.einstellungen));

    container.querySelector('#profil-abmelden').addEventListener('click', async () => {
      await meldeAb();
      location.hash = '';
    });
  },
});
