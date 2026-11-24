// Einheitlicher Icon-Satz (Strichstärke 1.75, 24er-Raster) für Navigation und Befehlsleiste.
const k = (inner) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  home: k('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  woche: k('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 14h3"/>'),
  suche: k('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
  finanzen: k('<path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v2"/><path d="M3 7v11a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><path d="M16 14h2"/>'),
  rechnungen: k('<path d="M5 3v18l2-1.5L9 21l2-1.5 2 1.5 2-1.5 2 1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z"/><path d="M9 8h6M9 12h6"/>'),
  flipping: k('<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
  handyreparatur: k('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18h2"/>'),
  sendungen: k('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  todos: k('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m8 12.5 3 3 5-6"/>'),
  kalender: k('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>'),
  notizen: k('<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
  berichtsheft: k('<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>'),
  dateien: k('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  videos: k('<rect x="3" y="5" width="13" height="14" rx="2.5"/><path d="m16 10 5-3v10l-5-3z"/>'),
  projekte: k('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>'),
  ernaehrung: k('<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>'),
  einstellungen: k('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
  profil: k('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  mehr: k('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  sonne: k('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  neuladen: k('<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>'),
  ki: k('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
  marke: k('<path d="M5 20V12M12 20V5M19 20v-9"/>'),
};

// Gruppen der Seitenleiste: Titel und Seiten (Modul-IDs).
export const NAV_GRUPPEN = [
  { titel: 'Überblick', ids: ['home', 'woche', 'ki', 'suche'] },
  { titel: 'Geld', ids: ['finanzen', 'rechnungen'] },
  { titel: 'Handel', ids: ['flipping', 'handyreparatur', 'sendungen'] },
  { titel: 'Organisation', ids: ['todos', 'kalender', 'notizen', 'berichtsheft'] },
  { titel: 'Ablage', ids: ['dateien', 'videos', 'projekte'] },
  { titel: 'Leben', ids: ['ernaehrung'] },
];

export function gruppeVon(id) {
  const g = NAV_GRUPPEN.find((gr) => gr.ids.includes(id));
  if (g) return g.titel;
  return id === 'einstellungen' || id === 'profil' ? 'System' : '';
}
