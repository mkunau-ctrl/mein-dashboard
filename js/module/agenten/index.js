import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import {
  ladeAlles, legeProfilAn, speichereProfil, legeWissenAn, speichereWissen, setzeWissenStatus, loescheWissen,
} from './daten.js';
import {
  sortiereProfile, zaehleWissen, filtereWissen, listeAusText, listeZuText, tagsAusText,
  agentAusSegment, segmentFuerAgent, pruefeProfil, pruefeWissen,
} from './berechnung.js';
import { GEMEINSAM, baueNotiz } from './obsidian.js';

// Alles aus Daten geht ausschliesslich über textContent/value (kein innerHTML mit Fremdtext).
function el(tag, klasse, text) {
  const k = document.createElement(tag);
  if (klasse) k.className = klasse;
  if (text !== undefined && text !== null) k.textContent = String(text);
  return k;
}

const STATUS_TEXT = { aktiv: 'Aktiv', vorschlag: 'Vorschlag', archiv: 'Archiv' };
const STATUS_FILTER = ['alle', 'aktiv', 'vorschlag', 'archiv'];

let container = null;
let zustand = { profile: [], wissen: [] };
let suchtext = '';
let statusFilter = 'alle';
let offenesWissen = null; // id oder 'neu'
let profilBearbeiten = false;
let neuerAgent = false;
let meldung = '';
let laedt = false;
let hashListener = null;

function setzeMeldung(text) {
  meldung = text || '';
  const feld = container?.querySelector('#ag-meldung');
  if (feld) { feld.textContent = meldung; feld.hidden = !meldung; }
}

async function lade() {
  laedt = true;
  try {
    zustand = await ladeAlles();
    setzeMeldung('');
  } catch (e) {
    setzeMeldung(e.message);
  } finally {
    laedt = false;
  }
  zeichne();
}

async function aktion(fn) {
  try { await fn(); await lade(); } catch (e) { setzeMeldung(e.message); }
}

function chips(liste) {
  const zeile = el('div', 'ag-chips');
  zeile.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;';
  for (const t of liste ?? []) {
    const c = el('span', 'chip', t);
    c.style.cssText = 'padding:3px 10px;font-size:.78rem;';
    zeile.appendChild(c);
  }
  return zeile;
}

function feld(beschriftung, eingabe) {
  const box = el('label', null);
  box.style.cssText = 'display:block;margin:8px 0;';
  const t = el('span', 'lade', beschriftung);
  t.style.cssText = 'display:block;margin-bottom:3px;font-size:.82rem;';
  box.append(t, eingabe);
  eingabe.style.width = '100%';
  return box;
}

function textfeld(wert, platzhalter) {
  const i = el('input');
  i.type = 'text'; i.value = wert ?? ''; if (platzhalter) i.placeholder = platzhalter;
  i.autocomplete = 'off';
  return i;
}

function textbereich(wert, zeilen) {
  const a = el('textarea');
  a.rows = zeilen; a.value = wert ?? '';
  a.style.minHeight = '90px';
  return a;
}

function knopf(text, onClick, klasse = 'knopf-neutral') {
  const k = el('button', klasse, text);
  k.type = 'button';
  k.style.width = 'auto';
  k.addEventListener('click', onClick);
  return k;
}

