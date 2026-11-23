// Rangliste – Oberfläche. Netzwerk nur über Supabase (eigene Sitzung, getrennt von anderen Seiten).
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/+esm';
import {
  KLASSEN, ALTER, ARME, GRUPPEN, benutzerZuEmail, bereinigeAuswahl, listenId, listenTitel,
  wechselMarkierungen, pruefeMatch, zahlOderNull, matchText,
} from './logik.js';

const db = createClient('https://vogztxoaqbnuciboughd.supabase.co', 'sb_publishable_zTN1v_De9oUhYNCstYf9nA_0dEaD8Y-', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'rangliste-sitzung' },
});

const $ = (id) => document.getElementById(id);
const AUSWAHL_SCHLUESSEL = 'rangliste-auswahl';

const zustand = { rolle: null, benutzer: '', auswahl: ladeAuswahl(), personen: {} };

function ladeAuswahl() {
  try { return bereinigeAuswahl(JSON.parse(localStorage.getItem(AUSWAHL_SCHLUESSEL))); }
  catch { return bereinigeAuswahl(null); }
}
function merkeAuswahl() {
  try { localStorage.setItem(AUSWAHL_SCHLUESSEL, JSON.stringify(zustand.auswahl)); } catch { /* egal */ }
}

function el(tag, klasse, text) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (text != null) e.textContent = text;
  return e;
}

function zeige(ansicht) {
  $('ansicht-login').hidden = ansicht !== 'login';
  $('ansicht-liste').hidden = ansicht !== 'liste';
}

// ---------- Anmeldung ----------
$('login-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const email = benutzerZuEmail(f.get('benutzer'));
  const meldung = $('login-meldung');
  meldung.textContent = '';
  if (!email) { meldung.textContent = 'Benutzername ungültig.'; return; }
  const knopf = ev.target.querySelector('button[type="submit"]');
  knopf.disabled = true;
  const { error } = await db.auth.signInWithPassword({ email, password: String(f.get('passwort') ?? '').trim() });
  knopf.disabled = false;
  if (error) { meldung.textContent = 'Benutzername oder Passwort falsch.'; return; }
  ev.target.reset();
  await start();
});

$('abmelden').addEventListener('click', async () => {
  await db.auth.signOut();
  zustand.rolle = null;
  zeige('login');
});

async function start() {
  const { data } = await db.auth.getSession();
  const sitzung = data?.session;
  if (!sitzung) { zeige('login'); return; }
  const { data: rolle } = await db.from('rl_rollen').select('benutzer, rolle').eq('user_id', sitzung.user.id).maybeSingle();
  if (!rolle) {
    await db.auth.signOut();
    zeige('login');
    $('login-meldung').textContent = 'Dieses Konto hat keinen Zugang zur Rangliste.';
    return;
  }
  zustand.rolle = rolle.rolle;
  zustand.benutzer = rolle.benutzer;
  $('angemeldet').textContent = `Angemeldet als ${rolle.benutzer}`;
  $('knopf-match').hidden = !darfEintragen();
  zeige('liste');
  baueAuswahl();
  await ladeListe();
}

const darfEintragen = () => zustand.rolle === 'chef' || zustand.rolle === 'liste';

// ---------- Listen-Auswahl ----------
$('knopf-auswahl').addEventListener('click', () => {
  const panel = $('auswahl');
  panel.hidden = !panel.hidden;
  $('knopf-auswahl').setAttribute('aria-expanded', String(!panel.hidden));
});

function baueAuswahl() {
  const felder = { gruppe: GRUPPEN, klasse: KLASSEN, alter: ALTER, arm: ARME };
  const frauen = zustand.auswahl.gruppe === 'f';
  for (const [feld, optionen] of Object.entries(felder)) {
    const zeile = document.querySelector(`.auswahl-zeile[data-feld="${feld}"]`);
    zeile.replaceChildren();
    zeile.hidden = frauen && (feld === 'klasse' || feld === 'alter');
    for (const o of optionen) {
      const b = el('button', null, o.titel);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(zustand.auswahl[feld] === o.id));
      b.addEventListener('click', async () => {
        zustand.auswahl = bereinigeAuswahl({ ...zustand.auswahl, [feld]: o.id });
        merkeAuswahl();
        baueAuswahl();
        await ladeListe();
      });
      zeile.append(b);
    }
  }
  $('listen-titel').textContent = listenTitel(zustand.auswahl);
  $('match-liste').textContent = `Liste: ${listenTitel(zustand.auswahl)}`;
}

