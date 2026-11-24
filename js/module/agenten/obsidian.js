// Obsidian-Notizen <-> agent_wissen. Reine Funktionen (kein DOM, kein Netz), von Dashboard UND
// automatisierung/obsidian-sync.mjs genutzt.
//
// Eine Notiz im Vault liegt unter  Agenten/<agent>/<Titel>.md  (agent '_gemeinsam' = für alle) und sieht so aus:
//   ---
//   titel: Mindestpreise
//   agent: flipping
//   tags: [regel, flipping]
//   status: aktiv
//   vertrauen: eigen
//   quelle: obsidian
//   ---
//   Markdown-Text mit [[Wikilinks]] und #tags
// status "vorschlag" -> in Obsidian auf "aktiv" ändern = Freigabe.

export const GEMEINSAM = '_gemeinsam';
const STATUS = ['aktiv', 'vorschlag', 'archiv'];
const VERTRAUEN = ['eigen', 'extern'];
const QUELLEN = ['manuell', 'obsidian', 'video', 'chat', 'projekt_notizen', 'agent'];
const AGENT_MUSTER = /^[a-z0-9_]{2,32}$/;

export function gueltigerAgent(name) {
  return name === GEMEINSAM || AGENT_MUSTER.test(String(name ?? ''));
}

function normalisiere(text) {
  return String(text ?? '').replace(/\r\n?/g, '\n');
}

// cyrb53: kleiner, schneller 53-Bit-Hash (nur zur Änderungserkennung, keine Sicherheit)
export function hashText(text) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const s = normalisiere(text);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