// ---------- Übersicht ----------
function zeichneListe(inhalt) {
  const zaehler = zaehleWissen(zustand.wissen);

  const info = el('div', 'stat-karte');
  info.appendChild(el('p', 'lade', 'Dauerhafte Agenten: jeder weiß, wozu er gehört, was er darf und hat sein eigenes Wissen. '
    + 'Das Wissen ist Obsidian-kompatibel (Ordner Agenten/<Agent>/ im Vault, Abgleich per node automatisierung/obsidian-sync.mjs).'));
  inhalt.appendChild(info);

  const kopf = el('div', 'section-head');
  kopf.appendChild(el('h2', null, 'Agenten'));
  kopf.appendChild(knopf(neuerAgent ? 'Abbrechen' : 'Neuer Agent', () => { neuerAgent = !neuerAgent; zeichne(); }, 'link-muted'));
  inhalt.appendChild(kopf);

  if (neuerAgent) {
    const form = el('div', 'stat-karte');
    const k = textfeld('', 'z. B. kalender (nur a-z und 0-9)');
    const t = textfeld('', 'Titel, z. B. Kalender');
    const r = textfeld('', 'Wofür ist der Agent zuständig?');
    form.append(feld('Kennung', k), feld('Titel', t), feld('Aufgabe', r));
    form.appendChild(knopf('Anlegen', () => {
      const werte = { agent: k.value.trim().toLowerCase(), titel: t.value.trim(), rolle: r.value.trim() };
      const p = pruefeProfil(werte);
      if (!p.ok) { setzeMeldung(p.fehler); return; }
      void aktion(async () => { await legeProfilAn(werte); neuerAgent = false; location.hash = `#/agenten/${werte.agent}`; });
    }));
    inhalt.appendChild(form);
  }

  const liste = el('div', 'punkt-liste');
  for (const p of sortiereProfile(zustand.profile)) {
    const z = zaehler[p.agent] ?? { aktiv: 0, vorschlag: 0 };
    const zeile = el('div', 'punkt-zeile');
    zeile.style.cursor = 'pointer';
    const info2 = el('div', 'punkt-info');
    info2.appendChild(el('strong', null, `${p.titel}${p.aktiv ? '' : ' (aus)'}`));
    info2.appendChild(el('small', null, p.rolle || '–'));
    info2.appendChild(chips(p.zugehoerigkeit));
    info2.appendChild(el('small', null, `${z.aktiv} Wissen${z.vorschlag ? ` · ${z.vorschlag} Vorschläge offen` : ''}`));
    zeile.appendChild(info2);
    zeile.addEventListener('click', () => { location.hash = `#/agenten/${segmentFuerAgent(p.agent)}`; });
    liste.appendChild(zeile);
  }
  if (zustand.profile.length === 0 && !laedt) liste.appendChild(el('p', 'lade', 'Noch keine Agenten.'));
  inhalt.appendChild(liste);

  const gz = zaehler[GEMEINSAM] ?? { aktiv: 0, vorschlag: 0 };
  const gem = el('div', 'punkt-liste');
  const gzeile = el('div', 'punkt-zeile');
  gzeile.style.cursor = 'pointer';
  const gi = el('div', 'punkt-info');
  gi.appendChild(el('strong', null, 'Gemeinsames Wissen (für alle Agenten)'));
  gi.appendChild(el('small', null, `${gz.aktiv} Einträge${gz.vorschlag ? ` · ${gz.vorschlag} Vorschläge offen` : ''}`));
  gzeile.appendChild(gi);
  gzeile.addEventListener('click', () => { location.hash = '#/agenten/gemeinsam'; });
  gem.appendChild(gzeile);
  inhalt.appendChild(gem);
}