// ---------- Rangliste laden ----------
let ladeNr = 0;
async function ladeListe() {
  const nr = ++ladeNr;
  const id = listenId(zustand.auswahl);
  const [personen, plaetze, matches] = await Promise.all([
    db.from('rl_personen').select('id, name'),
    db.from('rl_plaetze').select('person_id, platz').eq('liste_id', id).order('platz'),
    db.from('rl_matches').select('a_id, b_id, sieger_id, runden, sieger_platz_vorher, verlierer_platz_vorher, erstellt_am')
      .eq('liste_id', id).order('erstellt_am', { ascending: false }).limit(5),
  ]);
  if (nr !== ladeNr) return; // inzwischen andere Liste gewählt
  const fehler = personen.error || plaetze.error || matches.error;
  if (fehler) {
    $('plaetze').replaceChildren(el('li', 'leer', 'Laden fehlgeschlagen. Bitte neu laden.'));
    return;
  }
  zustand.personen = Object.fromEntries((personen.data ?? []).map((p) => [p.id, p.name]));
  const namenListe = $('namen');
  namenListe.replaceChildren(...Object.values(zustand.personen).sort((a, b) => a.localeCompare(b, 'de'))
    .map((n) => { const o = document.createElement('option'); o.value = n; return o; }));

  const markierungen = wechselMarkierungen(plaetze.data ?? [], matches.data?.[0]);
  $('plaetze').replaceChildren(...(plaetze.data ?? []).map((p) => {
    const li = el('li', 'platz');
    li.append(el('span', 'nr', String(p.platz)), el('span', 'name', zustand.personen[p.person_id] ?? '?'),
      el('span', 'wechsel', markierungen[p.person_id] ?? ''));
    return li;
  }));
  $('leer').hidden = (plaetze.data ?? []).length > 0;

  const datum = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  $('matches').replaceChildren(...((matches.data ?? []).length
    ? matches.data.map((m) => {
      const li = el('li', null, matchText(m, zustand.personen));
      li.append(el('span', 'zeit', datum.format(new Date(m.erstellt_am))));
      return li;
    })
    : [el('li', 'zeit', '–')]));
}

// ---------- Match eintragen ----------
$('knopf-match').addEventListener('click', () => {
  $('match-form').hidden = false;
  $('knopf-match').hidden = true;
  $('match-meldung').textContent = '';
  $('match-meldung').classList.remove('ok');
  $('match-form').querySelector('input[name="a_name"]').focus();
});
$('match-abbrechen').addEventListener('click', schliesseFormular);

function schliesseFormular() {
  $('match-form').reset();
  $('match-form').hidden = true;
  $('knopf-match').hidden = !darfEintragen();
}

$('match-form').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = Object.fromEntries(new FormData(ev.target));
  const meldung = $('match-meldung');
  meldung.classList.remove('ok');
  const problem = pruefeMatch(f);
  if (problem) { meldung.textContent = problem; return; }
  const knopf = ev.target.querySelector('button[type="submit"]');
  knopf.disabled = true;
  const { data, error } = await db.rpc('rl_match_eintragen', {
    p_liste: listenId(zustand.auswahl),
    p_a_name: f.a_name.trim(), p_a_gewicht: zahlOderNull(f.a_gewicht), p_a_alter: zahlOderNull(f.a_alter),
    p_b_name: f.b_name.trim(), p_b_gewicht: zahlOderNull(f.b_gewicht), p_b_alter: zahlOderNull(f.b_alter),
    p_runden: Number(f.runden), p_sieger: f.sieger,
  });
  knopf.disabled = false;
  if (error) { meldung.textContent = error.message || 'Speichern fehlgeschlagen.'; return; }
  const sieger = f.sieger === 'a' ? f.a_name.trim() : f.b_name.trim();
  schliesseFormular();
  await ladeListe();
  const hoch = data && data.sieger_platz_vorher > data.verlierer_platz_vorher;
  $('match-meldung').textContent = '';
  zeigeHinweis(hoch ? `${sieger} steht jetzt auf Platz ${data.sieger_platz_neu}.` : `Gespeichert. ${sieger} bleibt auf Platz ${data?.sieger_platz_neu ?? '–'}.`);
});

function zeigeHinweis(text) {
  document.querySelectorAll('.hinweis-match').forEach((alt) => alt.remove());
  const p = el('p', 'meldung ok hinweis-match', text);
  p.setAttribute('role', 'status');
  $('plaetze').before(p);
  setTimeout(() => p.remove(), 5000);
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && zustand.rolle) ladeListe();
});

start();
