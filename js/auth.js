import { supabase } from './supabase.js';

const REDIRECT_URL = `${location.origin}${location.pathname}`;

export async function sendeMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) return { ok: false, fehler: error.message };
  return { ok: true };
}

export async function holeSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function meldeAb() {
  await supabase.auth.signOut();
}

export function beiAuthWechsel(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null));
}
