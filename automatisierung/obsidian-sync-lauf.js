// Abgleich Obsidian-Vault <-> agent_wissen. Reine Ablauf-Logik: Client und Ordner werden hereingereicht (testbar).
// Löscht nie Dateien oder Datenbankzeilen. Konflikte werden nur gemeldet.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { planeSync, pfadFuer, hashText, baueNotiz, baueProfilNotiz, extrahiereLinks } from '../js/module/agenten/obsidian.js';

const ZUSTAND_DATEI = '.sync-zustand.json';
const BERICHT_DATEI = '_Sync-Bericht.md';

function sammleDateien(wurzel, relativ = 'Agenten') {
  const ordner = join(wurzel, relativ);
  if (!existsSync(ordner)) return [];
  const ergebnis = [];
  for (const e of readdirSync(ordner, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name.startsWith('_')) continue;
    const rel = `${relativ}/${e.name}`;
    if (e.isDirectory()) ergebnis.push(...sammleDateien(wurzel, rel));
    else if (e.isFile() && /\.md$/i.test(e.name)) {
      ergebnis.push({ pfad: rel, text: readFileSync(join(wurzel, rel), 'utf-8') });
    }
  }
  return ergebnis;
}

function leseZustand(vault) {
  const datei = join(vault, 'Agenten', ZUSTAND_DATEI);
  try { return JSON.parse(readFileSync(datei, 'utf-8')); } catch { return {}; }
}

function schreibe(vault, relPfad, text) {
  const ziel = join(vault, relPfad);
  mkdirSync(dirname(ziel), { recursive: true });
  writeFileSync(ziel, text, 'utf-8');
}

// Jede Zeile bekommt einen eindeutigen Pfad (Dateinamen-Bereinigung könnte zwei Titel gleich machen)
function weiseRemotePfadeZu(zeilen) {
  const benutzt = new Set(zeilen.filter((r) => r.pfad).map((r) => r.pfad));
  return zeilen.map((r) => {
    if (r.pfad) return r;
    let pfad = pfadFuer(r.agent, r.titel);
    if (benutzt.has(pfad)) pfad = pfad.replace(/\.md$/, ` (${String(r.id).slice(0, 8)}).md`);
    benutzt.add(pfad);
    return { ...r, pfad };
  });
}

