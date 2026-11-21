import { baueBaeume } from './baum.js';
import { ereignisText, uhrzeit } from './ereignisse.js';
import { aufgabenStatusInfo, kuerze } from './status.js';
import {
  el, karte, leer, euro, agentName, pille, zeigeAufgabeDetails,
} from './helfer.js';

const TAG_MS = 24 * 60 * 60 * 1000;

function zeitleiste(inhalt, zustand, aktionen) {
  const box = karte();
  box.appendChild(el('h2', 'ki-abschnitt', 'Live-Zeitleiste'));

  const ereignisse = zustand.ereignisse.slice(0, 40);
  if (ereignisse.length === 0) {
    box.appendChild(leer('Noch keine Ereignisse.'));
    return box;
  }

  const gesehen = aktionen.gesehen;
  const vergleichVorhanden = gesehen.size > 0;
  const liste = el('div', 'ki-zeitleiste');
  const schluesselListe = [];

  ereignisse.forEach((ereignis, index) => {
    const schluessel = ereignis.aurora_id ?? ereignis.id ?? `ereignis-${index}`;
    schluesselListe.push(schluessel);
    const neu = vergleichVorhanden && !gesehen.has(schluessel);
    const zeile = el('div', `ki-ereignis${neu ? ' ki-neu' : ''}`);
    zeile.appendChild(el('span', 'ki-zeit', uhrzeit(ereignis.zeitpunkt) || '—'));
    zeile.appendChild(el('span', 'ki-ereignis-text', ereignisText(ereignis, zustand.aufgaben)));
    liste.appendChild(zeile);
  });

  box.appendChild(liste);
  aktionen.markiereGesehen(schluesselListe);
  return box;
}

function baumKnoten(knoten, tiefe, container, aktionen) {
  const schluessel = knoten.id ?? `knoten-${tiefe}-${knoten.eingabe || ''}`;
  const eintrag = el('div', 'ki-baum-knoten');
  eintrag.style.marginLeft = `${Math.min(tiefe, 6) * 14}px`;

  const kopf = el('button', 'ki-aufgabe-kopf');
  kopf.type = 'button';
  kopf.appendChild(pille(aufgabenStatusInfo(knoten.status)));
  if (knoten.agent) kopf.appendChild(el('span', 'ki-meta', agentName(knoten.agent)));
  kopf.appendChild(el('span', 'ki-aufgabe-text', kuerze(knoten.eingabe || '—', 70)));
  kopf.appendChild(el('span', 'ki-meta', euro(knoten.kosten_eur)));
  kopf.addEventListener('click', () => aktionen.toggleKarte(schluessel));
  eintrag.appendChild(kopf);

  if (aktionen.istOffen(schluessel)) {
    zeigeAufgabeDetails(eintrag, knoten);
  }

  container.appendChild(eintrag);
  for (const kind of knoten.kinder || []) {
    baumKnoten(kind, tiefe + 1, container, aktionen);
  }
}

function aufgabenBaeume(inhalt, zustand, aktionen) {
  const box = karte();
  box.appendChild(el('h2', 'ki-abschnitt', 'Aufgabenbäume (letzte 24 Stunden)'));

  const grenze = Date.now() - TAG_MS;
  const aufgaben = zustand.aufgaben.filter((aufgabe) => {
    if (!aufgabe) return false;
    const zeit = Date.parse(aufgabe.erstellt_am || aufgabe.aktualisiert_am);
    return !Number.isFinite(zeit) || zeit >= grenze;
  });

  const baeume = baueBaeume(aufgaben);
  if (baeume.length === 0) {
    box.appendChild(leer('Noch keine Aufgaben in den letzten 24 Stunden.'));
    return box;
  }

  const liste = el('div', 'ki-baeume');
  for (const wurzel of baeume) {
    baumKnoten(wurzel, 0, liste, aktionen);
  }
  box.appendChild(liste);
  return box;
}

export function zeigeKi(inhalt, zustand, agent, aktionen) {
  const zurueck = el('button', 'link-muted', '‹ Übersicht');
  zurueck.type = 'button';
  zurueck.addEventListener('click', () => { location.hash = '#/ki'; });
  inhalt.appendChild(zurueck);
  inhalt.appendChild(zeitleiste(inhalt, zustand, aktionen));
  inhalt.appendChild(aufgabenBaeume(inhalt, zustand, aktionen));
}
