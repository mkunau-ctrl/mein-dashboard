import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles, abonniere, beende, sendeChat, sendeAuftrag } from './daten.js';
import { leseNurAnsicht, speichereNurAnsicht } from './ansicht.js';

function holeSpeicher() {
  try { return window.localStorage; } catch { return null; }
}

const LEERE_DATEN = {
  status: null, agenten: [], aufgaben: [], ereignisse: [], chat: [], auftraege: [],
};

let containerRef = null;
let zustand = null;
let ladeFehler = null;
let laedt = false;
let renderVersion = 0;
let listenerAktiv = false;
let offen = new Set();
let letzteEreignisse = new Set();
let meldung = null;
let nurAnsicht = false;
const entwuerfe = { chat: '', auftragZiel: '', auftragKriterium: '', auftragAgent: 'orchestrator' };
const ansichtModule = new Map();

function aktuelleAnsicht() {
  const { unterseite, detail } = parseHash(location.hash);
  if (unterseite === 'agent' && detail) return { art: 'agent', agent: detail };
  if (unterseite === 'verteilung') return { art: 'verteilung' };
  return { art: 'uebersicht', agent: null };
}

async function holeZeigeFunktion(art) {
  if (!ansichtModule.has(art)) {
    const modul = art === 'agent'
      ? await import('./agent.js')
      : art === 'verteilung'
        ? await import('./verteilung.js')
        : await import('./uebersicht.js');
    ansichtModule.set(art, modul.zeigeKi);
  }
  return ansichtModule.get(art);
}

const aktionen = {
  sendeChat: async (agent, text) => {
    await sendeChat({ agent, text });
    await ladeUndZeichne();
  },
  sendeAuftrag: async (werte) => {
    await sendeAuftrag(werte);
    await ladeUndZeichne();
  },
  aktualisieren: async () => { await ladeUndZeichne(); },
  neuZeichnen: () => { void zeichne(); },
  toggleKarte: (id) => {
    if (offen.has(id)) offen.delete(id); else offen.add(id);
    void zeichne();
  },
  istOffen: (id) => offen.has(id),
  nurAnsicht: () => nurAnsicht,
  entwurf: (feld) => entwuerfe[feld],
  setEntwurf: (feld, wert) => { entwuerfe[feld] = wert; },
  gesehen: letzteEreignisse,
  markiereGesehen: (ids) => {
    for (const id of ids) letzteEreignisse.add(id);
  },
  setzeMeldung: (text, art = 'info') => {
    meldung = text ? { text, art } : null;
    zeigeMeldungAn();
  },
};

function zeigeMeldungAn() {
  if (!containerRef) return;
  const bereich = containerRef.querySelector('#ki-meldung');
  if (!bereich) return;
  bereich.innerHTML = '';
  if (!meldung) { bereich.hidden = true; return; }
  bereich.hidden = false;
  const p = document.createElement('p');
  p.className = `ki-meldung ki-meldung-${meldung.art}`;
  p.textContent = meldung.text;
  bereich.appendChild(p);
}

function zeigeFehler(text) {
  if (!containerRef) return;
  const bereich = containerRef.querySelector('#ki-fehler');
  if (!bereich) return;
  bereich.innerHTML = '';
  if (!text) { bereich.hidden = true; return; }
  bereich.hidden = false;
  const p = document.createElement('p');
  p.className = 'ki-fehler';
  p.textContent = text;
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = 'link-muted';
  knopf.textContent = 'Neu laden';
  knopf.addEventListener('click', () => { void ladeUndZeichne(); });
  p.appendChild(document.createTextNode(' '));
  p.appendChild(knopf);
  bereich.appendChild(p);
}

