// Supabase-Zugriff des KI-Moduls. Der Client ist fuer Tests injizierbar.

import { AGENTEN, istChatbar } from './status.js';
import { pruefeEingabe } from './chat.js';

let eigenerClient = null;

export function setzeClient(client) {
  eigenerClient = client;
}

async function holeClient() {
  if (eigenerClient) return eigenerClient;
  const { supabase } = await import('../../supabase.js');
  return supabase;
}

function pruefe(kontext, antwort) {
  if (antwort?.error) {
    throw new Error(`${kontext}: ${antwort.error.message ?? 'unbekannter Fehler'}`);
  }
  return antwort?.data;
}

function sortiereAgenten(zeilen) {
  const rang = (agent) => {
    const i = AGENTEN.indexOf(agent);
    return i === -1 ? AGENTEN.length : i;
  };
  return [...zeilen].sort((a, b) => (rang(a.agent) - rang(b.agent))
    || String(a.agent).localeCompare(String(b.agent)));
}

export async function ladeAlles() {
  const client = await holeClient();
  const [statusAntwort, agentenAntwort, aufgabenAntwort, ereignisseAntwort,
    chatAntwort, auftraegeAntwort] = await Promise.all([
    client.from('aurora_status').select('*').limit(1),
    client.from('aurora_agenten').select('*').order('agent', { ascending: true }),
    client.from('aurora_aufgaben').select('*').order('aktualisiert_am', { ascending: false }).limit(200),
    client.from('aurora_ereignisse').select('*').order('zeitpunkt', { ascending: false }).limit(40),
    client.from('aurora_chat').select('*').order('erstellt_am', { ascending: false }).limit(200),
    client.from('aurora_auftraege').select('*').order('erstellt_am', { ascending: false }).limit(50),
  ]);

  const statusDaten = pruefe('AURORA-Status laden', statusAntwort);
  const status = Array.isArray(statusDaten) ? (statusDaten[0] ?? null) : (statusDaten ?? null);

  return {
    status,
    agenten: sortiereAgenten(pruefe('Agenten laden', agentenAntwort) || []),
    aufgaben: pruefe('Aufgaben laden', aufgabenAntwort) || [],
    ereignisse: pruefe('Ereignisse laden', ereignisseAntwort) || [],
    chat: pruefe('Chat laden', chatAntwort) || [],
    auftraege: pruefe('Aufträge laden', auftraegeAntwort) || [],
  };
}

export async function sendeChat({ agent, text }) {
  if (!istChatbar(agent)) throw new Error('Dieser Agent kann nicht angeschrieben werden.');
  const eingabe = pruefeEingabe(text);
  if (!eingabe.ok) throw new Error(eingabe.fehler);

  const client = await holeClient();
  const antwort = await client.from('aurora_chat').insert({
    agent,
    rolle: 'nutzer',
    text: eingabe.text,
    status: 'neu',
  }).select().single();
  return pruefe('Nachricht senden', antwort);
}

export async function sendeAuftrag({ agent = 'orchestrator', ziel, erfolgskriterium = '' }) {
  if (!istChatbar(agent)) throw new Error('Dieser Agent kann keine Aufträge annehmen.');
  const zielText = typeof ziel === 'string' ? ziel.trim() : '';
  if (zielText.length === 0) throw new Error('Bitte ein Ziel eingeben.');
  if (zielText.length > 8000) throw new Error('Das Ziel darf höchstens 8000 Zeichen lang sein.');
  const kriterium = typeof erfolgskriterium === 'string' ? erfolgskriterium.trim() : '';
  if (kriterium.length > 2000) throw new Error('Das Erfolgskriterium darf höchstens 2000 Zeichen lang sein.');

  const client = await holeClient();
  const antwort = await client.from('aurora_auftraege').insert({
    agent,
    ziel: zielText,
    erfolgskriterium: kriterium,
  }).select().single();
  return pruefe('Auftrag senden', antwort);
}

const REALTIME_TABELLEN = [
  'aurora_agenten', 'aurora_aufgaben', 'aurora_ereignisse', 'aurora_status', 'aurora_chat',
];
const DROSSEL_MS = 500;
const POLLING_MS = 10_000;

let kanal = null;
let pollTimer = null;
let drosselTimer = null;
let clientRef = null;

function plane(onAenderung) {
  if (drosselTimer) return;
  drosselTimer = setTimeout(() => {
    drosselTimer = null;
    try { onAenderung(); } catch { /* Ansicht darf das Modul nicht abstuerzen lassen */ }
  }, DROSSEL_MS);
  drosselTimer.unref?.();
}

export function beende() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (drosselTimer) { clearTimeout(drosselTimer); drosselTimer = null; }
  if (kanal && clientRef?.removeChannel) {
    try { clientRef.removeChannel(kanal); } catch { /* Kanal war schon weg */ }
  }
  kanal = null;
}

export async function abonniere(onAenderung) {
  beende();
  const client = await holeClient();
  clientRef = client;

  kanal = client.channel('aurora-dashboard');
  for (const tabelle of REALTIME_TABELLEN) {
    kanal.on('postgres_changes',
      { event: '*', schema: 'public', table: tabelle },
      () => plane(onAenderung));
  }
  kanal.subscribe();

  pollTimer = setInterval(() => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    plane(onAenderung);
  }, POLLING_MS);
  pollTimer.unref?.();

  return kanal;
}
