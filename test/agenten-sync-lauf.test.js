import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fuehreSyncAus } from '../automatisierung/obsidian-sync-lauf.js';
import { baueNotiz } from '../js/module/agenten/obsidian.js';

const USER = 'u1';

// Minimale Attrappe der Supabase-Schnittstelle, die der Lauf benutzt
function fakeClient(tabellen) {
  let zaehler = 0;
  return {
    from(name) {
      const rows = tabellen[name];
      const filter = [];
      const abfrage = {
        select() { return abfrage; },
        eq(c, v) { filter.push((r) => r[c] === v); return abfrage; },
        neq(c, v) { filter.push((r) => r[c] !== v); return abfrage; },
        then(ok) { ok({ data: rows.filter((r) => filter.every((f) => f(r))), error: null }); },
        insert(obj) {
          const doppelt = rows.find((r) => r.user_id === obj.user_id && r.agent === obj.agent && r.titel === obj.titel);
          if (doppelt) return Promise.resolve({ error: { message: 'duplicate key (agent, titel)' } });
          rows.push({ id: `neu-${++zaehler}`, ...obj });
          return Promise.resolve({ error: null });
        },
        update(obj) {
          return { eq(c, v) { rows.filter((r) => r[c] === v).forEach((r) => Object.assign(r, obj)); return Promise.resolve({ error: null }); } };
        },
      };
      return abfrage;
    },
  };
}

function vault() {
  const ordner = mkdtempSync(join(tmpdir(), 'vault-'));
  mkdirSync(join(ordner, 'Agenten', 'flipping'), { recursive: true });
  return ordner;
}
const datei = (v, rel, text) => { mkdirSync(join(v, rel, '..'), { recursive: true }); writeFileSync(join(v, rel), text, 'utf-8'); };

const wissenZeile = (o = {}) => ({
  id: 'r1', user_id: USER, agent: 'trading', titel: 'Haltedauer', inhalt: 'Kern 2-6 Monate.', tags: ['regel'],
  status: 'aktiv', vertrauen: 'eigen', quelle: 'projekt_notizen', pfad: null, ...o,
});

test('erster Abgleich: Vault-Notiz wird hochgeladen, Dashboard-Notiz heruntergeladen, Profil und Bericht entstehen', async () => {
  const v = vault();
  datei(v, 'Agenten/flipping/Mindestpreise.md', '---\ntitel: Mindestpreise\nagent: flipping\ntags: [regel]\n---\n16 Pro mind. 450 [[Preislogik]]');
  const tabellen = {
    agent_wissen: [wissenZeile()],
    agent_profile: [{ user_id: USER, agent: 'trading', titel: 'Trading (Paper)', rolle: 'Paper-Handel', zugehoerigkeit: ['trading'], darf: [], werkzeuge: [], freigabe_noetig: ['Echtgeld'], ton: 'kurz' }],
  };
  const b = await fuehreSyncAus({ vault: v, client: fakeClient(tabellen), userId: USER });
  assert.equal(b.hochgeladen.length, 1);
  assert.equal(b.heruntergeladen.length, 1);
  assert.deepEqual(b.fehler, []);
  const hoch = tabellen.agent_wissen.find((r) => r.titel === 'Mindestpreise');
  assert.equal(hoch.agent, 'flipping');
  assert.equal(hoch.quelle, 'obsidian');
  assert.equal(hoch.inhalt, '16 Pro mind. 450 [[Preislogik]]');
  assert.equal(hoch.pfad, 'Agenten/flipping/Mindestpreise.md');
  assert.ok(existsSync(join(v, 'Agenten/trading/Haltedauer.md')));
  assert.match(readFileSync(join(v, 'Agenten/trading/Haltedauer.md'), 'utf-8'), /Kern 2-6 Monate\./);
  assert.equal(tabellen.agent_wissen.find((r) => r.id === 'r1').pfad, 'Agenten/trading/Haltedauer.md');
  assert.match(readFileSync(join(v, 'Agenten/trading/_Profil.md'), 'utf-8'), /\[\[Haltedauer\]\]/);
  assert.ok(existsSync(join(v, 'Agenten/_Sync-Bericht.md')));
  rmSync(v, { recursive: true, force: true });
});

