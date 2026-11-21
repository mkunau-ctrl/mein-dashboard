import { budgetInfo } from './budget.js';
import {
  AGENTEN, CHAT_AGENTEN, istOffline, vorZeit, statusInfo, kuerze,
} from './status.js';
import {
  el, karte, leer, euro, agentName, statusPunkt, pille, formHinweis,
} from './helfer.js';

function budgetKarte(status) {
  const info = budgetInfo(status);
  const box = karte('ki-budget');

  const kopf = el('div', 'section-head');
  kopf.appendChild(el('h2', null, 'Budget'));
  kopf.appendChild(pille({ text: info.stufeText, farbe: info.farbe, symbol: '●' }));
  box.appendChild(kopf);

  if (info.killSwitchHinweis) {
    box.appendChild(el('p', 'ki-warnband', info.killSwitchHinweis));
  }

  if (!status) {
    box.appendChild(leer('AURORA ist nicht verbunden. Sobald AURORA Status schreibt, erscheint hier das Budget.'));
    return box;
  }

  const zahlen = el('div', 'ki-zahlen');
  const block = (beschriftung, wert, klasse) => {
    const b = el('div', klasse || '');
    b.appendChild(el('span', 'ki-meta', beschriftung));
    b.appendChild(el('span', 'ki-zahl', wert));
    return b;
  };
  zahlen.appendChild(block('verbraucht', euro(info.verbraucht)));
  zahlen.appendChild(block('Limit', euro(info.limit)));
  zahlen.appendChild(block('Rest', euro(info.rest)));
  box.appendChild(zahlen);

  const balken = el('div', 'ki-balken');
  const fuellung = el('div', `ki-balken-fuellung ki-bg-${info.farbe}`);
  fuellung.style.width = `${info.prozent}%`;
  balken.appendChild(fuellung);
  box.appendChild(balken);
  box.appendChild(el('p', 'ki-meta', `${info.prozent} % des Budgets verbraucht`));

  if (istOffline(status.aktualisiert_am)) {
    box.appendChild(el('p', 'ki-offline',
      `AURORA offline · zuletzt gesehen vor ${vorZeit(status.aktualisiert_am)}`));
  }
  return box;
}

function gesundheitsWert(wert) {
  if (wert === undefined || wert === null || wert === '') {
    return { text: 'unbekannt', farbe: 'grau' };
  }
  if (wert === true) return { text: 'OK', farbe: 'gruen' };
  if (wert === false) return { text: 'Fehler', farbe: 'rot' };
  const text = String(wert);
  const klein = text.toLowerCase();
  if (['ok', 'bereit', 'gut', 'true', 'healthy'].includes(klein)) return { text: 'OK', farbe: 'gruen' };
  if (['fehler', 'error', 'false', 'rot', 'down'].includes(klein)) return { text: 'Fehler', farbe: 'rot' };
  return { text, farbe: 'gelb' };
}

function gesundheitKarte(status) {
  const box = karte();
  box.appendChild(el('h2', 'ki-abschnitt', 'Gesundheit'));
  if (!status) {
    box.appendChild(leer('Keine Gesundheitsdaten.'));
    return box;
  }
  const gesundheit = status.gesundheit && typeof status.gesundheit === 'object'
    ? status.gesundheit : {};
  const felder = [
    ['Worker', gesundheit.worker ?? gesundheit.Worker ?? gesundheit.worker_status],
    ['Sandbox', gesundheit.sandbox ?? gesundheit.Sandbox ?? gesundheit.sandbox_status],
    ['Modell', gesundheit.modell ?? gesundheit.Modell ?? gesundheit.model ?? gesundheit.model_status],
  ];
  const liste = el('div', 'ki-gesundheit');
  for (const [label, wert] of felder) {
    const info = gesundheitsWert(wert);
    const zeile = el('div', 'ki-gesundheit-zeile');
    zeile.appendChild(el('span', 'ki-meta', label));
    zeile.appendChild(statusPunkt(info));
    liste.appendChild(zeile);
  }
  box.appendChild(liste);
  return box;
}

function agentKarte(agent, vorhanden) {
  const info = statusInfo(agent.status || 'aus');
  const knopf = el('button', `ki-agent-karte${vorhanden ? '' : ' ki-unbekannt'}`);
  knopf.type = 'button';
  knopf.appendChild(el('span', `ki-symbol ki-bg-${info.farbe}`, info.symbol));

  const haupt = el('span', 'ki-agent-haupt');
  const namensZeile = el('span', 'ki-agent-name');
  namensZeile.appendChild(document.createTextNode(agentName(agent.agent)));
  if (agent.titel) namensZeile.appendChild(el('span', 'ki-meta', ` ${agent.titel}`));
  haupt.appendChild(namensZeile);
  haupt.appendChild(statusPunkt(info));
  haupt.appendChild(el('span', 'ki-agent-aufgabe',
    agent.aktuelle_aufgabe ? kuerze(agent.aktuelle_aufgabe, 70) : 'Leerlauf'));
  haupt.appendChild(el('span', 'ki-meta',
    `${agent.offene_aufgaben || 0} offen · ${euro(agent.heute_kosten_eur)} heute`));
  knopf.appendChild(haupt);
  knopf.appendChild(el('span', 'ki-pfeil', '›'));
  knopf.addEventListener('click', () => { location.hash = `#/ki/agent/${agent.agent}`; });
  return knopf;
}

