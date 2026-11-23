// Reine Logik der Ranglisten-Seite (kein DOM, kein Netz) – getestet in test/ranglisten-logik.test.js.

export const KLASSEN = [
  { id: 'u70', titel: 'U70' }, { id: 'u80', titel: 'U80' }, { id: 'u90', titel: 'U90' },
  { id: 'u100', titel: 'U100' }, { id: 'u115', titel: 'U115' }, { id: 'ue115', titel: 'Ü115' },
];
export const ALTER = [{ id: 'u16', titel: 'U16' }, { id: 'ue16', titel: 'Ü16' }];
export const ARME = [{ id: 'r', titel: 'Rechts' }, { id: 'l', titel: 'Links' }];
export const GRUPPEN = [{ id: 'm', titel: 'Männer' }, { id: 'f', titel: 'Frauen' }];

export const STANDARD_AUSWAHL = { gruppe: 'm', klasse: 'u80', alter: 'ue16', arm: 'r' };

// Benutzername -> interne Anmelde-Adresse (die Gemeinde sieht nur den Benutzernamen).
export function benutzerZuEmail(name) {
  const n = String(name ?? '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,40}$/.test(n)) return null;
  return `${n}@rangliste.local`;
}

export function bereinigeAuswahl(a) {
  const x = { ...STANDARD_AUSWAHL, ...(a || {}) };
  const hat = (liste, id) => liste.some((e) => e.id === id);
  if (!hat(GRUPPEN, x.gruppe)) x.gruppe = STANDARD_AUSWAHL.gruppe;
  if (!hat(KLASSEN, x.klasse)) x.klasse = STANDARD_AUSWAHL.klasse;
  if (!hat(ALTER, x.alter)) x.alter = STANDARD_AUSWAHL.alter;
  if (!hat(ARME, x.arm)) x.arm = STANDARD_AUSWAHL.arm;
  return x;
}

// Auswahl -> ID in rl_listen (z. B. m-u80-ue16-r, Frauen: f-offen-r).
export function listenId(auswahl) {
  const a = bereinigeAuswahl(auswahl);
  if (a.gruppe === 'f') return `f-offen-${a.arm}`;
  return `m-${a.klasse}-${a.alter}-${a.arm}`;
}

export function listenTitel(auswahl) {
  const a = bereinigeAuswahl(auswahl);
  const t = (liste, id) => liste.find((e) => e.id === id).titel;
  if (a.gruppe === 'f') return `Frauen · ${t(ARME, a.arm)}`;
  return `${t(KLASSEN, a.klasse)} · ${t(ALTER, a.alter)} · ${t(ARME, a.arm)}`;
}

// Markierungen aus dem letzten Match einer Liste: Sieger "↑ von X", Verdrängte "↓ 1".
// plaetze: [{ person_id, platz }], match: { sieger_id, sieger_platz_vorher, verlierer_platz_vorher }
export function wechselMarkierungen(plaetze, match) {
  const m = {};
  if (!match) return m;
  const ps = match.sieger_platz_vorher;
  const pv = match.verlierer_platz_vorher;
  if (!(ps > pv)) return m;
  for (const p of plaetze) {
    if (p.person_id === match.sieger_id) m[p.person_id] = `↑ von ${ps}`;
    else if (p.platz > pv && p.platz <= ps) m[p.person_id] = '↓ 1';
  }
  return m;
}

// Prüft das Match-Formular vor dem Senden. Liefert eine Fehlermeldung oder null.
export function pruefeMatch(f) {
  const a = String(f.a_name ?? '').trim();
  const b = String(f.b_name ?? '').trim();
  if (!a || !b) return 'Bitte beide Namen eintragen.';
  if (a.length > 60 || b.length > 60) return 'Namen dürfen höchstens 60 Zeichen haben.';
  if (a.toLowerCase() === b.toLowerCase()) return 'Zwei verschiedene Personen eintragen.';
  const runden = Number(f.runden);
  if (!Number.isInteger(runden) || runden < 1 || runden > 99) return 'Runden: ganze Zahl von 1 bis 99.';
  if (f.sieger !== 'a' && f.sieger !== 'b') return 'Bitte den Sieger wählen.';
  for (const k of ['a_gewicht', 'b_gewicht', 'a_alter', 'b_alter']) {
    const v = f[k];
    if (v === '' || v == null) continue;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0 || n > 400) return 'Gewicht/Alter bitte als Zahl angeben.';
  }
  return null;
}

// Zahl aus Formularfeld (Komma erlaubt), leer -> null.
export function zahlOderNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function matchText(match, namen) {
  const s = namen[match.sieger_id] ?? '?';
  const verliererId = match.sieger_id === match.a_id ? match.b_id : match.a_id;
  const v = namen[verliererId] ?? '?';
  const r = match.runden === 1 ? '1 Runde' : `${match.runden} Runden`;
  return `${s} schlägt ${v} · ${r}`;
}
