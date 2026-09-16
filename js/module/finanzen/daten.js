import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [expenses, settings] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
  ]);
  if (expenses.error) throw fehler('Ausgaben laden', expenses.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { expenses: expenses.data, settings: settingsObj };
}

export async function legeAusgabeAn({ betrag, kategorie, notiz, datum, quelle }) {
  const { error } = await supabase.from('expenses').insert({
    betrag, kategorie: kategorie || 'sonstiges', notiz: notiz || null,
    datum: datum || new Date().toISOString().slice(0, 10),
    quelle: quelle || 'manuell',
  });
  if (error) throw fehler('Ausgabe anlegen', error);
}

export async function entferneAusgabe(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw fehler('Ausgabe entfernen', error);
}

export async function setzeKontostandStart(betrag, datum) {
  const { error: e1 } = await supabase.from('finance_settings')
    .upsert({ key: 'kontostand_start', value: betrag }, { onConflict: 'user_id,key' });
  if (e1) throw fehler('Kontostand speichern', e1);
  const { error: e2 } = await supabase.from('finance_settings')
    .upsert({ key: 'stand_datum', value: datum }, { onConflict: 'user_id,key' });
  if (e2) throw fehler('Kontostand speichern', e2);
}
