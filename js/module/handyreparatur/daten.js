import { supabase } from '../../supabase.js';
import { legeEinnahmeAn } from '../finanzen/daten.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [auftraege, konten] = await Promise.all([
    supabase.from('handyreparatur_auftraege').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('konten').select('id').order('erstellt_am').limit(1),
  ]);
  if (auftraege.error) throw fehler('Handyreparatur-Auftraege laden', auftraege.error);
  if (konten.error) throw fehler('Konten laden', konten.error);
  return { auftraege: auftraege.data, konten: konten.data };
}

export async function legeAuftragAn({ geraet, notiz, warenwert, voraussichtlicher_verkaufspreis }) {
  const { error } = await supabase.from('handyreparatur_auftraege').insert({
    geraet, notiz: notiz || null, warenwert,
    voraussichtlicher_verkaufspreis: voraussichtlicher_verkaufspreis || null,
  });
  if (error) throw fehler('Handyreparatur-Auftrag anlegen', error);
}

export async function setzeAuftragStatus(auftrag, neuerStatus, { tatsaechlicherVerkaufspreis, kontoId } = {}) {
  if (neuerStatus === 'verkauft') {
    const { error } = await supabase.from('handyreparatur_auftraege').update({
      status: 'verkauft',
      verkauft_am: new Date().toISOString().slice(0, 10),
      tatsaechlicher_verkaufspreis: tatsaechlicherVerkaufspreis,
    }).eq('id', auftrag.id);
    if (error) throw fehler('Auftrag als verkauft markieren', error);
    await legeEinnahmeAn({
      betrag: tatsaechlicherVerkaufspreis, bezeichnung: auftrag.geraet,
      quelle: 'manuell', konto_id: kontoId,
    });
    return;
  }
  const { error } = await supabase.from('handyreparatur_auftraege').update({ status: neuerStatus }).eq('id', auftrag.id);
  if (error) throw fehler('Auftrag-Status aendern', error);
}

export async function entferneAuftrag(id) {
  const { error } = await supabase.from('handyreparatur_auftraege').delete().eq('id', id);
  if (error) throw fehler('Handyreparatur-Auftrag entfernen', error);
}
