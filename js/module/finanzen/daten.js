import { supabase } from '../../supabase.js';
import { naechsteFaelligkeit } from '../todos/planung.js';

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const [expenses, settings, teile, konten, einnahmen, einnahmenVorlagen, schulden, zahlungen] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
    supabase.from('konten').select('*').order('erstellt_am'),
    supabase.from('einnahmen').select('*').order('datum', { ascending: false }),
    supabase.from('einnahmen_vorlagen').select('*').eq('aktiv', true),
    supabase.from('schulden').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('schulden_zahlungen').select('*'),
  ]);
  for (const [name, r] of Object.entries({
    Ausgaben: expenses, Einstellungen: settings, Teile: teile, Konten: konten,
    Einnahmen: einnahmen, 'Einnahmen-Vorlagen': einnahmenVorlagen, Schulden: schulden,
    'Schulden-Zahlungen': zahlungen,
  })) {
    if (r.error) throw fehler(`${name} laden`, r.error);
  }
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return {
    expenses: expenses.data, settings: settingsObj, teile: teile.data,
    konten: konten.data, einnahmen: einnahmen.data, einnahmenVorlagen: einnahmenVorlagen.data,
    schulden: schulden.data, zahlungen: zahlungen.data,
  };
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

export async function legeEinnahmeAn({ betrag, bezeichnung, notiz, datum, quelle, konto_id, wiederkehr }) {
  if (!wiederkehr) {
    const { error } = await supabase.from('einnahmen').insert({
      betrag, bezeichnung: bezeichnung || 'sonstiges', notiz: notiz || null,
      datum: datum || new Date().toISOString().slice(0, 10),
      quelle: quelle || 'manuell', konto_id,
    });
    if (error) throw fehler('Einnahme anlegen', error);
    return;
  }
  const heute = new Date().toISOString().slice(0, 10);
  const naechste = naechsteFaelligkeit(
    { plan_typ: 'monatlich', plan_tag_im_monat: wiederkehr.plan_tag_im_monat },
    datum || heute,
  );
  const { data: vorlage, error: vErr } = await supabase.from('einnahmen_vorlagen').insert({
    bezeichnung, betrag, plan_tag_im_monat: wiederkehr.plan_tag_im_monat,
    naechste_faelligkeit: naechste, konto_id,
  }).select().single();
  if (vErr) throw fehler('Wiederkehrende Einnahme anlegen', vErr);
  const { error: eErr } = await supabase.from('einnahmen').insert({
    betrag, bezeichnung, datum: datum || heute, quelle: quelle || 'manuell',
    konto_id, vorlage_id: vorlage.id,
  });
  if (eErr) throw fehler('Einnahme anlegen', eErr);
}

export async function bestaetigeEinnahmenVorlage(vorlage) {
  const naechste = naechsteFaelligkeit(vorlage, vorlage.naechste_faelligkeit);
  const { error: upErr } = await supabase.from('einnahmen_vorlagen')
    .update({ naechste_faelligkeit: naechste }).eq('id', vorlage.id);
  if (upErr) throw fehler('Vorlage fortschreiben', upErr);
  const { error: eErr } = await supabase.from('einnahmen').insert({
    betrag: vorlage.betrag, bezeichnung: vorlage.bezeichnung,
    datum: vorlage.naechste_faelligkeit, quelle: 'manuell',
    konto_id: vorlage.konto_id, vorlage_id: vorlage.id,
  });
  if (eErr) throw fehler('Einnahme anlegen', eErr);
}

export async function entferneEinnahme(einnahme) {
  if (einnahme.vorlage_id) {
    const { error: vErr } = await supabase.from('einnahmen_vorlagen')
      .update({ aktiv: false }).eq('id', einnahme.vorlage_id);
    if (vErr) throw fehler('Wiederkehr beenden', vErr);
  }
  const { error } = await supabase.from('einnahmen').delete().eq('id', einnahme.id);
  if (error) throw fehler('Einnahme entfernen', error);
}

export async function setzeKontostandStart(betrag, datum) {
  const { error: e1 } = await supabase.from('finance_settings')
    .upsert({ key: 'kontostand_start', value: betrag }, { onConflict: 'user_id,key' });
  if (e1) throw fehler('Kontostand speichern', e1);
  const { error: e2 } = await supabase.from('finance_settings')
    .upsert({ key: 'stand_datum', value: datum }, { onConflict: 'user_id,key' });
  if (e2) throw fehler('Kontostand speichern', e2);
}

export async function speicherTeil(teil) {
  const felder = {
    bezeichnung: teil.bezeichnung, bestand: teil.bestand ?? 0,
    soll_bestand: teil.soll_bestand ?? null, status: teil.status ?? 'da',
    einzelwert: teil.einzelwert ?? null,
  };
  const abfrage = teil.id
    ? supabase.from('parts').update(felder).eq('id', teil.id).select().single()
    : supabase.from('parts').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Teil speichern', error);
  return data;
}

export async function entferneTeil(id) {
  const { error } = await supabase.from('parts').delete().eq('id', id);
  if (error) throw fehler('Teil entfernen', error);
}

export async function setzeStatus(id, status) {
  const { error } = await supabase.from('parts').update({ status }).eq('id', id);
  if (error) throw fehler('Status ändern', error);
}

export async function legeKontoAn({ id, name, kontostand_start, stand_datum }) {
  const felder = { name, kontostand_start, stand_datum };
  const abfrage = id
    ? supabase.from('konten').update(felder).eq('id', id).select().single()
    : supabase.from('konten').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Konto speichern', error);
  return data;
}

export async function legeSchuldAn({ person, gesamtbetrag, richtung, notiz }) {
  const { error } = await supabase.from('schulden').insert({
    person, gesamtbetrag, richtung, notiz: notiz || null,
  });
  if (error) throw fehler('Schuld anlegen', error);
}

export async function verbucheZahlung(schuldId, betrag) {
  const { error } = await supabase.from('schulden_zahlungen').insert({
    schuld_id: schuldId, betrag,
  });
  if (error) throw fehler('Zahlung verbuchen', error);
}