// ---------- Profil ----------
function zeichneProfil(inhalt, profil) {
  const karte = el('div', 'stat-karte');
  if (!profilBearbeiten) {
    const kopf = el('div', 'section-head');
    kopf.style.margin = '0 0 8px';
    kopf.appendChild(el('h2', null, profil.titel));
    kopf.appendChild(knopf('Bearbeiten', () => { profilBearbeiten = true; zeichne(); }, 'link-muted'));
    karte.appendChild(kopf);
    karte.appendChild(el('p', null, profil.rolle || '–'));
    const zeilen = [
      ['Gehört zu', listeZuText(profil.zugehoerigkeit)],
      ['Darf', listeZuText(profil.darf)],
      ['Werkzeuge', listeZuText(profil.werkzeuge)],
      ['Freigabe nötig für', listeZuText(profil.freigabe_noetig)],
      ['Ton', profil.ton],
      ['Modellklasse', profil.modell_klasse],
      ['Obsidian-Ordner', profil.obsidian_ordner],
    ];
    for (const [name, wert] of zeilen) {
      const z = el('p', 'lade');
      z.style.cssText = 'margin:4px 0;';
      const b = el('strong', null, `${name}: `);
      z.append(b, document.createTextNode(wert || '–'));
      karte.appendChild(z);
    }
    const prompt = el('details');
    prompt.appendChild(el('summary', null, 'Systemprompt'));
    const pre = el('p', 'lade', profil.system_prompt || '–');
    pre.style.whiteSpace = 'pre-wrap';
    prompt.appendChild(pre);
    karte.appendChild(prompt);
  } else {
    const titel = textfeld(profil.titel);
    const rolle = textfeld(profil.rolle);
    const zug = textfeld(listeZuText(profil.zugehoerigkeit), 'durch Komma getrennt');
    const darf = textfeld(listeZuText(profil.darf), 'durch Komma getrennt');
    const werkzeuge = textfeld(listeZuText(profil.werkzeuge), 'durch Komma getrennt');
    const freigabe = textfeld(listeZuText(profil.freigabe_noetig), 'durch Komma getrennt');
    const ton = textfeld(profil.ton);
    const klasse = textfeld(profil.modell_klasse);
    const sp = textbereich(profil.system_prompt, 8);
    const aktiv = el('input'); aktiv.type = 'checkbox'; aktiv.checked = profil.aktiv;
    aktiv.style.width = '20px';
    const aktivBox = feld('Aktiv', aktiv);
    karte.append(feld('Titel', titel), feld('Aufgabe', rolle), feld('Gehört zu (Bereiche/Projekte)', zug),
      feld('Darf (Tabellen/Bereiche)', darf), feld('Werkzeuge', werkzeuge), feld('Freigabe nötig für', freigabe),
      feld('Ton', ton), feld('Modellklasse', klasse), feld('Systemprompt', sp), aktivBox);
    const leiste = el('div');
    leiste.style.cssText = 'display:flex;gap:10px;margin-top:10px;';
    leiste.append(
      knopf('Speichern', () => {
        const p = pruefeProfil({ agent: profil.agent, titel: titel.value });
        if (!p.ok) { setzeMeldung(p.fehler); return; }
        void aktion(async () => {
          await speichereProfil(profil.id, {
            titel: titel.value.trim(), rolle: rolle.value.trim(), zugehoerigkeit: listeAusText(zug.value),
            darf: listeAusText(darf.value), werkzeuge: listeAusText(werkzeuge.value),
            freigabe_noetig: listeAusText(freigabe.value), ton: ton.value.trim(), modell_klasse: klasse.value.trim(),
            system_prompt: sp.value, aktiv: aktiv.checked,
          });
          profilBearbeiten = false;
        });
      }),
      knopf('Abbrechen', () => { profilBearbeiten = false; zeichne(); }, 'link-muted'),
    );
    karte.appendChild(leiste);
  }
  inhalt.appendChild(karte);
}

// ---------- Wissen ----------
function kopiereText(text) {
  const fertig = () => setzeMeldung('Als Obsidian-Notiz kopiert.');
  const fehlt = () => setzeMeldung('Kopieren nicht möglich (Browser blockiert die Zwischenablage).');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(fertig, fehlt);
  else fehlt();
}

