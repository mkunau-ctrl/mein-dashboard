// Reine Hilfsfunktionen fürs Agenten-Modul (kein Netz, kein DOM).
import { GEMEINSAM, parseTags } from './obsidian.js';

// Reihenfolge wie in AURORA, danach die Spezialisten alphabetisch
const ZUERST = ['ceo', 'orchestrator', 'research', 'developer', 'qa', 'visual', 'memory', 'monitor', 'security'];

export function sortiereProfile(profile) {
  const rang = (a) => { const i = ZUERST.indexOf(a); return i === -1 ? ZUERST.length : i; };
  return [...profile].sort((a, b) =>
    (Number(b.aktiv) - Number(a.aktiv)) || (rang(a.agent) - rang(b.agent)) || a.agent.localeCompare(b.agent));
}

/** { agent: { aktiv, vorschlag, archiv } } */
export function zaehleWissen(wissen) {
  const z = {};
  for (const w of wissen) {
    const e = (z[w.agent] ??= { aktiv: 0, vorschlag: 0, archiv: 0 });
    if (e[w.status] !== undefined) e[w.status]++;
  }
  return z;
}

/** Filtert nach Status ('alle' oder Status) und Suchtext (Titel, Inhalt, Tags), neueste zuerst. */
export function filtereWissen(wissen, { status = 'alle', text = '' } = {}) {
  const q = String(text ?? '').trim().toLowerCase();
  return wissen
    .filter((w) => status === 'alle' || w.status === status)
    .filter((w) => !q || `${w.titel} ${w.inhalt} ${(w.tags ?? []).join(' ')}`.toLowerCase().includes(q))
    .sort((a, b) => String(b.aktualisiert_am ?? '').localeCompare(String(a.aktualisiert_am ?? '')));
}

/** "a, b\nc" -> ['a','b','c'] */
export function listeAusText(text) {
  return [...new Set(String(text ?? '').split(/[,\n]/).map((t) => t.trim()).filter(Boolean))];
}

export function listeZuText(liste) {
  return (liste ?? []).join(', ');
}

export function tagsAusText(text) {
  return parseTags(text);
}

/** URL-Segment <-> Agent-Kennung (die Hash-Regel erlaubt keinen Unterstrich) */
export function agentAusSegment(segment) {
  return segment === 'gemeinsam' ? GEMEINSAM : segment;
}
export function segmentFuerAgent(agent) {
  return agent === GEMEINSAM ? 'gemeinsam' : agent;
}

export function pruefeProfil(werte) {
  const agent = String(werte.agent ?? '').trim();
  if (!/^[a-z0-9]{2,32}$/.test(agent)) return { ok: false, fehler: 'Die Kennung darf nur Kleinbuchstaben und Ziffern enthalten (2 bis 32 Zeichen).' };
  if (!String(werte.titel ?? '').trim()) return { ok: false, fehler: 'Bitte einen Titel eingeben.' };
  return { ok: true };
}

export function pruefeWissen(werte) {
  if (!String(werte.titel ?? '').trim()) return { ok: false, fehler: 'Bitte einen Titel eingeben.' };
  if (String(werte.titel).length > 120) return { ok: false, fehler: 'Der Titel darf höchstens 120 Zeichen haben.' };
  if (String(werte.inhalt ?? '').length > 60000) return { ok: false, fehler: 'Der Text ist zu lang (höchstens 60000 Zeichen).' };
  return { ok: true };
}