function agentenAbschnitt(agenten) {
  const box = el('section', 'ki-agenten-bereich');
  const vorhanden = new Set(agenten.map((a) => a.agent));
  const nachName = new Map(agenten.map((a) => [a.agent, a]));
  const gitter = el('div', 'ki-agenten');
  for (const name of AGENTEN) {
    gitter.appendChild(agentKarte(nachName.get(name) || { agent: name, status: 'aus' }, vorhanden.has(name)));
  }
  box.appendChild(gitter);
  if (agenten.length === 0) {
    box.appendChild(leer('AURORA ist nicht verbunden.'));
  }
  return box;
}

function auftragAbschnitt(aktionen) {
  const box = karte();
  box.appendChild(el('h2', 'ki-abschnitt', 'Neuer Auftrag'));

  const form = el('form', 'ki-form');
  const ziel = document.createElement('textarea');
  ziel.id = 'ki-auftrag-ziel';
  ziel.rows = 3;
  ziel.placeholder = 'Was soll AURORA tun?';
  ziel.value = aktionen.entwurf('auftragZiel') || '';
  ziel.addEventListener('input', () => aktionen.setEntwurf('auftragZiel', ziel.value));
  form.appendChild(el('label', 'ki-label', 'Ziel'));
  form.appendChild(ziel);

  const agentZeile = el('div', 'ki-form-zeile');
  const agentFeld = el('div', 'ki-form-feld');
  agentFeld.appendChild(el('label', 'ki-label', 'Agent'));
  const auswahl = document.createElement('select');
  auswahl.id = 'ki-auftrag-agent';
  for (const name of CHAT_AGENTEN) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = agentName(name);
    auswahl.appendChild(option);
  }
  auswahl.value = aktionen.entwurf('auftragAgent') || 'orchestrator';
  if (!auswahl.value) auswahl.value = 'orchestrator';
  auswahl.addEventListener('change', () => aktionen.setEntwurf('auftragAgent', auswahl.value));
  agentFeld.appendChild(auswahl);
  agentZeile.appendChild(agentFeld);

  const kriteriumFeld = el('div', 'ki-form-feld');
  kriteriumFeld.appendChild(el('label', 'ki-label', 'Erfolgskriterium (optional)'));
  const kriterium = document.createElement('input');
  kriterium.id = 'ki-auftrag-kriterium';
  kriterium.type = 'text';
  kriterium.placeholder = 'Woran erkennt man Erfolg?';
  kriterium.value = aktionen.entwurf('auftragKriterium') || '';
  kriterium.addEventListener('input', () => aktionen.setEntwurf('auftragKriterium', kriterium.value));
  kriteriumFeld.appendChild(kriterium);
  agentZeile.appendChild(kriteriumFeld);
  form.appendChild(agentZeile);

  const hinweis = formHinweis();
  const knopf = el('button', 'ki-knopf', 'Auftrag senden');
  knopf.type = 'submit';

  let sendet = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sendet) return;
    if (!ziel.value.trim()) {
      hinweis.textContent = 'Bitte ein Ziel eingeben.';
      hinweis.classList.add('ki-fehler-text');
      return;
    }
    sendet = true;
    knopf.disabled = true;
    hinweis.textContent = 'Wird gesendet …';
    hinweis.classList.remove('ki-fehler-text');
    try {
      await aktionen.sendeAuftrag({
        agent: auswahl.value,
        ziel: ziel.value,
        erfolgskriterium: kriterium.value,
      });
      aktionen.setEntwurf('auftragZiel', '');
      aktionen.setEntwurf('auftragKriterium', '');
      aktionen.setzeMeldung('Auftrag gesendet. AURORA entscheidet über die Annahme.', 'ok');
    } catch (fehler) {
      sendet = false;
      knopf.disabled = false;
      hinweis.textContent = `Fehler: ${fehler.message}`;
      hinweis.classList.add('ki-fehler-text');
    }
  });
  form.appendChild(knopf);
  form.appendChild(hinweis);
  box.appendChild(form);
  return box;
}

export function zeigeKi(inhalt, zustand, agent, aktionen) {
  inhalt.appendChild(budgetKarte(zustand.status));
  inhalt.appendChild(gesundheitKarte(zustand.status));

  const kopf = el('div', 'section-head');
  kopf.appendChild(el('h2', null, 'Agenten'));
  inhalt.appendChild(kopf);
  inhalt.appendChild(agentenAbschnitt(zustand.agenten));
  inhalt.appendChild(auftragAbschnitt(aktionen));

  const verteilung = el('button', 'link-muted ki-verteilung-link', 'Verteilung live ansehen ›');
  verteilung.type = 'button';
  verteilung.addEventListener('click', () => { location.hash = '#/ki/verteilung'; });
  inhalt.appendChild(verteilung);
}