export async function fuehreSyncAus({ vault, client, userId, trocken = false }) {
  const bericht = { hochgeladen: [], aktualisiertRemote: [], heruntergeladen: [], aktualisiertLokal: [], konflikte: [], ungueltig: [], hinweise: [], fehler: [], unveraendert: 0 };

  const antwort = await client.from('agent_wissen').select('*').eq('user_id', userId).neq('status', 'archiv');
  if (antwort.error) throw new Error(`Wissen laden: ${antwort.error.message}`);
  const remote = weiseRemotePfadeZu(antwort.data ?? []);
  const lokal = sammleDateien(vault);
  const zustand = leseZustand(vault);
  const neuerZustand = { ...zustand };
  const aktionen = planeSync(lokal, remote, zustand);

  for (const a of aktionen) {
    try {
      switch (a.aktion) {
        case 'unveraendert':
          bericht.unveraendert++;
          neuerZustand[a.pfad] = a.hash;
          // Zeilen ohne gespeicherten Pfad bekommen ihn jetzt (damit der nächste Abgleich eindeutig bleibt)
          if (!trocken) {
            const r = remote.find((x) => x.id === a.id);
            if (r && !antwort.data.find((x) => x.id === a.id)?.pfad) {
              const e = await client.from('agent_wissen').update({ pfad: a.pfad, inhalts_hash: a.hash }).eq('id', a.id);
              if (e?.error) throw new Error(e.error.message);
            }
          }
          break;
        case 'hochladen': {
          const n = a.notiz;
          const hash = hashText(baueNotiz(n));
          if (!trocken) {
            const e = await client.from('agent_wissen').insert({
              user_id: userId, agent: n.agent, titel: n.titel, inhalt: n.inhalt, tags: n.tags,
              status: n.status, vertrauen: n.vertrauen, quelle: 'obsidian', pfad: a.pfad, inhalts_hash: hash,
            });
            if (e?.error) throw new Error(e.error.message);
          }
          neuerZustand[a.pfad] = hash;
          bericht.hochgeladen.push(a.pfad);
          break;
        }
        case 'aktualisiere_remote': {
          const n = a.notiz;
          if (!trocken) {
            const e = await client.from('agent_wissen').update({
              agent: n.agent, titel: n.titel, inhalt: n.inhalt, tags: n.tags, status: n.status,
              vertrauen: n.vertrauen, pfad: a.pfad, inhalts_hash: a.hash,
            }).eq('id', a.id);
            if (e?.error) throw new Error(e.error.message);
          }
          neuerZustand[a.pfad] = a.hash;
          bericht.aktualisiertRemote.push(a.pfad);
          break;
        }
        case 'herunterladen':
        case 'aktualisiere_lokal':
          if (!trocken) {
            schreibe(vault, a.pfad, a.text);
            const e = await client.from('agent_wissen').update({ pfad: a.pfad, inhalts_hash: a.hash }).eq('id', a.id);
            if (e?.error) throw new Error(e.error.message);
          }
          neuerZustand[a.pfad] = a.hash;
          (a.aktion === 'herunterladen' ? bericht.heruntergeladen : bericht.aktualisiertLokal).push(a.pfad);
          break;
        case 'konflikt': bericht.konflikte.push(`${a.pfad}: ${a.hinweis}`); break;
        case 'ungueltig': bericht.ungueltig.push(`${a.pfad}: ${a.grund}`); break;
        case 'nur_remote_geloescht_oder_lokal_geloescht': bericht.hinweise.push(`${a.pfad}: ${a.hinweis}`); break;
        default: break;
      }
    } catch (e) {
      bericht.fehler.push(`${a.pfad}: ${e.message}`);
    }
  }

  // Profile als Anzeige-Notizen (nur Vault, nie zurück in die Datenbank)
  const profile = await client.from('agent_profile').select('*').eq('user_id', userId);
  if (!profile.error && !trocken) {
    for (const p of profile.data ?? []) {
      const titel = remote.filter((r) => r.agent === p.agent).map((r) => r.titel);
      schreibe(vault, `Agenten/${p.agent}/_Profil.md`, baueProfilNotiz(p, titel));
    }
  }

  if (!trocken) {
    schreibe(vault, `Agenten/${ZUSTAND_DATEI}`, JSON.stringify(neuerZustand, null, 2));
    schreibe(vault, `Agenten/${BERICHT_DATEI}`, baueBericht(bericht));
  }
  return bericht;
}

export function baueBericht(b) {
  const liste = (titel, a) => (a.length ? `## ${titel} (${a.length})\n${a.map((x) => `- ${x}`).join('\n')}\n\n` : '');
  return `# Sync-Bericht\n\nLetzter Abgleich: ${new Date().toISOString()}\n\nUnverändert: ${b.unveraendert}\n\n`
    + liste('Konflikte (bitte eine Seite anpassen)', b.konflikte)
    + liste('Fehler', b.fehler)
    + liste('Ungültig', b.ungueltig)
    + liste('Hochgeladen', b.hochgeladen)
    + liste('Im Dashboard aktualisiert', b.aktualisiertRemote)
    + liste('Heruntergeladen', b.heruntergeladen)
    + liste('Im Vault aktualisiert', b.aktualisiertLokal)
    + liste('Hinweise', b.hinweise);
}

export function verlinkungen(notizen) {
  // Hilfsfunktion fürs Berichtswesen: welche Notiz verlinkt auf welche Titel
  return notizen.map((n) => ({ titel: n.titel, links: extrahiereLinks(n.inhalt) }));
}
