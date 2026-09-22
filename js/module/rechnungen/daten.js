import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const { data, error } = await supabase.from('rechnungen').select('*').order('faellig_am');
  if (error) throw fehler('Rechnungen laden', error);
  return { rechnungen: data };
}

export async function legeRechnungAn({ haendler, betrag, faellig_am, notiz, quelle }) {
  const { error } = await supabase.from('rechnungen').insert({
    haendler, betrag, faellig_am, notiz: notiz || null, quelle: quelle || 'manuell',
  });
  if (error) throw fehler('Rechnung anlegen', error);
}

export async function setzeRechnungBezahlt(id) {
  const { error } = await supabase.from('rechnungen')
    .update({ status: 'bezahlt', bezahlt_am: new Date().toISOString().slice(0, 10) }).eq('id', id);
  if (error) throw fehler('Rechnung als bezahlt markieren', error);
}

export async function entferneRechnung(id) {
  const { error } = await supabase.from('rechnungen').delete().eq('id', id);
  if (error) throw fehler('Rechnung entfernen', error);
}
