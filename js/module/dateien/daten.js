import { supabase } from '../../supabase.js';
import { sichererPfad } from './berechnung.js';

const BUCKET = 'austausch';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeDateien() {
  const { data, error } = await supabase.from('dateien').select('*');
  if (error) throw fehler('Dateien laden', error);
  return data;
}

export async function ladeHoch(datei) {
  const { data: sitzung } = await supabase.auth.getSession();
  const userId = sitzung.session?.user.id;
  if (!userId) throw new Error('Nicht angemeldet');
  const pfad = sichererPfad(userId, datei.name, crypto.randomUUID().slice(0, 8));
  const { error: upFehler } = await supabase.storage.from(BUCKET).upload(pfad, datei, { contentType: datei.type || undefined });
  if (upFehler) throw fehler('Hochladen', upFehler);
  const { error } = await supabase.from('dateien').insert({ name: datei.name, pfad, groesse: datei.size, typ: datei.type || null });
  if (error) {
    await supabase.storage.from(BUCKET).remove([pfad]); // keine Waise im Speicher lassen
    throw fehler('Eintrag speichern', error);
  }
}

export async function holeLink(pfad) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pfad, 300);
  if (error) throw fehler('Download-Link', error);
  return data.signedUrl;
}

export async function loesche(datei) {
  const { error: speicherFehler } = await supabase.storage.from(BUCKET).remove([datei.pfad]);
  if (speicherFehler) throw fehler('Datei löschen', speicherFehler);
  const { error } = await supabase.from('dateien').delete().eq('id', datei.id);
  if (error) throw fehler('Eintrag löschen', error);
}
