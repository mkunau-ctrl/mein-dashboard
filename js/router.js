// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung'                  -> { modul: 'ernaehrung', unterseite: null, detail: null }
// '#/ernaehrung/statistik'        -> { modul: 'ernaehrung', unterseite: 'statistik', detail: null }
// '#/sendungen/pakete/<id>'       -> { modul: 'sendungen', unterseite: 'pakete', detail: '<id>' }
// alles andere                    -> { modul: null, unterseite: null, detail: null }
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)(?:\/([a-z0-9-]+))?(?:\/([a-z0-9-]+))?/.exec(hash || '');
  return {
    modul: m ? m[1] : null,
    unterseite: m && m[2] ? m[2] : null,
    detail: m && m[3] ? m[3] : null,
  };
}
