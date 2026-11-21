// Wandelt AURORA-Ereignisse in lesbare deutsche Zeilen um (reine Logik).

import { aufgabenStatusInfo, kuerze } from './status.js';

function indexiere(aufgaben) {
  const index = new Map();
  if (!Array.isArray(aufgaben)) return index;
  for (const aufgabe of aufgaben) {
    if (aufgabe && aufgabe.id !== null && aufgabe.id !== undefined) {
      index.set(aufgabe.id, aufgabe);
    }
  }
  return index;
}

function aufgabenLabel(ereignis, index) {
  if (!ereignis || ereignis.aufgabe_id === null || ereignis.aufgabe_id === undefined) return null;
  const aufgabe = index.get(ereignis.aufgabe_id);
  if (aufgabe) {
    const titel = aufgabe.eingabe || aufgabe.titel || aufgabe.beschreibung || '';
    if (titel) return kuerze(titel, 48);
  }
  return kuerze(String(ereignis.aufgabe_id), 12);
}

export function ereignisText(ereignis, aufgaben) {
  const e = ereignis || {};
  const index = indexiere(aufgaben);
  const akteur = e.akteur || 'AURORA';
  const teile = [];

  const label = aufgabenLabel(e, index);
  if (label) teile.push(`Aufgabe „${label}“`);

  if (e.von_status || e.nach_status) {
    const von = e.von_status ? aufgabenStatusInfo(e.von_status).text : 'neu';
    const nach = e.nach_status ? aufgabenStatusInfo(e.nach_status).text : 'offen';
    teile.push(`${von} → ${nach}`);
  } else if (e.art) {
    teile.push(e.art);
  }

  if (e.detail) teile.push(kuerze(e.detail, 120));

  if (teile.length === 0) teile.push('Ereignis');
  return `${akteur}: ${teile.join(' · ')}`;
}

export function uhrzeit(iso) {
  const zeit = Date.parse(iso);
  if (!Number.isFinite(zeit)) return '';
  const datum = new Date(zeit);
  return `${String(datum.getHours()).padStart(2, '0')}:${String(datum.getMinutes()).padStart(2, '0')}`;
}
