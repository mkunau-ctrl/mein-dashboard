import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('claude_projekte').select('*').order('name');
  if (error) throw fehler('Projekte laden', error);
  return { projekte: data };
}
