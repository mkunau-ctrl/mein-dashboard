import { supabase } from '../../supabase.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [sendungen, termine, ereignisse] = await Promise.all([
    supabase.from('sendungen').select('*'),
    supabase.from('termine').select('*'),
    supabase.from('sendungen_ereignisse').select('*').order('erstellt_am'),
  ]);
  if (sendungen.error) throw fehler('Sendungen laden', sendungen.error);
  if (termine.error) throw fehler('Termine laden', termine.error);
  if (ereignisse.error) throw fehler('Sendungs-Ereignisse laden', ereignisse.error);
  return { sendungen: sendungen.data, termine: termine.data, ereignisse: ereignisse.data };
}

export async function legeSendungAn({ haendler, trackingnummer, beschreibung }) {
  const { error } = await supabase.from('sendungen').insert({
    haendler, trackingnummer: trackingnummer || null, beschreibung: beschreibung || null,
    quelle: 'manuell',
  });
  if (error) throw fehler('Sendung anlegen', error);
}

export async function setzeSendungStatus(id, status) {
  const { error } = await supabase.from('sendungen')
    .update({ status, letzte_aktualisierung: new Date().toISOString() }).eq('id', id);
  if (error) throw fehler('Sendungsstatus ändern', error);
}

export async function entferneSendung(id) {
  const { error } = await supabase.from('sendungen').delete().eq('id', id);
  if (error) throw fehler('Sendung entfernen', error);
}

export async function legeTerminAn({ titel, faellig_am }) {
  const { error } = await supabase.from('termine').insert({ titel, faellig_am, quelle: 'manuell' });
  if (error) throw fehler('Termin anlegen', error);
}

export async function hakeTerminAb(id) {
  const { error } = await supabase.from('termine').update({ erledigt: true }).eq('id', id);
  if (error) throw fehler('Termin abhaken', error);
}

export async function entferneTermin(id) {
  const { error } = await supabase.from('termine').delete().eq('id', id);
  if (error) throw fehler('Termin entfernen', error);
}
