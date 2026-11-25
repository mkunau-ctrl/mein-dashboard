// Liste aller Webseiten und Web-Apps von Mark (Quelle: Vercel-Projekte, Stand 2026-11-25).
// Neue Seite = Eintrag hier ergänzen (und Test laufen lassen). Gruppen: apps, vorschauen, kunden, weitere.
// `unterseiten`: weitere Seiten derselben Webseite, `pfad` relativ zur Hauptadresse.
// Die eingetragenen Unterseiten wurden am 2026-11-25 live geprüft (Antwort 200).
// Flags: zeigen:false = nicht in der Vorführung (/zeigen/); rahmen:false = Seite verbietet Einbettung (öffnet in neuem Tab);
// login:true = nur mit Vercel-Anmeldung sichtbar.

export const GRUPPEN = [
  { id: 'apps', titel: 'Apps und eigene Projekte' },
  { id: 'vorschauen', titel: 'Vorschauen und Design-Varianten' },
  { id: 'kunden', titel: 'Kunden- und Demo-Webseiten' },
  { id: 'weitere', titel: 'Weitere Vercel-Projekte (Zweck nicht dokumentiert)' },
];

export const WEBSEITEN = [
  { gruppe: 'apps', name: 'Dashboard', url: 'https://portal-start.vercel.app/dashboard', hinweis: 'Dieses Dashboard', zeigen: false },
  { gruppe: 'apps', name: 'Portal-Startseite', url: 'https://portal-start.vercel.app', hinweis: 'Gemeinsame Adresse für die Unterseiten', zeigen: false },
  { gruppe: 'apps', name: 'Ranglisten', url: 'https://portal-start.vercel.app/ranglisten/', hinweis: 'Armwrestling-Rangliste' },
  { gruppe: 'apps', name: 'Mister X Jagd', url: 'https://mister-x-jagd.vercel.app', hinweis: 'Standortspiel' },
  { gruppe: 'apps', name: 'Tipptrainer', url: 'https://tipptrainer.vercel.app', hinweis: 'Tipptraining mit KI-Lektionen' },
  { gruppe: 'apps', name: 'Monteur-App', url: 'https://handwerker-app-indol.vercel.app', hinweis: 'Handwerker-App (Prototyp)' },
  {
    gruppe: 'apps',
    name: 'Döner Express',
    url: 'https://www.doenerexpress-lemgo.de',
    hinweis: 'Online-Bestellshop Lemgo',
    unterseiten: [
      { name: 'Speisekarte', pfad: '/speisekarte.html' },
      { name: 'Warenkorb', pfad: '/warenkorb.html', zeigen: false },
      { name: 'Kasse', pfad: '/checkout.html', zeigen: false },
      { name: 'Bestellverfolgung', pfad: '/tracker.html', zeigen: false },
      { name: 'Kontakt', pfad: '/kontakt.html' },
      { name: 'Über uns', pfad: '/ueber-uns.html' },
      { name: 'Bondrucker', pfad: '/drucker.html', zeigen: false },
      { name: 'Admin', pfad: '/admin.html', zeigen: false },
      { name: 'Admin: Kunden', pfad: '/admin-customers.html', zeigen: false },
      { name: 'Admin: Rabatte', pfad: '/admin-discounts.html', zeigen: false },
      { name: 'Admin: Speisekarte', pfad: '/admin-menu.html', zeigen: false },
      { name: 'Admin: Einstellungen', pfad: '/admin-settings.html', zeigen: false },
      { name: 'Admin: Statistik', pfad: '/admin-stats.html', zeigen: false },
    ],
  },
  { gruppe: 'apps', name: '3D Halle', url: 'https://3d-halle.vercel.app', hinweis: '3D-Demo' },

  { gruppe: 'vorschauen', name: 'Visiomedia – Vorschau (Übersicht)', url: 'https://visiomedia-website.vercel.app/vorschau.html', hinweis: 'Alle drei Varianten' },
  { gruppe: 'vorschauen', name: 'Visiomedia – A: Kinosaal', url: 'https://visiomedia-website.vercel.app/vorschau-a-kinosaal.html', hinweis: '3D-Einstieg' },
  { gruppe: 'vorschauen', name: 'Visiomedia – B: Filmstreifen', url: 'https://visiomedia-website.vercel.app/vorschau-b-filmstreifen.html', hinweis: '3D-Einstieg' },
  { gruppe: 'vorschauen', name: 'Visiomedia – C: Szenen', url: 'https://visiomedia-website.vercel.app/vorschau-c-szenen.html', hinweis: '3D-Einstieg' },
  { gruppe: 'vorschauen', name: 'K und K – Hero Propeller', url: 'https://k-und-k-website-git-hero-propeller-mkunau-ctrls-projects.vercel.app', hinweis: 'Branch-Vorschau, Vercel-Anmeldung nötig', login: true },
  { gruppe: 'vorschauen', name: 'K und K – Hero Orthese', url: 'https://k-und-k-website-git-hero-orthese-mkunau-ctrls-projects.vercel.app', hinweis: 'Branch-Vorschau, Vercel-Anmeldung nötig', login: true },
  { gruppe: 'vorschauen', name: 'K und K – Hero Lampe', url: 'https://k-und-k-website-git-hero-lampe-mkunau-ctrls-projects.vercel.app', hinweis: 'Branch-Vorschau, Vercel-Anmeldung nötig', login: true },
  { gruppe: 'vorschauen', name: 'K und K – Hero 3D-Tür', url: 'https://k-und-k-website-git-hero-3d-tuer-mkunau-ctrls-projects.vercel.app', hinweis: 'Branch-Vorschau, Vercel-Anmeldung nötig', login: true },
  { gruppe: 'vorschauen', name: 'K und K – Entwurf funny', url: 'https://k-und-k-website-git-claude-funny-f-baefae-mkunau-ctrls-projects.vercel.app', hinweis: 'Claude-Branch, Inhalt nicht geprüft, Anmeldung nötig', login: true },
  { gruppe: 'vorschauen', name: 'K und K – Entwurf vibrant', url: 'https://k-und-k-website-git-claude-vibrant-5126e0-mkunau-ctrls-projects.vercel.app', hinweis: 'Claude-Branch, Inhalt nicht geprüft, Anmeldung nötig', login: true },
  {
    gruppe: 'kunden',
    name: 'Visiomedia',
    url: 'https://visiomedia-website.vercel.app',
    hinweis: 'Nicht indexiert',
    unterseiten: [
      { name: 'Projekt: David vs Goliath', pfad: '/projekte/david-vs-goliath.html' },
      { name: 'Projekt: DB Schule', pfad: '/projekte/db-schule.html' },
      { name: 'Projekt: E2EMON', pfad: '/projekte/e2emon.html' },
      { name: 'Projekt: Endless Engines', pfad: '/projekte/endless-engines.html' },
      { name: 'Projekt: Falk Maschinenbau', pfad: '/projekte/falk-maschinenbau.html' },
      { name: 'Projekt: Gameshow', pfad: '/projekte/gameshow.html' },
      { name: 'Projekt: Latin Link', pfad: '/projekte/latin-link.html' },
      { name: 'Projekt: Liveshow', pfad: '/projekte/liveshow.html' },
      { name: 'Projekt: Mutterhaus Altvansburg', pfad: '/projekte/mutterhaus-altvansburg.html' },
      { name: 'Projekt: Neue Welt', pfad: '/projekte/neue-welt.html' },
      { name: 'Projekt: Quibic', pfad: '/projekte/quibic.html' },
      { name: 'Projekt: Taoasis', pfad: '/projekte/taoasis.html' },
      { name: 'Projekt: Volles Leben', pfad: '/projekte/volles-leben.html' },
    ],
  },
  { gruppe: 'kunden', name: 'Sportbodenbau Möller (3D)', url: 'https://sportbodenbau-moeller-3d.vercel.app', hinweis: '3D-Prototyp', login: true, rahmen: false },
  { gruppe: 'kunden', name: 'K und K', url: 'https://k-und-k-website.vercel.app' },
  {
    gruppe: 'kunden',
    name: 'Kunaus Gebäudeservice',
    url: 'https://kunaus-gebaeudeservice.vercel.app',
    unterseiten: [
      { name: 'Leistungen', pfad: '/leistungen.html' },
      { name: 'Über uns', pfad: '/ueber-uns.html' },
      { name: 'Kontakt', pfad: '/kontakt.html' },
    ],
  },
  { gruppe: 'kunden', name: 'Premium Reinigung', url: 'https://premium-reinigung.vercel.app' },
  { gruppe: 'kunden', name: 'Hotel Lindenkrug – Demo 1', url: 'https://website-1-haus.vercel.app', hinweis: 'Akquise-Demo' },
  {
    gruppe: 'kunden',
    name: 'Hotel Lindenkrug – Demo 2 (Palace)',
    url: 'https://website-2-palace.vercel.app',
    hinweis: 'Akquise-Demo',
    unterseiten: [
      { name: 'Zimmer', pfad: '/zimmer.html' },
      { name: 'Speisekarte', pfad: '/speisekarte.html' },
      { name: 'Feiern', pfad: '/feiern.html' },
      { name: 'Lieferservice', pfad: '/lieferservice.html' },
      { name: 'Kontakt', pfad: '/kontakt.html' },
    ],
  },
  { gruppe: 'kunden', name: 'Berlin Döner Lage (Vorschau)', url: 'https://berlin-doener-lage-vorschau.vercel.app' },
  { gruppe: 'kunden', name: 'Berlin Döner Lage (Netlify)', url: 'https://berlin-doener-lage.netlify.app', hinweis: 'Alte Fassung' },

  { gruppe: 'weitere', name: 'Redeker Studium', url: 'https://redeker-studium.vercel.app' },
  { gruppe: 'weitere', name: 'Malerbetrieb Heinze', url: 'https://malerbetrieb-heinze-website.vercel.app' },
  { gruppe: 'weitere', name: 'Schneider Gartenwerk', url: 'https://schneider-gartenwerk.vercel.app', rahmen: false },
  {
    gruppe: 'weitere',
    name: 'Tischlerei Kosiek',
    url: 'https://tischlerei-kosiek.vercel.app',
    unterseiten: [
      { name: 'Leistungen', pfad: '/leistungen.html' },
      { name: 'Galerie', pfad: '/galerie.html' },
      { name: 'Über uns', pfad: '/ueber-uns.html' },
      { name: 'Kontakt', pfad: '/kontakt.html' },
    ],
  },
  {
    gruppe: 'weitere',
    name: 'Tobis Hausmeister (Redesign)',
    url: 'https://tobis-hausmeister-redesign.vercel.app',
    unterseiten: [
      { name: 'Leistungen', pfad: '/leistungen.html' },
      { name: 'Meister', pfad: '/meister.html' },
      { name: 'Referenzen', pfad: '/referenzen.html' },
      { name: 'Kontakt', pfad: '/kontakt.html' },
    ],
  },
  { gruppe: 'weitere', name: 'Kotzolt Leuchten', url: 'https://kotzolt-leuchten-premium-design.vercel.app', rahmen: false },
  { gruppe: 'weitere', name: 'Inko GmbH', url: 'https://inko-gmbh.vercel.app' },
  { gruppe: 'weitere', name: '3020 Pizza Taxi', url: 'https://3020-pizza-taxi.vercel.app' },
  { gruppe: 'weitere', name: 'Musterseite wd-t06', url: 'https://wd-t06-musterseite.vercel.app', rahmen: false },
  { gruppe: 'weitere', name: 'Audio-Extractor', url: 'https://audio-extractor-seven.vercel.app' },
  { gruppe: 'weitere', name: 'Gelddaten', url: 'https://gelddaten.vercel.app', zeigen: false },
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

// Volle Adresse einer Unterseite; gleicher Host wie die Hauptadresse, sonst null.
export function unterseitenUrl(hauptUrl, pfad) {
  try {
    const haupt = new URL(hauptUrl);
    const ziel = new URL(String(pfad ?? ''), `${haupt.origin}/`);
    if (ziel.origin !== haupt.origin) return null;
    return ziel.href;
  } catch {
    return null;
  }
}

function sichereUnterseiten(s) {
  return (s.unterseiten ?? [])
    .map((u) => ({ name: u.name, url: unterseitenUrl(s.url, u.pfad) }))
    .filter((u) => u.url && istSichereUrl(u.url));
}

// Filtert nach Suchtext (Name, Adresse, Hinweis, Unterseiten) und gruppiert; leere Gruppen fallen weg.
// Passt nur eine Unterseite, erscheint die Webseite mit genau den passenden Unterseiten.
export function gruppiere(liste = WEBSEITEN, suche = '') {
  const q = String(suche ?? '').trim().toLowerCase();
  const enthaelt = (...teile) => teile.some((t) => String(t ?? '').toLowerCase().includes(q));
  const ergebnis = (g) => {
    const eintraege = [];
    for (const s of liste) {
      if (s.gruppe !== g.id || !istSichereUrl(s.url)) continue;
      const alle = sichereUnterseiten(s);
      if (!q || enthaelt(s.name, s.url, s.hinweis)) {
        eintraege.push({ ...s, unterseiten: alle });
        continue;
      }
      const treffer = alle.filter((u) => enthaelt(u.name, u.url));
      if (treffer.length) eintraege.push({ ...s, unterseiten: treffer });
    }
    return { ...g, eintraege };
  };
  return GRUPPEN.map(ergebnis).filter((g) => g.eintraege.length > 0);
}

// Auswahl für die Vorführungsseite (/zeigen/): Dropdown-Gruppen mit Webseiten und deren Unterseiten.
// Nur http/https; Seiten mit zeigen:false fehlen; rahmen/login werden für die Anzeige weitergereicht.
export function praesentation(liste = WEBSEITEN) {
  return GRUPPEN.map((g) => {
    const optionen = [];
    for (const s of liste) {
      if (s.gruppe !== g.id || s.zeigen === false || !istSichereUrl(s.url)) continue;
      const basis = { rahmen: s.rahmen !== false, login: s.login === true };
      optionen.push({ label: s.name, url: s.url, ...basis });
      for (const u of s.unterseiten ?? []) {
        const voll = unterseitenUrl(s.url, u.pfad);
        if (u.zeigen === false || !voll || !istSichereUrl(voll)) continue;
        optionen.push({ label: `${s.name} › ${u.name}`, url: voll, ...basis });
      }
    }
    return { id: g.id, titel: g.titel, optionen };
  }).filter((g) => g.optionen.length > 0);
}