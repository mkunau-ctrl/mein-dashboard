import { supabase } from '../../supabase.js';
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeAuftraege } from '../handyreparatur/daten.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [finanzen, auftraege, funde, nachrichten] = await Promise.all([
    ladeFinanzen(),
    ladeAuftraege(),
    supabase.from('flipping_funde').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('verkaufs_nachrichten').select('*').order('erstellt_am', { ascending: false }),
  ]);
  if (funde.error) throw fehler('Funde laden', funde.error);
  if (nachrichten.error) throw fehler('Verkaufs-Nachrichten laden', nachrichten.error);
  return {
    ...finanzen,
    handyreparaturAuftraege: auftraege.auftraege,
    funde: funde.data,
    verkaufsNachrichten: nachrichten.data,
  };
}

export async function setzeNachrichtErledigt(id) {
  const { error } = await supabase.from('verkaufs_nachrichten').update({ status: 'erledigt' }).eq('id', id);
  if (error) throw fehler('Nachricht als erledigt markieren', error);
}

export async function setzeFundStatus(id, status) {
  const { error } = await supabase.from('flipping_funde').update({ status }).eq('id', id);
  if (error) throw fehler('Fund-Status aendern', error);
}

export async function entferneFund(id) {
  const { error } = await supabase.from('flipping_funde').delete().eq('id', id);
  if (error) throw fehler('Fund entfernen', error);
}
