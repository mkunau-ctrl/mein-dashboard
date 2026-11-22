// Kleine DOM-Helfer: alles, was aus Daten kommt, geht ausschliesslich ueber textContent.

export function el(tag, klasse, text) {
  const knoten = document.createElement(tag);
  if (klasse) knoten.className = klasse;
  if (text !== undefined && text !== null) knoten.textContent = String(text);
  return knoten;
}

export function karte(klasse) {
  return el('div', `ki-karte${klasse ? ` ${klasse}` : ''}`);
}

export function leer(text) {
  return el('p', 'ki-leer', text);
}

export function euro(wert) {
  const n = Number(wert);
  const sicher = Number.isFinite(n) ? n : 0;
  return `${sicher.toFixed(2).replace('.', ',')} €`;
}

const NAMEN = {
  ceo: 'CEO',
  orchestrator: 'Orchestrator',
  research: 'Research',
  developer: 'Developer',
  qa: 'QA',
  visual: 'Visual',
  memory: 'Memory',
  security: 'Security',
  monitor: 'Monitor',
};

export function agentName(agent) {
  if (!agent) return 'Unbekannt';
  if (NAMEN[agent]) return NAMEN[agent];
  return `${agent[0].toUpperCase()}${agent.slice(1)}`;
}

export function statusPunkt(info) {
  const zeile = el('span', 'ki-status');
  zeile.appendChild(el('span', `ki-dot ki-dot-${info.farbe}`));
  zeile.appendChild(el('span', null, info.text));
  return zeile;
}

export function pille(info) {
  return el('span', `ki-pille ki-pille-${info.farbe}`, `${info.symbol} ${info.text}`);
}

export function abschnitt(inhalt, titel, extra) {
  const kopf = el('div', 'section-head');
  kopf.appendChild(el('h2', null, titel));
  if (extra) kopf.appendChild(extra);
  inhalt.appendChild(kopf);
}

export function formHinweis(klasse) {
  return el('p', `ki-form-hinweis${klasse ? ` ${klasse}` : ''}`);
}

export function zeigeAufgabeDetails(ziel, aufgabe) {
  const details = el('div', 'ki-details');
  if (aufgabe.erfolgskriterium) {
    details.appendChild(el('p', 'ki-meta', `Erfolgskriterium: ${aufgabe.erfolgskriterium}`));
  }
  details.appendChild(el('p', 'ki-meta', `Eingabe:`));
  details.appendChild(el('pre', 'ki-details-text', aufgabe.eingabe || '—'));
  if (aufgabe.ergebnis) {
    details.appendChild(el('p', 'ki-meta', 'Ergebnis:'));
    details.appendChild(el('pre', 'ki-ergebnis', aufgabe.ergebnis));
  }
  details.appendChild(el('p', 'ki-meta', `Kosten: ${euro(aufgabe.kosten_eur)}`));
  ziel.appendChild(details);
}
