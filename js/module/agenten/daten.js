import { supabase } from '../../supabase.js';
import { hashText, baueNotiz, pfadFuer } from './obsidian.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [p, w] = await Promise.all([
    supabase.from('agent_profile').select('*'),
    supabase.from('agent_wissen').select('*'),
  ]);
  if (p.error) throw fehler('Profile laden', p.error);
  if (w.error) throw fehler('Wissen laden', w.error);
  return { profile: p.data ?? [], wissen: w.data ?? [] };
}

export async function legeProfilAn({ agent, titel, rolle }) {
  const { error } = await supabase.from('agent_profile').insert({ agent, titel, rolle: rolle ?? '', obsidian_ordner: `Agenten/${agent}` });
  if (error) throw fehler('Agent anlegen', error);
}

export async function speichereProfil(id, felder) {
  const { error } = await supabase.from('agent_profile').update(felder).eq('id', id);
  if (error) throw fehler('Profil speichern', error);
}

function mitHash(w) {
  const hash = hashText(baueNotiz(w));
  return { ...w, inhalts_hash: hash };
}

export async function legeWissenAn(w) {
  const zeile = mitHash({ ...w, quelle: 'manuell', pfad: pfadFuer(w.agent, w.titel) });
  const { error } = await supabase.from('agent_wissen').insert(zeile);
  if (error) throw fehler('Wissen anlegen', error);
}

export async function speichereWissen(id, w) {
  // pfad/inhalts_hash bleiben unberührt: der nächste Obsidian-Abgleich erkennt die Änderung am Inhalt
  const { error } = await supabase.from('agent_wissen').update({
    titel: w.titel, inhalt: w.inhalt, tags: w.tags, status: w.status, vertrauen: w.vertrauen,
  }).eq('id', id);
  if (error) throw fehler('Wissen speichern', error);
}

export async function setzeWissenStatus(id, status) {
  const { error } = await supabase.from('agent_wissen').update({ status }).eq('id', id);
  if (error) throw fehler('Status ändern', error);
}

export async function loescheWissen(id) {
  const { error } = await supabase.from('agent_wissen').delete().eq('id', id);
  if (error) throw fehler('Wissen löschen', error);
}
