import { supabase } from '../../supabase.js';
import { videoPfad } from './berechnung.js';

const BUCKET = 'video-ablage';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeVideos() {
  const { data, error } = await supabase.from('videos').select('*');
  if (error) throw fehler('Videos laden', error);
  return data;
}

export function oeffentlicheUrl(pfad) {
  return supabase.storage.from(BUCKET).getPublicUrl(pfad).data.publicUrl;
}

// ergebnis = Rueckgabe von komprimiere(); original = die gewaehlte Datei
export async function ladeHoch(ergebnis, original, { profil, notiz }) {
  const { data: sitzung } = await supabase.auth.getSession();
  const userId = sitzung.session?.user.id;
  if (!userId) throw new Error('Nicht angemeldet');
  const pfad = videoPfad(userId, original.name, crypto.randomUUID(), ergebnis.endung);
  const { error: upFehler } = await supabase.storage.from(BUCKET)
    .upload(pfad, ergebnis.blob, { contentType: ergebnis.mime, upsert: false });
  if (upFehler) throw fehler('Hochladen', upFehler);
  const { error } = await supabase.from('videos').insert({
    name: original.name,
    pfad,
    original_bytes: original.size,
    groesse: ergebnis.blob.size,
    dauer_s: ergebnis.dauer,
    breite: ergebnis.breite,
    hoehe: ergebnis.hoehe,
    codec: `${ergebnis.videoCodec}${ergebnis.ohneTon ? ' (ohne Ton)' : ''}`,
    profil,
    kompr_sekunden: ergebnis.sekunden,
    notiz: notiz ?? '',
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([pfad]); // keine Waise im Speicher lassen
    throw fehler('Eintrag speichern', error);
  }
}

export async function loesche(video) {
  const { error: speicherFehler } = await supabase.storage.from(BUCKET).remove([video.pfad]);
  if (speicherFehler) throw fehler('Video löschen', speicherFehler);
  const { error } = await supabase.from('videos').delete().eq('id', video.id);
  if (error) throw fehler('Eintrag löschen', error);
}
