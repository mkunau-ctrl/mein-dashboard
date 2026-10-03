import { supabase } from '../../supabase.js';

// Oeffentlicher VAPID-Schluessel (darf oeffentlich sein; der private liegt nur in Supabase push_konfig)
export const VAPID_PUBLIC = 'BPrgOIvj2NmhezMkmKWV9PfjTg8Fo-nadqtZarOyMu68yR9TpV69wpXRTfdawEzxEAIzGFPLhpRd-S09pJfFLlQ';

export function base64UrlZuBytes(text) {
  const pad = '='.repeat((4 - (text.length % 4)) % 4);
  const roh = atob((text + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(roh, (c) => c.charCodeAt(0));
}

export function pushUnterstuetzt() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function alsAppInstalliert() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

async function aktuellesAbo() {
  const reg = await navigator.serviceWorker.ready;
  return { reg, abo: await reg.pushManager.getSubscription() };
}

// Liefert die Zeile aus push_abos fuer dieses Geraet oder null
export async function ladeEinstellung() {
  if (!pushUnterstuetzt()) return null;
  const { abo } = await aktuellesAbo();
  if (!abo) return null;
  const { data } = await supabase.from('push_abos').select('*').eq('endpoint', abo.endpoint).maybeSingle();
  return data ?? null;
}

export async function aktiviere() {
  const erlaubnis = await Notification.requestPermission();
  if (erlaubnis !== 'granted') return { ok: false, fehler: 'Erlaubnis nicht erteilt (iPhone: Einstellungen → Mitteilungen → Mein Dashboard).' };
  const { reg, abo: vorhanden } = await aktuellesAbo();
  const abo = vorhanden ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlZuBytes(VAPID_PUBLIC) });
  const j = abo.toJSON();
  const { error } = await supabase.from('push_abos').upsert({
    endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
    geraet: /iPhone|iPad/.test(navigator.userAgent) ? 'iPhone' : 'Browser',
  }, { onConflict: 'endpoint' });
  return error ? { ok: false, fehler: error.message } : { ok: true };
}

export async function deaktiviere() {
  const { abo } = await aktuellesAbo();
  if (!abo) return;
  await supabase.from('push_abos').delete().eq('endpoint', abo.endpoint);
  await abo.unsubscribe();
}

export async function speichereFeld(endpoint, feld) {
  const { error } = await supabase.from('push_abos').update(feld).eq('endpoint', endpoint);
  if (error) throw new Error(error.message);
}
