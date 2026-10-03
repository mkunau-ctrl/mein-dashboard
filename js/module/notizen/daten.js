import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeNotizen() {
  const { data, error } = await supabase.from('notizen').select('*').order('geaendert_am', { ascending: false });
  if (error) throw fehler('Notizen laden', error);
  return data;
}

export async function speichereNotiz({ id, titel, text }) {
  const jetzt = new Date().toISOString();
  if (id) {
    const { error } = await supabase.from('notizen').update({ titel, text, geaendert_am: jetzt }).eq('id', id);
    if (error) throw fehler('Notiz speichern', error);
    return id;
  }
  const { data, error } = await supabase.from('notizen').insert({ titel, text }).select('id').single();
  if (error) throw fehler('Notiz anlegen', error);
  return data.id;
}

export async function loescheNotiz(id) {
  const { error } = await supabase.from('notizen').delete().eq('id', id);
  if (error) throw fehler('Notiz löschen', error);
}
