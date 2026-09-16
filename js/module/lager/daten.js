import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('parts').select('*');
  if (error) throw fehler('Teile laden', error);
  return { teile: data };
}

export async function speicherTeil(teil) {
  const felder = {
    bezeichnung: teil.bezeichnung, bestand: teil.bestand ?? 0,
    soll_bestand: teil.soll_bestand ?? null, status: teil.status ?? 'da',
    einzelwert: teil.einzelwert ?? null,
  };
  const abfrage = teil.id
    ? supabase.from('parts').update(felder).eq('id', teil.id).select().single()
    : supabase.from('parts').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Teil speichern', error);
  return data;
}

export async function entferneTeil(id) {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) throw fehler('Teil entfernen', error);
}

export async function setzeStatus(id, status) {
  const { error } = await supabase.from('parts').update({ status }).eq('id', id);
  if (error) throw fehler('Status ändern', error);
}
