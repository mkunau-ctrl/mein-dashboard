import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [eintraege, settings] = await Promise.all([
    supabase.from('berichtsheft_eintraege').select('*').order('datum', { ascending: false }),
    supabase.from('berichtsheft_settings').select('key,value'),
  ]);
  if (eintraege.error) throw fehler('Einträge laden', eintraege.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { eintraege: eintraege.data, settings: settingsObj };
}

export async function speichereEintrag(eintrag) {
  const felder = {
    datum: eintrag.datum, art: eintrag.art ?? 'betrieb',
    taetigkeiten: eintrag.taetigkeiten, stunden: eintrag.stunden,
  };
  const abfrage = eintrag.id
    ? supabase.from('berichtsheft_eintraege').update(felder).eq('id', eintrag.id).select().single()
    : supabase.from('berichtsheft_eintraege')
      .upsert(felder, { onConflict: 'user_id,datum' }).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Eintrag speichern', error);
  return data;
}

export async function entferneEintrag(id) {
  const { error } = await supabase.from('berichtsheft_eintraege').delete().eq('id', id);
  if (error) throw fehler('Eintrag entfernen', error);
}

export async function speichereSettings(werte) {
  for (const [key, value] of Object.entries(werte)) {
    const { error } = await supabase.from('berichtsheft_settings')
      .upsert({ key, value }, { onConflict: 'user_id,key' });
    if (error) throw fehler('Einstellung speichern', error);
  }
}
