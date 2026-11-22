import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  setzeClient, ladeAlles, sendeChat, sendeAuftrag, abonniere, beende,
} from '../js/module/ki/daten.js';

function baueClient(daten = {}, fehler = {}) {
  const aufrufe = [];
  const kanaele = [];
  const entfernt = [];

  function ergebnis(tabelle, eingefuegt) {
    if (fehler[tabelle]) return { data: null, error: { message: fehler[tabelle] } };
    if (eingefuegt) return { data: { id: 'neu', ...eingefuegt }, error: null };
    const wert = daten[tabelle];
    return { data: Array.isArray(wert) ? wert : [], error: null };
  }

  const client = {
    from(tabelle) {
      let eingefuegt = null;
      const abfrage = {
        select() { return abfrage; },
        order() { return abfrage; },
        limit() { return abfrage; },
        insert(zeile) { eingefuegt = zeile; aufrufe.push({ art: 'insert', tabelle, zeile }); return abfrage; },
        single() { return ergebnis(tabelle, eingefuegt); },
        then(resolve, reject) { return Promise.resolve(ergebnis(tabelle, eingefuegt)).then(resolve, reject); },
      };
      aufrufe.push({ art: 'select', tabelle });
      return abfrage;
    },
    channel(name) {
      const kanal = {
        name,
        handlers: [],
        abonniert: false,
        on(art, filter, cb) { kanal.handlers.push({ art, filter, cb }); return kanal; },
        subscribe() { kanal.abonniert = true; return kanal; },
      };
      kanaele.push(kanal);
      return kanal;
    },
    removeChannel(k) { entfernt.push(k); },
  };
  return { client, aufrufe, kanaele, entfernt };
}

afterEach(() => { beende(); setzeClient(null); });

test('ladeAlles: laedt alle sechs Tabellen, Status als Objekt, Agenten in fester Reihenfolge', async () => {
  const { client } = baueClient({
    aurora_status: [{ budget_limit_eur: 25, kill_switch: false }],
    aurora_agenten: [{ agent: 'monitor' }, { agent: 'ceo' }],
    aurora_aufgaben: [{ id: 'a' }],
    aurora_ereignisse: [{ aurora_id: 1 }],
    aurora_chat: [{ id: 'c' }],
    aurora_auftraege: [{ id: 'o' }],
  });
  setzeClient(client);
  const zustand = await ladeAlles();
  assert.equal(zustand.status.budget_limit_eur, 25);
  assert.deepEqual(zustand.agenten.map((a) => a.agent), ['ceo', 'monitor']);
  assert.deepEqual(zustand.aufgaben, [{ id: 'a' }]);
  assert.deepEqual(zustand.ereignisse, [{ aurora_id: 1 }]);
  assert.deepEqual(zustand.chat, [{ id: 'c' }]);
  assert.deepEqual(zustand.auftraege, [{ id: 'o' }]);
});

test('ladeAlles: leere Antworten werden zu null/leeren Listen', async () => {
  const { client } = baueClient({});
  setzeClient(client);
  const zustand = await ladeAlles();
  assert.equal(zustand.status, null);
  assert.deepEqual(zustand.agenten, []);
  assert.deepEqual(zustand.aufgaben, []);
});

test('ladeAlles: Fehler einer Tabelle wird mit deutschem Kontext geworfen', async () => {
  const { client } = baueClient({}, { aurora_aufgaben: 'kaputt' });
  setzeClient(client);
  await assert.rejects(ladeAlles, /Aufgaben laden: kaputt/);
});

test('sendeChat: fuegt genau die erlaubten Felder ein und trimmt', async () => {
  const { client, aufrufe } = baueClient({});
  setzeClient(client);
  const ergebnis = await sendeChat({ agent: 'orchestrator', text: '  Hallo AURORA  ' });
  assert.equal(ergebnis.text, 'Hallo AURORA');
  const insert = aufrufe.find((a) => a.art === 'insert');
  assert.deepEqual(insert.zeile, { agent: 'orchestrator', rolle: 'nutzer', text: 'Hallo AURORA', status: 'neu' });
  assert.equal('user_id' in insert.zeile, false);
});

test('sendeChat: monitor, unbekannter Agent und leere Eingabe werden abgelehnt', async () => {
  const { client, aufrufe } = baueClient({});
  setzeClient(client);
  await assert.rejects(sendeChat({ agent: 'monitor', text: 'Hallo' }), /nicht angeschrieben/);
  await assert.rejects(sendeChat({ agent: 'unbekannt', text: 'Hallo' }), /nicht angeschrieben/);
  await assert.rejects(sendeChat({ agent: 'ceo', text: '   ' }), /Nachricht/);
  assert.equal(aufrufe.filter((a) => a.art === 'insert').length, 0);
});

test('sendeAuftrag: Standard ist orchestrator, Ziel wird getrimmt', async () => {
  const { client, aufrufe } = baueClient({});
  setzeClient(client);
  await sendeAuftrag({ ziel: '  Prüfe Preise  ', erfolgskriterium: ' Liste  ' });
  const insert = aufrufe.find((a) => a.art === 'insert');
  assert.deepEqual(insert.zeile, {
    agent: 'orchestrator', ziel: 'Prüfe Preise', erfolgskriterium: 'Liste',
  });
});

test('sendeAuftrag: leeres/zu langes Ziel und monitor werden abgelehnt', async () => {
  const { client, aufrufe } = baueClient({});
  setzeClient(client);
  await assert.rejects(sendeAuftrag({ ziel: '  ' }), /Ziel/);
  await assert.rejects(sendeAuftrag({ ziel: 'x'.repeat(8001) }), /8000/);
  await assert.rejects(sendeAuftrag({ agent: 'monitor', ziel: 'Test' }), /keine Aufträge/);
  assert.equal(aufrufe.filter((a) => a.art === 'insert').length, 0);
});

test('abonniere: abonniert alle fuenf Realtime-Tabellen, beende entfernt den Kanal', async () => {
  const { client, kanaele, entfernt } = baueClient({});
  setzeClient(client);
  await abonniere(() => {});
  assert.equal(kanaele.length, 1);
  const kanal = kanaele[0];
  assert.equal(kanal.abonniert, true);
  assert.deepEqual(kanal.handlers.map((h) => h.filter.table), [
    'aurora_agenten', 'aurora_aufgaben', 'aurora_ereignisse', 'aurora_status', 'aurora_chat',
  ]);
  beende();
  assert.deepEqual(entfernt, [kanal]);
});

test('abonniere: erneutes Abonnieren entfernt den alten Kanal (kein Doppel-Abo)', async () => {
  const { client, kanaele, entfernt } = baueClient({});
  setzeClient(client);
  await abonniere(() => {});
  await abonniere(() => {});
  assert.equal(kanaele.length, 2);
  assert.deepEqual(entfernt, [kanaele[0]]);
});

test('abonniere: Realtime-Aenderungen werden auf 500 ms gedrosselt', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { client, kanaele } = baueClient({});
  setzeClient(client);
  let rufe = 0;
  await abonniere(() => { rufe += 1; });
  const handler = kanaele[0].handlers[0];
  handler.cb();
  handler.cb();
  handler.cb();
  assert.equal(rufe, 0);
  t.mock.timers.tick(500);
  assert.equal(rufe, 1);
});
