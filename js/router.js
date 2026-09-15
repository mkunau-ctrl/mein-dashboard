// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung'            -> { modul: 'ernaehrung', unterseite: null }
// '#/ernaehrung/statistik'  -> { modul: 'ernaehrung', unterseite: 'statistik' }
// alles andere              -> { modul: null, unterseite: null }
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)(?:\/([a-z-]+))?/.exec(hash || '');
  return { modul: m ? m[1] : null, unterseite: m && m[2] ? m[2] : null };
}