function wissenEditor(agent, w) {
  const neu = !w;
  const karte = el('div', 'stat-karte');
  const titel = textfeld(w?.titel ?? '', 'Titel');
  const inhalt = textbereich(w?.inhalt ?? '', 10);
  const tags = textfeld(listeZuText(w?.tags ?? []), 'Tags, durch Komma getrennt');
  const status = el('select');
  for (const s of ['aktiv', 'vorschlag', 'archiv']) {
    const o = el('option', null, STATUS_TEXT[s]); o.value = s; status.appendChild(o);
  }
  status.value = w?.status ?? 'aktiv';
  const vertrauen = el('select');
  for (const [v, t] of [['eigen', 'Eigen (von Mark/geprüft)'], ['extern', 'Extern (Web/Mail: gilt als Daten)']]) {
    const o = el('option', null, t); o.value = v; vertrauen.appendChild(o);
  }
  vertrauen.value = w?.vertrauen ?? 'eigen';
  karte.append(feld('Titel', titel), feld('Text (Markdown, [[Links]] erlaubt)', inhalt), feld('Tags', tags),
    feld('Status', status), feld('Vertrauen', vertrauen));
  const leiste = el('div');
  leiste.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;';
  const lesen = () => ({ titel: titel.value.trim(), inhalt: inhalt.value, tags: tagsAusText(tags.value), status: status.value, vertrauen: vertrauen.value });
  leiste.appendChild(knopf('Speichern', () => {
    const werte = lesen();
    const p = pruefeWissen(werte);
    if (!p.ok) { setzeMeldung(p.fehler); return; }
    void aktion(async () => {
      if (neu) await legeWissenAn({ ...werte, agent });
      else await speichereWissen(w.id, werte);
      offenesWissen = null;
    });
  }));
  if (!neu) {
    leiste.appendChild(knopf('Als Obsidian-Notiz kopieren', () => kopiereText(baueNotiz({ ...lesen(), agent, quelle: w.quelle }))));
    leiste.appendChild(knopf('Löschen', () => {
      if (!confirm(`„${w.titel}“ endgültig löschen?`)) return;
      void aktion(async () => { await loescheWissen(w.id); offenesWissen = null; });
    }));
  }
  leiste.appendChild(knopf('Schließen', () => { offenesWissen = null; zeichne(); }, 'link-muted'));
  karte.appendChild(leiste);
  return karte;
}

function zeichneWissen(inhalt, agent) {
  const alle = zustand.wissen.filter((w) => w.agent === agent);
  const kopf = el('div', 'section-head');
  kopf.appendChild(el('h2', null, `Wissen (${alle.filter((w) => w.status === 'aktiv').length})`));
  kopf.appendChild(knopf('Neues Wissen', () => { offenesWissen = 'neu'; zeichne(); }, 'link-muted'));
  inhalt.appendChild(kopf);

  const vorschlaege = alle.filter((w) => w.status === 'vorschlag');
  if (vorschlaege.length > 0) {
    const box = el('div', 'stat-karte');
    box.appendChild(el('strong', null, `${vorschlaege.length} Vorschlag${vorschlaege.length === 1 ? '' : 'e'} wartet auf Freigabe`));
    for (const v of vorschlaege) {
      const z = el('div');
      z.style.cssText = 'margin:10px 0;padding-top:8px;border-top:1px solid var(--glas-linie);';
      z.appendChild(el('strong', null, v.titel));
      if (v.vertrauen === 'extern') z.appendChild(el('small', null, ' · extern (Quelle prüfen)'));
      const t = el('p', 'lade', v.inhalt.length > 280 ? `${v.inhalt.slice(0, 280)} …` : v.inhalt);
      t.style.whiteSpace = 'pre-wrap';
      z.appendChild(t);
      const l = el('div'); l.style.cssText = 'display:flex;gap:10px;';
      l.append(knopf('Freigeben', () => { void aktion(() => setzeWissenStatus(v.id, 'aktiv')); }),
        knopf('Verwerfen', () => { void aktion(() => setzeWissenStatus(v.id, 'archiv')); }, 'link-muted'));
      z.appendChild(l);
      box.appendChild(z);
    }
    inhalt.appendChild(box);
  }

  if (offenesWissen === 'neu') inhalt.appendChild(wissenEditor(agent, null));

  const such = el('div', 'searchbar');
  such.style.margin = '12px 0';
  const eingabe = el('input');
  eingabe.type = 'search'; eingabe.id = 'ag-suche'; eingabe.placeholder = 'Wissen durchsuchen …';
  eingabe.value = suchtext; eingabe.autocomplete = 'off'; eingabe.enterKeyHint = 'search';
  such.appendChild(eingabe);
  inhalt.appendChild(such);

  const leiste = el('div', 'chips');
  for (const s of STATUS_FILTER) {
    const c = el('button', `chip${s === statusFilter ? ' aktiv' : ''}`, s === 'alle' ? 'Alle' : STATUS_TEXT[s]);
    c.type = 'button';
    c.addEventListener('click', () => { statusFilter = s; zeichne(); });
    leiste.appendChild(c);
  }
  inhalt.appendChild(leiste);

  const liste = el('div', 'punkt-liste');
  inhalt.appendChild(liste);
  const fuelleListe = () => {
    liste.replaceChildren();
    const treffer = filtereWissen(alle, { status: statusFilter, text: suchtext });
    if (treffer.length === 0) liste.appendChild(el('p', 'lade', 'Nichts gefunden.'));
    for (const w of treffer) {
      const zeile = el('div', 'punkt-zeile');
      zeile.style.cssText = 'cursor:pointer;flex-wrap:wrap;';
      const i = el('div', 'punkt-info');
      i.appendChild(el('strong', null, w.titel));
      i.appendChild(el('small', null, `${STATUS_TEXT[w.status]} · ${w.quelle}${w.vertrauen === 'extern' ? ' · extern' : ''}${w.pfad ? '' : ' · noch nicht im Vault'}`));
      if ((w.tags ?? []).length) i.appendChild(chips(w.tags));
      zeile.appendChild(i);
      zeile.addEventListener('click', () => { offenesWissen = offenesWissen === w.id ? null : w.id; zeichne(); });
      liste.appendChild(zeile);
      if (offenesWissen === w.id) {
        const e = wissenEditor(agent, w);
        e.style.flexBasis = '100%';
        liste.appendChild(e);
      }
    }
  };
  fuelleListe();
  // Live-Suche: nur die Liste neu füllen, damit das Feld den Fokus (und die Tastatur) behält
  eingabe.addEventListener('input', () => { suchtext = eingabe.value; fuelleListe(); });
}

