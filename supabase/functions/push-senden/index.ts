// Edge Function: prueft Ausloeser und verschickt Web-Push an alle Geraete (pg_cron alle 15 Min).
// Konfiguration (VAPID, Cron-Secret) liegt in Tabelle push_konfig (nur Service-Role).
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { baueMeldungen, inRuhezeit, zaehleOffen } from './logik.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function berlinJetzt() {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => teile.find((p) => p.type === t)!.value;
  return { heute: `${g('year')}-${g('month')}-${g('day')}`, minuten: Number(g('hour')) * 60 + Number(g('minute')) };
}

Deno.serve(async (req) => {
  const { data: konf } = await db.from('push_konfig').select('key,wert');
  const k = Object.fromEntries((konf ?? []).map((r) => [r.key, r.wert]));
  if (!k.cron_secret || req.headers.get('x-cron-secret') !== k.cron_secret) {
    return new Response('forbidden', { status: 403 });
  }
  webpush.setVapidDetails(k.vapid_subject, k.vapid_public, k.vapid_private);
  const body = await req.json().catch(() => ({}));

  const { data: abos } = await db.from('push_abos').select('*');
  const nachUser = new Map<string, any[]>();
  for (const a of abos ?? []) nachUser.set(a.user_id, [...(nachUser.get(a.user_id) ?? []), a]);

  const { heute, minuten } = berlinJetzt();
  const jetztMs = Date.now();
  let gesendet = 0, entfernt = 0;

  for (const [userId, geraete] of nachUser) {
    let meldungen: any[];
    let badge = 0;
    if (body.test) {
      meldungen = [{ kategorie: 'test', schluessel: `test:${jetztMs}`, titel: 'Mein Dashboard', text: 'Test-Benachrichtigung funktioniert.', url: '#/home' }];
    } else {
      const [termine, todos, rechnungen, sendungen, funde] = await Promise.all([
        db.from('termine').select('*').eq('user_id', userId).eq('erledigt', false),
        db.from('todos').select('*').eq('user_id', userId).eq('erledigt', false),
        db.from('rechnungen').select('*').eq('user_id', userId).neq('status', 'bezahlt'),
        db.from('sendungen').select('*').eq('user_id', userId),
        db.from('flipping_funde').select('*').eq('user_id', userId).eq('status', 'neu'),
      ]);
      const daten = { termine: termine.data ?? [], todos: todos.data ?? [], rechnungen: rechnungen.data ?? [], sendungen: sendungen.data ?? [], funde: funde.data ?? [] };
      meldungen = baueMeldungen({ ...daten, heute, minuten, jetztMs });
      badge = zaehleOffen({ ...daten, heute });
      const { data: schon } = await db.from('push_gesendet').select('schluessel').eq('user_id', userId).in('schluessel', meldungen.map((m) => m.schluessel));
      const bekannt = new Set((schon ?? []).map((r) => r.schluessel));
      meldungen = meldungen.filter((m) => !bekannt.has(m.schluessel));
    }

    for (const m of meldungen) {
      let ok = false;
      for (const a of geraete) {
        if (m.kategorie !== 'test') {
          if (!a[`kat_${m.kategorie}`]) continue;
          if (a.ruhe_aktiv && inRuhezeit(minuten, a.ruhe_von, a.ruhe_bis)) continue;
        }
        try {
          await webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            JSON.stringify({ titel: m.titel, text: m.text, url: m.url, tag: m.schluessel, badge }),
            { TTL: 3600 },
          );
          ok = true; gesendet++;
        } catch (e) {
          if (e.statusCode === 404 || e.statusCode === 410) {
            await db.from('push_abos').delete().eq('id', a.id); entfernt++;
          } else console.error('push fehler', e.statusCode, e.body);
        }
      }
      if (ok && m.kategorie !== 'test') await db.from('push_gesendet').upsert({ user_id: userId, schluessel: m.schluessel });
    }
  }
  return Response.json({ gesendet, entfernt, heute, minuten });
});
