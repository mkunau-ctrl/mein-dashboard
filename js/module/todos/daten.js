import { supabase } from '../../supabase.js';
import { naechsteFaelligkeit } from './planung.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

const VOR_60_TAGEN = () =>
  new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

export async function ladeAlles() {
  const [offen, erledigt, vorlagen] = await Promise.all([
    supabase.from('todos').select('*').eq('erledigt', false).order('erstellt_am'),
    supabase.from('todos').select('*').eq('erledigt', true)
      .gte('erledigt_am', VOR_60_TAGEN()).order('erledigt_am', { ascending: false }),
    supabase.from('todo_vorlagen').select('*').eq('aktiv', true),
  ]);
  for (const [name, r] of Object.entries({ offen, erledigt, vorlagen })) {
    if (r.error) throw fehler(`Laden (${name})`, r.error);
  }
  return { offen: offen.data, erledigt: erledigt.data, vorlagen: vorlagen.data };
}

export async function legeTodoAn({ text, faellig, wiederkehr }) {
  if (!wiederkehr) {
    const { error } = await supabase.from('todos').insert({ text, faellig: faellig || null });
    if (error) throw fehler('Todo anlegen', error);
    return;
  }
  const heute = new Date().toISOString().slice(0, 10);
  const vorlageFelder = {
    text,
    plan_typ: wiederkehr.plan_typ,
    plan_wochentage: wiederkehr.plan_typ === 'wochentage' ? wiederkehr.plan_wochentage : null,
    plan_tag_im_monat: wiederkehr.plan_typ === 'monatlich' ? wiederkehr.plan_tag_im_monat : null,
    naechste_faelligkeit: faellig || naechsteFaelligkeit({
      plan_typ: wiederkehr.plan_typ,
      plan_wochentage: wiederkehr.plan_wochentage,
      plan_tag_im_monat: wiederkehr.plan_tag_im_monat,
    }, heute),
  };
  const { data: vorlage, error: vErr } = await supabase
    .from('todo_vorlagen').insert(vorlageFelder).select().single();
  if (vErr) throw fehler('Wiederkehr anlegen', vErr);
  const { error: tErr } = await supabase.from('todos')
    .insert({ text, faellig: vorlage.naechste_faelligkeit, vorlage_id: vorlage.id });
  if (tErr) throw fehler('Todo anlegen', tErr);
}

export async function hakeAb(todo) {
  const { error } = await supabase.from('todos')
    .update({ erledigt: true, erledigt_am: new Date().toISOString() }).eq('id', todo.id);
  if (error) throw fehler('Abhaken', error);
  if (!todo.vorlage_id) return;

  const { data: vorlage, error: vErr } = await supabase
    .from('todo_vorlagen').select('*').eq('id', todo.vorlage_id).single();
  if (vErr) throw fehler('Vorlage laden', vErr);
  if (!vorlage.aktiv) return;

  const naechste = naechsteFaelligkeit(vorlage, todo.faellig ?? vorlage.naechste_faelligkeit);
  const { error: upErr } = await supabase.from('todo_vorlagen')
    .update({ naechste_faelligkeit: naechste }).eq('id', vorlage.id);
  if (upErr) throw fehler('Vorlage fortschreiben', upErr);
  const { error: neuErr } = await supabase.from('todos')
    .insert({ text: vorlage.text, faellig: naechste, vorlage_id: vorlage.id });
  if (neuErr) throw fehler('Naechste Instanz anlegen', neuErr);
}

export async function entferneTodo(todo) {
  if (todo.vorlage_id) {
    const { error: vErr } = await supabase.from('todo_vorlagen')
      .update({ aktiv: false }).eq('id', todo.vorlage_id);
    if (vErr) throw fehler('Wiederkehr beenden', vErr);
  }
  const { error } = await supabase.from('todos').delete().eq('id', todo.id);
  if (error) throw fehler('Todo entfernen', error);
}