test('zweiter Abgleich ohne Änderung ändert nichts; lokale Änderung geht ins Dashboard', async () => {
  const v = vault();
  datei(v, 'Agenten/flipping/A.md', '---\ntitel: A\nagent: flipping\n---\nerste Fassung');
  const tabellen = { agent_wissen: [], agent_profile: [] };
  const client = fakeClient(tabellen);
  await fuehreSyncAus({ vault: v, client, userId: USER });
  const b2 = await fuehreSyncAus({ vault: v, client, userId: USER });
  assert.equal(b2.unveraendert, 1);
  assert.equal(b2.hochgeladen.length + b2.aktualisiertRemote.length + b2.heruntergeladen.length, 0);

  datei(v, 'Agenten/flipping/A.md', '---\ntitel: A\nagent: flipping\n---\nzweite Fassung');
  const b3 = await fuehreSyncAus({ vault: v, client, userId: USER });
  assert.deepEqual(b3.aktualisiertRemote, ['Agenten/flipping/A.md']);
  assert.equal(tabellen.agent_wissen[0].inhalt, 'zweite Fassung');
  rmSync(v, { recursive: true, force: true });
});

test('Änderung im Dashboard kommt in den Vault; beide Seiten geändert = Konflikt, nichts überschrieben', async () => {
  const v = vault();
  datei(v, 'Agenten/flipping/A.md', '---\ntitel: A\nagent: flipping\n---\nstart');
  const tabellen = { agent_wissen: [], agent_profile: [] };
  const client = fakeClient(tabellen);
  await fuehreSyncAus({ vault: v, client, userId: USER });

  tabellen.agent_wissen[0].inhalt = 'vom Dashboard';
  const b = await fuehreSyncAus({ vault: v, client, userId: USER });
  assert.deepEqual(b.aktualisiertLokal, ['Agenten/flipping/A.md']);
  assert.match(readFileSync(join(v, 'Agenten/flipping/A.md'), 'utf-8'), /vom Dashboard/);

  datei(v, 'Agenten/flipping/A.md', '---\ntitel: A\nagent: flipping\n---\nlokal neu');
  tabellen.agent_wissen[0].inhalt = 'remote neu';
  const k = await fuehreSyncAus({ vault: v, client, userId: USER });
  assert.equal(k.konflikte.length, 1);
  assert.match(readFileSync(join(v, 'Agenten/flipping/A.md'), 'utf-8'), /lokal neu/);
  assert.equal(tabellen.agent_wissen[0].inhalt, 'remote neu');
  rmSync(v, { recursive: true, force: true });
});

test('Freigabe: status vorschlag -> aktiv in Obsidian wird übernommen', async () => {
  const v = vault();
  const tabellen = { agent_wissen: [wissenZeile({ status: 'vorschlag', agent: 'flipping', titel: 'Idee', pfad: null })], agent_profile: [] };
  const client = fakeClient(tabellen);
  await fuehreSyncAus({ vault: v, client, userId: USER });
  const pfad = join(v, 'Agenten/flipping/Idee.md');
  assert.match(readFileSync(pfad, 'utf-8'), /status: vorschlag/);
  writeFileSync(pfad, readFileSync(pfad, 'utf-8').replace('status: vorschlag', 'status: aktiv'), 'utf-8');
  await fuehreSyncAus({ vault: v, client, userId: USER });
  assert.equal(tabellen.agent_wissen[0].status, 'aktiv');
  rmSync(v, { recursive: true, force: true });
});

test('Trockenlauf schreibt nichts; Löschen auf einer Seite wird nur gemeldet; Fehler stoppen den Lauf nicht', async () => {
  const v = vault();
  datei(v, 'Agenten/flipping/Neu.md', '---\ntitel: Neu\nagent: flipping\n---\nx');
  const tabellen = { agent_wissen: [], agent_profile: [] };
  const trocken = await fuehreSyncAus({ vault: v, client: fakeClient(tabellen), userId: USER, trocken: true });
  assert.equal(trocken.hochgeladen.length, 1);
  assert.equal(tabellen.agent_wissen.length, 0);
  assert.ok(!existsSync(join(v, 'Agenten/.sync-zustand.json')));

  // Titel kollidiert mit vorhandener Zeile unter anderem Pfad -> Fehler, der Rest läuft weiter
  const t2 = { agent_wissen: [wissenZeile({ agent: 'flipping', titel: 'Neu', pfad: 'Agenten/flipping/Anders.md' })], agent_profile: [] };
  datei(v, 'Agenten/flipping/Zweite.md', '---\ntitel: Zweite\nagent: flipping\n---\ny');
  const b = await fuehreSyncAus({ vault: v, client: fakeClient(t2), userId: USER });
  assert.equal(b.fehler.length, 1);
  assert.ok(b.hochgeladen.includes('Agenten/flipping/Zweite.md'));
  rmSync(v, { recursive: true, force: true });
});
