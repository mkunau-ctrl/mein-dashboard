import { registriere } from '../../registry.js';
import { gruppiere, kurzeAdresse } from './daten.js';

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

function externerLink(url, klasse) {
  const a = el('a', klasse);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function zeichneUnterseiten(eintrag, suche) {
  const details = el('details', 'web-unterseiten');
  details.open = Boolean(suche); // bei aktiver Suche gleich aufgeklappt
  details.style.marginLeft = '54px';
  details.appendChild(el('summary', 'lade', `Unterseiten (${eintrag.unterseiten.length})`));
  const liste = el('div');
  liste.style.display = 'flex';
  liste.style.flexDirection = 'column';
  liste.style.gap = '6px';
  liste.style.padding = '8px 0 2px';
  for (const u of eintrag.unterseiten) {
    const a = externerLink(u.url, 'web-unterseite');
    a.textContent = u.name;
    a.title = kurzeAdresse(u.url);
    a.style.color = 'inherit';
    liste.appendChild(a);
  }
  details.appendChild(liste);
  return details;
}

function zeichneListe(ziel, suche) {
  ziel.replaceChildren();
  const gruppen = gruppiere(undefined, suche);
  if (gruppen.length === 0) {
    ziel.appendChild(el('p', 'lade', 'Keine Webseite gefunden.'));
    return;
  }
  for (const gruppe of gruppen) {
    const kopf = el('div', 'section-head');
    kopf.appendChild(el('h2', null, gruppe.titel));
    kopf.appendChild(el('span', 'lade', String(gruppe.eintraege.length)));
    ziel.appendChild(kopf);

    const liste = el('div', 'punkt-liste');
    for (const s of gruppe.eintraege) {
      const block = el('div', 'punkt-zeile');
      block.style.flexDirection = 'column';
      block.style.alignItems = 'stretch';
      block.style.gap = '8px';

      const zeile = externerLink(s.url, 'web-link');
      zeile.style.display = 'flex';
      zeile.style.alignItems = 'center';
      zeile.style.gap = '14px';
      zeile.style.textDecoration = 'none';
      zeile.style.color = 'inherit';

      const badge = el('div', 'icon-badge');
      badge.innerHTML = LINK_ICON; // feste Konstante, keine Nutzerdaten
      zeile.appendChild(badge);

      const info = el('div', 'punkt-info');
      info.appendChild(el('strong', null, s.name));
      info.appendChild(el('small', null, s.hinweis ? `${kurzeAdresse(s.url)} · ${s.hinweis}` : kurzeAdresse(s.url)));
      zeile.appendChild(info);
      block.appendChild(zeile);

      if (s.unterseiten && s.unterseiten.length > 0) block.appendChild(zeichneUnterseiten(s, suche));
      liste.appendChild(block);
    }
    ziel.appendChild(liste);
  }
}

registriere({
  id: 'webseiten',
  titel: 'Webseiten',
  async init(container) {
    container.replaceChildren();

    const kopf = el('div', 'modul-kopf');
    const zurueck = el('button', null, '‹ Zurück');
    zurueck.type = 'button';
    zurueck.addEventListener('click', () => { history.back(); });
    kopf.appendChild(zurueck);
    const zeigen = el('a', 'knopf-neutral', 'Zum Zeigen öffnen ›');
    zeigen.href = '../zeigen/'; // Vorführungsseite ohne Anmeldung (Dropdown)
    zeigen.target = '_blank';
    zeigen.rel = 'noopener noreferrer';
    zeigen.style.marginLeft = 'auto';
    zeigen.style.textDecoration = 'none';
    kopf.appendChild(zeigen);
    container.appendChild(kopf);

    const suchfeld = document.createElement('input');
    suchfeld.type = 'search';
    suchfeld.placeholder = 'Webseite oder Unterseite suchen …';
    suchfeld.setAttribute('aria-label', 'Webseite oder Unterseite suchen');
    suchfeld.style.width = '100%';
    suchfeld.style.marginBottom = '12px';
    container.appendChild(suchfeld);

    const ziel = el('div');
    container.appendChild(ziel);

    zeichneListe(ziel, '');
    suchfeld.addEventListener('input', () => zeichneListe(ziel, suchfeld.value));
  },
});
