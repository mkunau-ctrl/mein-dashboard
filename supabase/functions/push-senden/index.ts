// Edge Function: prueft Ausloeser, schreibt die Glocken-Liste (meldungen) und verschickt Web-Push (pg_cron alle 15 Min).
// Konfiguration (VAPID, Cron-Secret) liegt in Tabelle push_konfig (nur Service-Role).
// Zwei Zugaenge: Cron mit Header x-cron-secret (alles) ODER eingeloggter Nutzer (JWT) nur fuer {"test":true}.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { baueMeldungen, inRuhezeit, schalterErlaubt, zaehleOffen } from './logik.js';
import { briefingFaellig, briefingMeldung, wetterAusOpenMeteo } from './wochenplan.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function berlinJetzt() {
  const teile = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const g = (t: string) => teile.find((p) => p.type === t)!.value;
  return { heute: `${g('year')}-${g('month')}-${g('day')}`, minuten: Number(g('hour')) * 60 + Number(g('minute')) };
}

// Wetter Lemgo (Open-Meteo, kein Key). Bei Fehler null -> Briefing geht trotzdem raus.
async function holeWetter(stunde: number) {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=52.03&longitude=8.90'
      + '&hourly=temperature_2m,precipitation,precipitation_probability,weather_code'
      + '&daily=temperature_2m_max,temperature_2m_min,wind_speed_10m_max&timezone=Europe%2FBerlin&forecast_days=1';
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return r.ok ? wetterAusOpenMeteo(await r.json(), stunde) : null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  const { data: konf } = await db.from('push_konfig').select('key,wert');
  const k = Object.fromEntries((konf ?? []).map((r) => [r.key, r.wert]));
  const body = await req.json().catch(() => ({}));

  let nurUser: string | null = null; // gesetzt = Aufruf aus der App, nur Testpush an dieses Konto
  if (!k.cron_secret || req.headers.get('x-cron-secret') !== k.cron_secret) {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: u } = token ? await db.auth.getUser(token) : { data: null };
    if (!u?.user || !body.test) return new Response('forbidden', { status: 403 });
    nurUser = u.user.id;
  }
  webpush.setVapidDetails(k.vapid_subject, k.vapid_public, k.vapid_private);

  const [{ data: abos }, { data: einstellungen }] = await Promise.all([
    db.from('push_abos').select('*'),
    db.from('benachrichtigung_einst').select('user_id,schalter,briefing_zeiten'),
  ]);
  const nachUser = new Map<string, any[]>();
  for (const a of abos ?? []) nachUser.set(a.user_id, [...(nachUser.get(a.user_id) ?? []), a]);
  // Auch Nutzer ohne Geraet bekommen die Glocken-Liste
  for (const e of einstellungen ?? []) if (!nachUser.has(e.user_id)) nachUser.set(e.user_id, []);
  const schalterVon = new Map((einstellungen ?? []).map((e) => [e.user_id, e.schalter ?? {}]));
  const zeitenVon = new Map((einstellungen ?? []).map((e) => [e.user_id, e.briefing_zeiten ?? {}]));

  const { heute, minuten } = berlinJetzt();
  const jetztMs = Date.now();
  let gesendet = 0, entfernt = 0, gespeichert = 0;

  for (const [userId, geraete] of nachUser) {
    if (nurUser && userId !== nurUser) continue;
    const schalter = schalterVon.get(userId) ?? {};
    let meldungen: any[];
    let badge = 0;
    if (body.test) {
      meldungen = [{ art: 'test', schluessel: `test:${jetztMs}`, titel: 'Mein Dashboard', text: 'Test-Benachrichtigung funktioniert.', url: '#/home' }];
    } else {
      const seit = new Date(jetztMs - 48 * 3600e3).toISOString();
      const [termine, todos, rechnungen, sendungen, funde, verkaeufe, vorlagenAus, vorlagenEin, schulden, zahlungen, mails] = await Promise.all([
        db.from('termine').select('*').eq('user_id', userId).eq('erledigt', false),
        db.from('todos').select('*').eq('user_id', userId).eq('erledigt', false),
        db.from('rechnungen').select('*').eq('user_id', userId).neq('status', 'bezahlt'),
        db.from('sendungen').select('*').eq('user_id', userId),
        db.from('flipping_funde').select('*').eq('user_id', userId).eq('status', 'neu'),
        db.from('verkaufs_nachrichten').select('*').eq('user_id', userId).gte('erstellt_am', seit),
        db.from('ausgaben_vorlagen').select('*').eq('user_id', userId).eq('aktiv', true),
        db.from('einnahmen_vorlagen').select('*').eq('user_id', userId).eq('aktiv', true),
        db.from('schulden').select('*').eq('user_id', userId),
        db.from('schulden_zahlungen').select('schuld_id,betrag').eq('user_id', userId),
        db.from('meldungen').select('*').eq('user_id', userId).eq('art', 'email').gte('erstellt_am', seit),
      ]);
      const daten = {
        termine: termine.data ?? [], todos: todos.data ?? [], rechnungen: rechnungen.data ?? [],
        sendungen: sendungen.data ?? [], funde: funde.data ?? [], verkaeufe: verkaeufe.data ?? [],
        vorlagenAus: vorlagenAus.data ?? [], vorlagenEin: vorlagenEin.data ?? [],
        schulden: schulden.data ?? [], schuldenZahlungen: zahlungen.data ?? [], mails: mails.data ?? [],
      };
      meldungen = baueMeldungen({ ...daten, heute, minuten, jetztMs });

      // Tagesbriefing: nur im Sendefenster und wenn eingeschaltet (Wochenplan-Daten erst dann laden)
      const zeiten = zeitenVon.get(userId) ?? {};
      if (schalterErlaubt(schalter, 'briefing') && briefingFaellig(heute, minuten, zeiten)) {
        const [bloecke, ausnahmen, aufgaben, klaeren, wetter] = await Promise.all([
          db.from('wochenplan_bloecke').select('*').eq('user_id', userId),
          db.from('wochenplan_ausnahmen').select('*').eq('user_id', userId),
          db.from('wochenaufgaben').select('*').eq('user_id', userId).order('sortierung'),
          db.from('zu_klaeren').select('titel').eq('user_id', userId).eq('erledigt', false).order('sortierung'),
          holeWetter(Math.floor(minuten / 60)),
        ]);
        // Termine der naechsten 2 Tage (heute + morgen) fuer Tagesplan und Vorschau
        const { data: bTermine } = await db.from('termine').select('*').eq('user_id', userId).eq('erledigt', false).gte('faellig_am', heute);
        const b = briefingMeldung({
          datum: heute, minuten, zeiten, bloecke: bloecke.data ?? [], ausnahmen: ausnahmen.data ?? [],
          termine: bTermine ?? [], aufgaben: aufgaben.data ?? [], zuKlaeren: (klaeren.data ?? []).map((k) => k.titel), wetter,
        });
        if (b) meldungen.push(b);
      }
      meldungen = meldungen.filter((m) => schalterErlaubt(schalter, m.art));
      badge = zaehleOffen({ ...daten, heute });

      // Glocken-Liste: jede neue Meldung genau einmal (E-Mails stehen schon drin)
      const neu = meldungen.filter((m) => !m.schonGespeichert).map((m) => ({ user_id: userId, schluessel: m.schluessel, art: m.art, titel: m.titel, text: m.text, url: m.url }));
      if (neu.length) {
        const { data: ein } = await db.from('meldungen').upsert(neu, { onConflict: 'user_id,schluessel', ignoreDuplicates: true }).select('id');
        gespeichert += ein?.length ?? 0;
      }

      const { data: schon } = await db.from('push_gesendet').select('schluessel').eq('user_id', userId).in('schluessel', meldungen.map((m) => m.schluessel));
      const bekannt = new Set((schon ?? []).map((r) => r.schluessel));
      meldungen = meldungen.filter((m) => !bekannt.has(m.schluessel));
    }

    for (const m of meldungen) {
      let ok = false;
      for (const a of geraete) {
        if (m.art !== 'test' && a.ruhe_aktiv && inRuhezeit(minuten, a.ruhe_von, a.ruhe_bis)) continue;
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
      // Ohne Geraet (nur Glocke) oder erfolgreich gesendet: nicht erneut versuchen
      if ((ok || geraete.length === 0) && m.art !== 'test') await db.from('push_gesendet').upsert({ user_id: userId, schluessel: m.schluessel });
    }
  }
  return Response.json({ gesendet, entfernt, gespeichert, heute, minuten });
});