async function zeichne() {
  if (!containerRef || !containerRef.isConnected) return;
  const inhalt = containerRef.querySelector('#ki-inhalt');
  if (!inhalt) return;

  const version = ++renderVersion;
  const ansicht = aktuelleAnsicht();
  const zeigeFn = await holeZeigeFunktion(ansicht.art);
  if (version !== renderVersion || !containerRef || !containerRef.isConnected) return;

  const fokussiert = document.activeElement;
  const fokusId = fokussiert && fokussiert.id ? fokussiert.id : null;
  const auswahlStart = fokussiert && typeof fokussiert.selectionStart === 'number'
    ? fokussiert.selectionStart : null;
  const auswahlEnde = fokussiert && typeof fokussiert.selectionEnd === 'number'
    ? fokussiert.selectionEnd : null;
  const scroll = window.scrollY;

  inhalt.innerHTML = '';
  if (!zustand && laedt) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Lädt …';
    inhalt.appendChild(p);
  } else {
    zeigeFn(inhalt, zustand || LEERE_DATEN, ansicht.agent, aktionen);
  }

  if (fokusId) {
    const feld = document.getElementById(fokusId);
    if (feld) {
      feld.focus();
      if (auswahlStart !== null && typeof feld.setSelectionRange === 'function') {
        try { feld.setSelectionRange(auswahlStart, auswahlEnde ?? auswahlStart); } catch { /* nicht bei allen Feldern */ }
      }
    }
  }
  window.scrollTo(0, scroll);
}

async function ladeUndZeichne() {
  if (!containerRef) return;
  laedt = true;
  if (!zustand) void zeichne();
  try {
    zustand = await ladeAlles();
    ladeFehler = null;
  } catch (e) {
    ladeFehler = e?.message ? `AURORA-Daten konnten nicht geladen werden: ${e.message}` : 'AURORA-Daten konnten nicht geladen werden.';
  } finally {
    laedt = false;
  }
  zeigeFehler(ladeFehler);
  await zeichne();
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul !== 'ki') {
    beende();
    containerRef = null;
    meldung = null;
    return;
  }
  if (containerRef && containerRef.isConnected) void zeichne();
}

function baueAnsichtSchalter() {
  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.id = 'ki-nur-ansicht';
  knopf.className = 'ki-schalter';
  const zeigeZustand = () => {
    knopf.setAttribute('aria-pressed', nurAnsicht ? 'true' : 'false');
    knopf.textContent = nurAnsicht ? 'Nur ansehen: an' : 'Nur ansehen: aus';
  };
  zeigeZustand();
  knopf.addEventListener('click', () => {
    nurAnsicht = !nurAnsicht;
    speichereNurAnsicht(holeSpeicher(), nurAnsicht);
    zeigeZustand();
    void zeichne();
  });
  return knopf;
}

function baueRahmen(container) {
  container.innerHTML = '';
  nurAnsicht = leseNurAnsicht(holeSpeicher());
  const leiste = document.createElement('div');
  leiste.className = 'ki-leiste';
  leiste.appendChild(baueAnsichtSchalter());
  container.appendChild(leiste);
  const fehler = document.createElement('div');
  fehler.id = 'ki-fehler';
  fehler.hidden = true;
  const meldungsBereich = document.createElement('div');
  meldungsBereich.id = 'ki-meldung';
  meldungsBereich.hidden = true;
  const inhalt = document.createElement('div');
  inhalt.id = 'ki-inhalt';
  const lade = document.createElement('p');
  lade.className = 'lade';
  lade.textContent = 'Lädt …';
  inhalt.appendChild(lade);
  container.appendChild(fehler);
  container.appendChild(meldungsBereich);
  container.appendChild(inhalt);
}

registriere({
  id: 'ki',
  titel: 'KI',
  icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg>',
  async init(container) {
    beende();
    containerRef = container;
    baueRahmen(container);
    if (!listenerAktiv) {
      listenerAktiv = true;
      window.addEventListener('hashchange', beiHashwechsel);
    }
    await ladeUndZeichne();
    abonniere(() => { void ladeUndZeichne(); }).catch((e) => {
      // Realtime ist optional; Polling/Neu-laden funktioniert weiter.
      if (e?.message) zeigeFehler(`Live-Verbindung fehlgeschlagen: ${e.message}`);
    });
  },
  async aktualisieren() {
    await ladeUndZeichne();
  },
});
