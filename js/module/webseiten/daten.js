// Liste aller Webseiten und Web-Apps von Mark (Quelle: Vercel-Projekte, Stand 2026-11-25).
// Neue Seite = Eintrag hier ergänzen (und Test laufen lassen). Gruppen: apps, kunden, weitere.

export const GRUPPEN = [
  { id: 'apps', titel: 'Apps und eigene Projekte' },
  { id: 'kunden', titel: 'Kunden- und Demo-Webseiten' },
  { id: 'weitere', titel: 'Weitere Vercel-Projekte (Zweck nicht dokumentiert)' },
];

export const WEBSEITEN = [
  { gruppe: 'apps', name: 'Dashboard', url: 'https://portal-start.vercel.app/dashboard', hinweis: 'Dieses Dashboard' },
  { gruppe: 'apps', name: 'Portal-Startseite', url: 'https://portal-start.vercel.app', hinweis: 'Gemeinsame Adresse für die Unterseiten' },
  { gruppe: 'apps', name: 'Mister X Jagd', url: 'https://mister-x-jagd.vercel.app', hinweis: 'Standortspiel' },
  { gruppe: 'apps', name: 'Tipptrainer', url: 'https://tipptrainer.vercel.app', hinweis: 'Tipptraining mit KI-Lektionen' },
  { gruppe: 'apps', name: 'Monteur-App', url: 'https://handwerker-app-indol.vercel.app', hinweis: 'Handwerker-App (Prototyp)' },
  { gruppe: 'apps', name: 'Döner Express', url: 'https://www.doenerexpress-lemgo.de', hinweis: 'Online-Bestellshop Lemgo' },
  { gruppe: 'apps', name: '3D Halle', url: 'https://3d-halle.vercel.app', hinweis: '3D-Demo' },

  { gruppe: 'kunden', name: 'Visiomedia', url: 'https://visiomedia-website.vercel.app', hinweis: 'Nicht indexiert' },
  { gruppe: 'kunden', name: 'Sportbodenbau Möller (3D)', url: 'https://sportbodenbau-moeller-3d.vercel.app', hinweis: '3D-Prototyp' },
  { gruppe: 'kunden', name: 'K und K', url: 'https://k-und-k-website.vercel.app' },
  { gruppe: 'kunden', name: 'Kunaus Gebäudeservice', url: 'https://kunaus-gebaeudeservice.vercel.app' },
  { gruppe: 'kunden', name: 'Premium Reinigung', url: 'https://premium-reinigung.vercel.app' },
  { gruppe: 'kunden', name: 'Hotel Lindenkrug – Demo 1', url: 'https://website-1-haus.vercel.app', hinweis: 'Akquise-Demo' },
  { gruppe: 'kunden', name: 'Hotel Lindenkrug – Demo 2 (Palace)', url: 'https://website-2-palace.vercel.app', hinweis: 'Akquise-Demo' },
  { gruppe: 'kunden', name: 'Berlin Döner Lage (Vorschau)', url: 'https://berlin-doener-lage-vorschau.vercel.app' },
  { gruppe: 'kunden', name: 'Berlin Döner Lage (Netlify)', url: 'https://berlin-doener-lage.netlify.app', hinweis: 'Alte Fassung' },

  { gruppe: 'weitere', name: 'Redeker Studium', url: 'https://redeker-studium.vercel.app' },
  { gruppe: 'weitere', name: 'Malerbetrieb Heinze', url: 'https://malerbetrieb-heinze-website.vercel.app' },
  { gruppe: 'weitere', name: 'Schneider Gartenwerk', url: 'https://schneider-gartenwerk.vercel.app' },
  { gruppe: 'weitere', name: 'Tischlerei Kosiek', url: 'https://tischlerei-kosiek.vercel.app' },
  { gruppe: 'weitere', name: 'Tobis Hausmeister (Redesign)', url: 'https://tobis-hausmeister-redesign.vercel.app' },
  { gruppe: 'weitere', name: 'Kotzolt Leuchten', url: 'https://kotzolt-leuchten-premium-design.vercel.app' },
  { gruppe: 'weitere', name: 'Inko GmbH', url: 'https://inko-gmbh.vercel.app' },
  { gruppe: 'weitere', name: '3020 Pizza Taxi', url: 'https://3020-pizza-taxi.vercel.app' },
  { gruppe: 'weitere', name: 'Musterseite wd-t06', url: 'https://wd-t06-musterseite.vercel.app' },
  { gruppe: 'weitere', name: 'Audio-Extractor', url: 'https://audio-extractor-seven.vercel.app' },
  { gruppe: 'weitere', name: 'Gelddaten', url: 'https://gelddaten.vercel.app' },
  { gruppe: 'weitere', name: 'Spotify von Mark', url: 'https://spotify-von-mark.vercel.app' },
];

// Nur http/https-Links werden angezeigt (nie javascript: o. Ä.).
export function istSichereUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function kurzeAdresse(url) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return String(url ?? '');
  }
}

// Filtert nach Suchtext (Name, Adresse, Hinweis) und gruppiert; leere Gruppen fallen weg.
export function gruppiere(liste = WEBSEITEN, suche = '') {
  const q = String(suche ?? '').trim().toLowerCase();
  const passt = (s) => !q || [s.name, s.url, s.hinweis].some((t) => String(t ?? '').toLowerCase().includes(q));
  return GRUPPEN
    .map((g) => ({ ...g, eintraege: liste.filter((s) => s.gruppe === g.id && istSichereUrl(s.url) && passt(s)) }))
    .filter((g) => g.eintraege.length > 0);
}
