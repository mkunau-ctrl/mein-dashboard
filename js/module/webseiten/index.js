import { registriere } from '../../registry.js';
import { gruppiere, kurzeAdresse } from './daten.js';

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text !== undefined && text !== null) e.textContent = String(text);
  return e;
}

const LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

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
      const zeile = el('a', 'punkt-zeile');
      zeile.href = s.url;
      zeile.target = '_blank';
      zeile.rel = 'noopener noreferrer';
      zeile.style.textDecoration = 'none';
      zeile.style.color = 'inherit';

      const badge = el('div', 'icon-badge');
      badge.innerHTML = LINK_ICON; // feste Konstante, keine Nutzerdaten
      zeile.appendChild(badge);

      const info = el('div', 'punkt-info');
      info.appendChild(el('strong', null, s.name));
      info.appendChild(el('small', null, s.hinweis ? `${kurzeAdresse(s.url)} · ${s.hinweis}` : kurzeAdresse(s.url)));
      zeile.appendChild(info);
      liste.appendChild(zeile);
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
    container.appendChild(kopf);

    const suchfeld = document.createElement('input');
    suchfeld.type = 'search';
    suchfeld.placeholder = 'Webseite suchen …';
    suchfeld.setAttribute('aria-label', 'Webseite suchen');
    suchfeld.style.width = '100%';
    suchfeld.style.marginBottom = '12px';
    container.appendChild(suchfeld);

    const ziel = el('div');
    container.appendChild(ziel);

    zeichneListe(ziel, '');
    suchfeld.addEventListener('input', () => zeichneListe(ziel, suchfeld.value));
  },
});