function parseListe(wert) {
  const roh = String(wert ?? '').trim();
  if (!roh) return [];
  const innen = roh.startsWith('[') && roh.endsWith(']') ? roh.slice(1, -1) : roh;
  return innen.split(',').map((t) => t.trim().replace(/^["']|["']$/g, '').replace(/^#/, '')).filter(Boolean);
}

export function parseTags(text) {
  return [...new Set(parseListe(text))];
}

function parseWert(wert) {
  return String(wert ?? '').trim().replace(/^["']|["']$/g, '');
}

/** Zerlegt eine Markdown-Datei in { meta, inhalt }. Ohne Kopfzeile ist meta leer. */
export function parseNotiz(text) {
  const s = normalisiere(text);
  const treffer = s.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!treffer) return { meta: {}, inhalt: s.replace(/^\n+/, '').replace(/\s+$/, '') };
  const meta = {};
  const zeilen = treffer[1].split('\n');
  for (let i = 0; i < zeilen.length; i++) {
    const m = zeilen[i].match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    const [, schluessel, wert] = m;
    if (schluessel === 'tags' && wert.trim() === '') {
      const liste = [];
      while (i + 1 < zeilen.length && /^\s*-\s+/.test(zeilen[i + 1])) {
        i++;
        liste.push(zeilen[i].replace(/^\s*-\s+/, ''));
      }
      meta.tags = parseTags(liste.join(','));
    } else if (schluessel === 'tags') {
      meta.tags = parseTags(wert);
    } else {
      meta[schluessel] = parseWert(wert);
    }
  }
  return { meta, inhalt: treffer[2].replace(/^\n+/, '').replace(/\s+$/, '') };
}

function zeile(schluessel, wert) {
  return `${schluessel}: ${wert}`;
}

/** Baut die kanonische Markdown-Datei einer Notiz (stabile Reihenfolge, damit Vergleiche funktionieren). */
export function baueNotiz(n) {
  const status = STATUS.includes(n.status) ? n.status : 'aktiv';
  const vertrauen = VERTRAUEN.includes(n.vertrauen) ? n.vertrauen : 'eigen';
  const quelle = QUELLEN.includes(n.quelle) ? n.quelle : 'manuell';
  const tags = [...new Set((n.tags ?? []).map((t) => String(t).trim().replace(/^#/, '')).filter(Boolean))];
  const kopf = [
    zeile('titel', String(n.titel ?? '').replace(/\n/g, ' ')),
    zeile('agent', n.agent ?? GEMEINSAM),
    zeile('tags', `[${tags.join(', ')}]`),
    zeile('status', status),
    zeile('vertrauen', vertrauen),
    zeile('quelle', quelle),
  ];
  const koerper = normalisiere(n.inhalt).replace(/^\n+/, '').replace(/\s+$/, '');
  return `---\n${kopf.join('\n')}\n---\n\n${koerper}\n`;
}

// Obsidian verbietet \ / : * ? " < > | in Dateinamen (und #, ^, [, ] in Link-Zielen)
export function dateiName(titel) {
  const sauber = String(titel ?? '')
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120)
    .trim();
  return sauber || 'Notiz';
}

export function pfadFuer(agent, titel) {
  return `Agenten/${agent}/${dateiName(titel)}.md`;
}

/** [[Ziel]], [[Ziel|Alias]], [[Ziel#Abschnitt]] -> Liste der Ziele (ohne Duplikate) */
export function extrahiereLinks(inhalt) {
  const ziele = new Set();
  for (const m of normalisiere(inhalt).matchAll(/\[\[([^\]\n]+?)\]\]/g)) {
    const ziel = m[1].split('|')[0].split('#')[0].trim();
    if (ziel) ziele.add(ziel);
  }
  return [...ziele];
}

/** Aus einer Vault-Datei eine Wissens-Zeile machen (Agent/Titel aus Kopfzeile, sonst aus dem Pfad). */
export function notizAusDatei(pfad, text) {
  const { meta, inhalt } = parseNotiz(text);
  const teile = String(pfad).split('/');
  const ordner = teile.length >= 3 ? teile[teile.length - 2] : GEMEINSAM;
  const dateiOhneEndung = teile[teile.length - 1].replace(/\.md$/i, '');
  const agent = meta.agent || ordner;
  return {
    pfad,
    agent,
    titel: meta.titel || dateiOhneEndung,
    inhalt,
    tags: meta.tags ?? [],
    status: STATUS.includes(meta.status) ? meta.status : 'aktiv',
    vertrauen: VERTRAUEN.includes(meta.vertrauen) ? meta.vertrauen : 'eigen',
    quelle: QUELLEN.includes(meta.quelle) ? meta.quelle : 'obsidian',
  };
}

export function kanonisch(n) {
  return baueNotiz(n);
}

/**
 * Plant den Abgleich Vault <-> Datenbank. Löscht NIE etwas.
 * lokal:  [{ pfad, text }]          Dateien im Vault
 * remote: [{ id, agent, titel, inhalt, tags, status, vertrauen, quelle, pfad }]   Zeilen aus agent_wissen (ohne archiv)
 * zustand: { [pfad]: hashDesKanonischenTextsNachLetztemAbgleich }
 * -> [{ aktion, pfad, ... }] mit aktion: hochladen | aktualisiere_remote | herunterladen | aktualisiere_lokal | konflikt
 *    | ungueltig | nur_remote_geloescht_oder_lokal_geloescht | unveraendert
 */
export function planeSync(lokal, remote, zustand = {}) {
  const aktionen = [];
  const lokalMap = new Map();
  for (const d of lokal) lokalMap.set(d.pfad, d);
  const remoteMap = new Map();
  for (const r of remote) {
    const pfad = r.pfad || pfadFuer(r.agent, r.titel);
    remoteMap.set(pfad, { ...r, pfad });
  }

  for (const [pfad, datei] of lokalMap) {
    const lokalNotiz = notizAusDatei(pfad, datei.text);
    if (!gueltigerAgent(lokalNotiz.agent)) {
      aktionen.push({ aktion: 'ungueltig', pfad, grund: `Agent-Name "${lokalNotiz.agent}" ist ungültig (a-z, 0-9, _, 2-32 Zeichen)` });
      continue;
    }
    const lokalKanon = kanonisch(lokalNotiz);
    const lokalHash = hashText(lokalKanon);
    const r = remoteMap.get(pfad);
    const alt = zustand[pfad];

    if (!r) {
      if (alt) aktionen.push({ aktion: 'nur_remote_geloescht_oder_lokal_geloescht', pfad, hinweis: 'Im Dashboard gelöscht, im Vault noch vorhanden. Nichts geändert.' });
      else aktionen.push({ aktion: 'hochladen', pfad, notiz: lokalNotiz });
      continue;
    }

    const remoteHash = hashText(kanonisch(r));
    if (lokalHash === remoteHash) {
      aktionen.push({ aktion: 'unveraendert', pfad, hash: lokalHash, id: r.id });
      continue;
    }
    if (alt && alt === remoteHash) aktionen.push({ aktion: 'aktualisiere_remote', pfad, id: r.id, notiz: lokalNotiz, hash: lokalHash });
    else if (alt && alt === lokalHash) aktionen.push({ aktion: 'aktualisiere_lokal', pfad, id: r.id, text: kanonisch(r), hash: remoteHash });
    else aktionen.push({ aktion: 'konflikt', pfad, id: r.id, hinweis: 'Beide Seiten geändert (oder erster Abgleich mit Unterschied). Bitte eine Seite anpassen.' });
  }

  for (const [pfad, r] of remoteMap) {
    if (lokalMap.has(pfad)) continue;
    if (zustand[pfad]) aktionen.push({ aktion: 'nur_remote_geloescht_oder_lokal_geloescht', pfad, hinweis: 'Im Vault gelöscht, im Dashboard noch vorhanden. Nichts geändert.' });
    else aktionen.push({ aktion: 'herunterladen', pfad, id: r.id, text: kanonisch(r), hash: hashText(kanonisch(r)) });
  }
  return aktionen;
}

/**
 * Profil als Markdown fürs Vault (nur Anzeige/Orientierung, wird bei jedem Abgleich aus der Datenbank überschrieben).
 * Verlinkt die Wissensnotizen des Agenten mit [[Wikilinks]] (damit der Obsidian-Graph die Zugehörigkeit zeigt).
 */
export function baueProfilNotiz(profil, wissenTitel = []) {
  const liste = (a) => (a && a.length ? a.map((x) => `- ${x}`).join('\n') : '- (keine)');
  const links = wissenTitel.length ? wissenTitel.map((t) => `- [[${dateiName(t)}]]`).join('\n') : '- (noch kein Wissen)';
  return [
    '---',
    `titel: Profil ${profil.titel}`,
    `agent: ${profil.agent}`,
    'tags: [profil]',
    '---',
    '',
    `> Dieses Profil wird vom Dashboard erzeugt und bei jedem Abgleich überschrieben. Ändern im Dashboard (Agenten).`,
    '',
    `# ${profil.titel}`,
    '',
    profil.rolle || '',
    '',
    '## Zugehörigkeit',
    liste(profil.zugehoerigkeit),
    '',
    '## Darf',
    liste(profil.darf),
    '',
    '## Werkzeuge',
    liste(profil.werkzeuge),
    '',
    '## Freigabe nötig',
    liste(profil.freigabe_noetig),
    '',
    '## Ton',
    profil.ton || '(nicht gesetzt)',
    '',
    '## Wissen',
    links,
    '',
  ].join('\n');
}
