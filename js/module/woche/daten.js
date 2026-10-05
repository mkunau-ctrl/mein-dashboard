import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

// Alles, was Wochenplan, Wochenaufgaben und "Zu klaeren" brauchen (Termine ab heute)
export async function ladeAlles(heute) {
  const [bloecke, ausnahmen, aufgaben, klaeren, termine] = await Promise.all([
    supabase.from('wochenplan_bloecke').select('*'),
    supabase.from('wochenplan_ausnahmen').select('*'),
    supabase.from('wochenaufgaben').select('*').order('sortierung'),
    supabase.from('zu_klaeren').select('*').order('sortierung'),
    supabase.from('termine').select('*').eq('erledigt', false).gte('faellig_am', heute),
  ]);
  for (const [name, r] of [['Wochenplan', bloecke], ['Ausnahmen', ausnahmen], ['Wochenaufgaben', aufgaben], ['Zu klären', klaeren], ['Termine', termine]]) {
    if (r.error) throw fehler(`${name} laden`, r.error);
  }
  return {
    bloecke: bloecke.data, ausnahmen: ausnahmen.data, aufgaben: aufgaben.data,
    klaeren: klaeren.data, termine: termine.data,
  };
}

// montag = 'YYYY-MM-DD' der aktuellen Woche (erledigt) oder null (wieder offen)
export async function setzeAufgabeErledigt(id, montag) {
  const { error } = await supabase.from('wochenaufgaben').update({ erledigt_woche: montag }).eq('id', id);
  if (error) throw fehler('Aufgabe speichern', error);
}

export async function setzeKlaerenErledigt(id, erledigt) {
  const { error } = await supabase.from('zu_klaeren')
    .update({ erledigt, erledigt_am: erledigt ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw fehler('Punkt speichern', error);
}

export async function legeKlaerenAn(titel, sortierung) {
  const { error } = await supabase.from('zu_klaeren').insert({ titel, sortierung });
  if (error) throw fehler('Punkt anlegen', error);
}