// ---------- Rahmen ----------
function zeichne() {
  if (!container || !container.isConnected) return;
  const inhalt = container.querySelector('#ag-inhalt');
  if (!inhalt) return;
  inhalt.replaceChildren();
  const { unterseite } = parseHash(location.hash);
  if (!unterseite) { zeichneListe(inhalt); return; }

  const agent = agentAusSegment(unterseite);
  const zurueck = knopf('‹ Agenten', () => { location.hash = '#/agenten'; }, 'link-muted');
  zurueck.style.marginBottom = '8px';
  inhalt.appendChild(zurueck);

  if (agent === GEMEINSAM) {
    const k = el('div', 'stat-karte');
    k.appendChild(el('h2', null, 'Gemeinsames Wissen'));
    k.appendChild(el('p', 'lade', 'Gilt für alle Agenten (Regeln, Sicherheit, Projekt-Landkarte).'));
    inhalt.appendChild(k);
    zeichneWissen(inhalt, GEMEINSAM);
    return;
  }
  const profil = zustand.profile.find((p) => p.agent === agent);
  if (!profil) {
    inhalt.appendChild(el('p', 'lade', laedt ? 'Lädt …' : `Agent „${agent}“ nicht gefunden.`));
    return;
  }
  zeichneProfil(inhalt, profil);
  zeichneWissen(inhalt, agent);
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul !== 'agenten') return;
  offenesWissen = null; profilBearbeiten = false; neuerAgent = false; suchtext = ''; statusFilter = 'alle';
  zeichne();
}

registriere({
  id: 'agenten',
  titel: 'Agenten',
  async init(c) {
    container = c;
    container.innerHTML = '<p id="ag-meldung" class="lade" hidden></p><div id="ag-inhalt"></div>';
    if (hashListener) window.removeEventListener('hashchange', hashListener);
    hashListener = beiHashwechsel;
    window.addEventListener('hashchange', hashListener);
    zeichne();
    await lade();
  },
  async aktualisieren() { await lade(); },
});
