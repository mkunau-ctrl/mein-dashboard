import { supabase } from '../../supabase.js';

const TAG_MS = 86_400_000;

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const vor90 = new Date(Date.now() - 90 * TAG_MS).toISOString().slice(0, 10);
  const [items, logs, gewicht, settings] = await Promise.all([
    supabase.from('checklist_items').select('*').eq('aktiv', true).order('sortierung'),
    supabase.from('daily_log').select('datum,item_id,erledigt,wert').gte('datum', vor90),
    supabase.from('weight_log').select('datum,gewicht_kg').order('datum'),
    supabase.from('settings').select('key,value'),
  ]);
  for (const [name, r] of Object.entries({ items, logs, gewicht, settings })) {
    if (r.error) throw fehler(`Laden (${name})`, r.error);
  }
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { items: items.data, logs: logs.data, gewicht: gewicht.data, settings: settingsObj };
}

export async function ladeLogSeit(vonStr) {
  const { data, error } = await supabase
    .from('daily_log').select('datum,item_id,erledigt,wert').gte('datum', vonStr);
  if (error) throw fehler('Log laden', error);
  return data;
}

export async function setzeLogEintrag(datumStr, itemId, erledigt) {
  const { error } = await supabase.from('daily_log').upsert(
    { datum: datumStr, item_id: itemId, erledigt, aktualisiert_am: new Date().toISOString() },
    { onConflict: 'user_id,datum,item_id' },
  );
  if (error) throw fehler('Eintrag speichern', error);
}

export async function speichereItem(item) {
  const felder = {
    label: item.label, kategorie: item.kategorie, typ: item.typ ?? 'haken',
    zielwert: item.zielwert ?? null, einheit: item.einheit ?? null,
    plan_typ: item.plan_typ, plan_wochentage: item.plan_wochentage ?? null,
    plan_intervall_tage: item.plan_intervall_tage ?? null,
    pflicht: item.pflicht ?? true, sortierung: item.sortierung ?? 0,
  };
  const abfrage = item.id
    ? supabase.from('checklist_items').update(felder).eq('id', item.id).select().single()
    : supabase.from('checklist_items').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Punkt speichern', error);
  return data;
}

export async function deaktiviereItem(itemId) {
  const { error } = await supabase.from('checklist_items')
    .update({ aktiv: false }).eq('id', itemId);
  if (error) throw fehler('Punkt entfernen', error);
}

export async function setzeGewicht(datumStr, kg) {
  const { error } = await supabase.from('weight_log').upsert(
    { datum: datumStr, gewicht_kg: kg }, { onConflict: 'user_id,datum' },
  );
  if (error) throw fehler('Gewicht speichern', error);
}

export async function setzeSetting(key, wert) {
  const { error } = await supabase.from('settings').upsert(
    { key, value: wert }, { onConflict: 'user_id,key' },
  );
  if (error) throw fehler('Einstellung speichern', error);
}
