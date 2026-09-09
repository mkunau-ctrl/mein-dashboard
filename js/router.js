// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung' -> { modul: 'ernaehrung' }; alles andere -> { modul: null }.
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)/.exec(hash || '');
  return { modul: m ? m[1] : null };
}
