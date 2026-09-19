# Etappe 4, Sub-Etappe A: Konten, Einnahmen & Schulden Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drei bisher fehlende Finanz-Konzepte einführen: mehrere Konten
statt einem einzelnen Kontostand, echte Einnahmen-Erfassung (bisher gab
es nur Ausgaben) und Schulden-Tracking mit Teilzahlungen. Reines
Fundament (Datenmodell + einfache Erfassung) — das prototyp-genaue UI
folgt in Sub-Etappe B.

**Architecture:** Neue Supabase-Tabellen `konten`, `einnahmen`,
`einnahmen_vorlagen`, `schulden`, `schulden_zahlungen`; `expenses`
bekommt ein Pflichtfeld `konto_id`. Reine Berechnungsfunktionen in
`js/module/finanzen/berechnung.js` ersetzen die bisherigen
Ein-Konto-Funktionen `kontostand`/`unechterKontostand` durch
Mehrkonten-Varianten. Die Einnahmen-Vorlagen-Mechanik übernimmt 1:1 das
Muster der To-do-Vorlagen (Bestätigen erzeugt eine echte Zeile + rückt
die Vorlage vor), inklusive Wiederverwendung von `naechsteFaelligkeit`
aus `js/module/todos/planung.js`. Drei neue, einfache UI-Tabs
(`einnahmen.js`, `konten.js`, `schulden.js`) im bestehenden
Finanzen-Modul, nach dem Muster von `ausgaben.js`/`teile.js`.

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase (Postgres + RLS),
kein Framework, kein Build.

**Spec:** `docs/superpowers/specs/2026-09-19-etappe-4-sub-a-konten-einnahmen-schulden-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Reine Logik (Berechnungen) und Netzwerk-Code (`daten.js`) bleiben
  strikt getrennt, wie im Rest des Projekts.
- Nur `berechnung.js`-Funktionen bekommen automatisierte Tests (Muster
  im ganzen Projekt: `daten.js` ist ungetestet, reiner Supabase-Wrapper).
- Löschen von Einnahmen/Ausgaben/Schulden: harte Löschung, keine
  Historie nötig (bestehende Konvention aus Etappe 3 Finanzen-Design).
- **Wichtige Abweichung von der ursprünglichen Spec-Formulierung:** Die
  Spec sprach an mehreren Stellen von "Formular" ohne zu prüfen, ob es
  im Projekt bereits Eingabe-Formulare gibt. Tatsächlich gibt es **in
  keinem bestehenden Modul** (`todos`, `finanzen`, `ernaehrung`) ein
  einziges `<form>`/Text-Eingabefeld in der App — jede neue Ausgabe/
  jedes neue Todo wird bisher ausschließlich per Chat-Diktat über
  Claude/Supabase-MCP angelegt, die App selbst kann nur anzeigen/
  löschen/Status wechseln. Der Nutzer wollte aber explizit sowohl
  Chat-Diktat **als auch** ein App-Formular — diese Sub-Etappe baut
  deshalb die **ersten echten Eingabe-Formulare** des Projekts (simples
  natives HTML, `input`/`button` sind in `app.css` schon generisch
  gestylt, keine neue CSS nötig). Dieser Bruch mit der bisherigen
  Konvention wird in Task 8 im Projekt-Log als bewusste Entscheidung
  festgehalten (siehe Doku-Rigor-Regel in `CLAUDE.md`).
- `daten.js`-Funktionen bleiben trotzdem unabhängig von der UI nutzbar,
  damit Chat-Diktat (Claude ruft sie nicht direkt auf, sondern schreibt
  per Supabase-MCP — aber das Feld-Schema muss identisch sein) weiter
  funktioniert.

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, da reine DB-Aktion ohne Repo-Dateien, gleiches Muster wie
Etappe 3):**

1. Aktuelle Werte aus `finance_settings` lesen (`kontostand_start`,
   `stand_datum`) für den bestehenden Nutzer.
2. Tabelle `konten` anlegen (`id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null references
   auth.users`, `name text not null`, `kontostand_start numeric not
   null`, `stand_datum date not null`, `erstellt_am timestamptz not
   null default now()`), RLS wie überall (`user_id = auth.uid()`, `for
   all to authenticated`).
3. Eine Zeile in `konten` einfügen: `name:'Hauptkonto'`,
   `kontostand_start`/`stand_datum` = die in Schritt 1 gelesenen Werte
   (Fallback `0`/heutiges Datum, falls noch nie gesetzt). Die
   zurückgegebene `id` dieser Zeile für Schritt 5 merken.
4. Spalte `konto_id uuid references konten` auf `expenses` ergänzen
   (zunächst nullable, damit das Befüllen in Schritt 5 möglich ist).
5. Alle bestehenden `expenses`-Zeilen mit der in Schritt 3 gemerkten
   Hauptkonto-`id` befüllen (`update expenses set konto_id = '<id>'
   where konto_id is null`), danach die Spalte `not null` setzen.
6. Tabelle `einnahmen` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null references auth.users`,
   `betrag numeric not null`, `bezeichnung text not null default
   'sonstiges'`, `notiz text`, `datum date not null default
   current_date`, `quelle text not null default 'manuell'`, `konto_id
   uuid not null references konten`, `vorlage_id uuid references
   einnahmen_vorlagen`, `erstellt_am timestamptz not null default
   now()`. RLS wie überall.
7. Tabelle `einnahmen_vorlagen` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null references auth.users`,
   `bezeichnung text not null`, `betrag numeric not null`,
   `plan_tag_im_monat int not null`, `naechste_faelligkeit date not
   null`, `konto_id uuid not null references konten`, `aktiv boolean
   not null default true`. RLS wie überall. (Reihenfolge beachten:
   diese Tabelle muss vor Schritt 6 angelegt werden, da `einnahmen.
   vorlage_id` darauf verweist — Schritt 6 und 7 in dieser Reihenfolge
   tauschen: erst `einnahmen_vorlagen`, dann `einnahmen`.)
8. Tabelle `schulden` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null references auth.users`,
   `person text not null`, `gesamtbetrag numeric not null`, `richtung
   text not null` (Check-Constraint: `richtung in ('ich_schulde',
   'mir_wird_geschuldet')`), `notiz text`, `erstellt_am date not null
   default current_date`. RLS wie überall.
9. Tabelle `schulden_zahlungen` anlegen: `id uuid primary key default
   gen_random_uuid()`, `user_id uuid not null references auth.users`,
   `schuld_id uuid not null references schulden`, `betrag numeric not
   null`, `datum date not null default current_date`, `notiz text`.
   RLS wie überall.
10. Die beiden Zeilen `kontostand_start`/`stand_datum` aus
    `finance_settings` löschen (Wert lebt jetzt in `konten`).
11. Ergebnis (Hauptkonto-`id`, übernommene Start-Werte) im Projekt-Log
    (Task 8) dokumentieren.

---

### Task 1: Berechnungen — Mehrkonten-Kontostand + Schulden

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `kontostandProKonto(konto, expenses, einnahmen, heute):
  number`, `gesamtKontostand(konten, expenses, einnahmen, heute):
  number`, `unechterGesamtKontostand(konten, expenses, einnahmen,
  teile, heute): number`, `schuldenRestbetrag(schuld, zahlungen):
  number`, `offeneSchulden(schulden, zahlungen): array`,
  `sortiereSchulden(schulden, zahlungen): array`, `nettoVermoegen(
  konten, expenses, einnahmen, teile, schulden, zahlungen, heute):
  number` — werden von Task 3 (`einnahmen.js`), Task 4 (`konten.js`),
  Task 5 (`schulden.js`) und Task 7 (`home/index.js`,
  `finanzen/kontostand.js`) importiert.
- **Entfernt:** `kontostand(settings, expenses, heute)` und
  `unechterKontostand(settings, expenses, teile, heute)` (Ein-Konto-
  Funktionen, durch die neuen Mehrkonten-Funktionen ersetzt — Task 7
  passt alle Aufrufer an).
- Konsumiert: `warenwert` (bereits in `berechnung.js` vorhanden,
  unverändert).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

In `test/finanzen-berechnung.test.js` die Import-Zeile am Dateianfang

```js
import { kontostand, summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus, unechterKontostand,
  kategorisiereIconTyp }
  from '../js/module/finanzen/berechnung.js';
```

ersetzen durch:

```js
import { summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus,
  kategorisiereIconTyp, kontostandProKonto, gesamtKontostand,
  unechterGesamtKontostand, schuldenRestbetrag, offeneSchulden,
  sortiereSchulden, nettoVermoegen }
  from '../js/module/finanzen/berechnung.js';
```

Die bestehenden Tests `kontostand: Start minus Summe seit stand_datum
bis heute` und `kontostand: Ausgaben nach "heute" zaehlen nicht`
(nutzen die entfernte `kontostand`-Funktion) komplett entfernen.

Die bestehende `expenses`-Testkonstante

```js
const expenses = [
  { betrag: 20, kategorie: 'tanken', datum: '2026-09-01' },
  { betrag: 50, kategorie: 'lebensmittel', datum: '2026-09-05' },
  { betrag: 15, kategorie: 'lebensmittel', datum: '2026-09-10' },
  { betrag: 100, kategorie: 'tanken', datum: '2026-08-20' }, // vor stand_datum
];
```

ersetzen durch (fügt `konto_id` hinzu, ändert sonst nichts an den
bestehenden `summeProMonat`/`summenProKategorie`/`erkenneAbos`-Tests,
die `konto_id` ignorieren):

```js
const konten = [
  { id: 'k1', name: 'Hauptkonto', kontostand_start: 500, stand_datum: '2026-09-01' },
  { id: 'k2', name: 'Trade Republic', kontostand_start: 1000, stand_datum: '2026-09-01' },
];

const expenses = [
  { betrag: 20, kategorie: 'tanken', datum: '2026-09-01', konto_id: 'k1' },
  { betrag: 50, kategorie: 'lebensmittel', datum: '2026-09-05', konto_id: 'k1' },
  { betrag: 15, kategorie: 'lebensmittel', datum: '2026-09-10', konto_id: 'k1' },
  { betrag: 100, kategorie: 'tanken', datum: '2026-08-20', konto_id: 'k1' }, // vor stand_datum
];

const einnahmen = [
  { betrag: 750, bezeichnung: 'Ausbildungsverguetung', datum: '2026-09-03', konto_id: 'k1' },
  { betrag: 200, bezeichnung: 'Dividende', datum: '2026-09-04', konto_id: 'k2' },
];
```

Direkt danach neue Tests ergänzen:

```js
test('kontostandProKonto: Start plus Einnahmen minus Ausgaben seit stand_datum', () => {
  assert.equal(kontostandProKonto(konten[0], expenses, einnahmen, '2026-09-16'), 500 + 750 - (20 + 50 + 15));
  assert.equal(kontostandProKonto(konten[1], expenses, einnahmen, '2026-09-16'), 1000 + 200);
});

test('kontostandProKonto: Buchungen anderer Konten und nach "heute" zaehlen nicht', () => {
  assert.equal(kontostandProKonto(konten[0], expenses, einnahmen, '2026-09-02'), 500 + 0 - 20);
});

test('gesamtKontostand: Summe ueber alle Konten', () => {
  assert.equal(gesamtKontostand(konten, expenses, einnahmen, '2026-09-16'), (500 + 750 - 85) + (1000 + 200));
});

test('unechterGesamtKontostand: Gesamt-Kontostand plus Warenwert', () => {
  // Warenwert der 4 Testteile (siehe unten): 2*60+0*25+1*15+5*0 = 135
  assert.equal(unechterGesamtKontostand(konten, expenses, einnahmen, teile, '2026-09-16'), 2365 + 135);
});
```

Die bestehende Test-Zeile

```js
test('unechterKontostand: echter Kontostand plus Warenwert', () => {
  const settings = { kontostand_start: 500, stand_datum: '2026-09-01' };
  const expenses = [{ betrag: 20, kategorie: 'tanken', datum: '2026-09-05' }];
  // echter Kontostand: 500 - 20 = 480; Warenwert der 4 Testteile: 2*60+0*25+1*15+5*0 = 135
  assert.equal(unechterKontostand(settings, expenses, teile, '2026-09-16'), 480 + 135);
});
```

komplett entfernen (ersetzt durch den neuen `unechterGesamtKontostand`-
Test oben; **Achtung:** dieser alte Test definierte lokal eine eigene
`expenses`-Konstante, die die äußere überschattete — beim Entfernen
darauf achten, dass die äußere `expenses`-Konstante mit `konto_id`
danach unverändert für andere Tests weiterverwendet wird).

Ganz am Ende der Datei (nach dem bestehenden `kategorisiereIconTyp`-
Test) die Schulden-Tests ergänzen:

```js
const schulden = [
  { id: 's1', person: 'Tom', gesamtbetrag: 100, richtung: 'mir_wird_geschuldet', erstellt_am: '2026-09-01' },
  { id: 's2', person: 'Lisa', gesamtbetrag: 50, richtung: 'ich_schulde', erstellt_am: '2026-09-05' },
  { id: 's3', person: 'Max', gesamtbetrag: 30, richtung: 'ich_schulde', erstellt_am: '2026-08-01' },
];
const zahlungen = [
  { schuld_id: 's1', betrag: 40, datum: '2026-09-10' },
  { schuld_id: 's3', betrag: 30, datum: '2026-09-02' }, // vollstaendig beglichen
];

test('schuldenRestbetrag: Gesamtbetrag minus Summe der Zahlungen', () => {
  assert.equal(schuldenRestbetrag(schulden[0], zahlungen), 60);
  assert.equal(schuldenRestbetrag(schulden[1], zahlungen), 50);
  assert.equal(schuldenRestbetrag(schulden[2], zahlungen), 0);
});

test('offeneSchulden: nur Restbetrag groesser 0', () => {
  const namen = offeneSchulden(schulden, zahlungen).map((s) => s.person);
  assert.deepEqual(namen, ['Tom', 'Lisa']);
});

test('sortiereSchulden: offene vor beglichenen, offene nach Restbetrag absteigend', () => {
  const namen = sortiereSchulden(schulden, zahlungen).map((s) => s.person);
  assert.deepEqual(namen, ['Tom', 'Lisa', 'Max']);
});

test('nettoVermoegen: Gesamt-Kontostand plus Warenwert plus Forderungen minus Verbindlichkeiten', () => {
  // unechterGesamtKontostand = 2500 (siehe oben), Forderungen (mir_wird_geschuldet, Rest) = 60, Verbindlichkeiten (ich_schulde, Rest) = 50 + 0
  assert.equal(
    nettoVermoegen(konten, expenses, einnahmen, teile, schulden, zahlungen, '2026-09-16'),
    2500 + 60 - 50,
  );
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `kontostandProKonto`/`gesamtKontostand`/
`unechterGesamtKontostand`/`schuldenRestbetrag`/`offeneSchulden`/
`sortiereSchulden`/`nettoVermoegen` sind keine Exports.

- [ ] **Schritt 3: Alte Funktionen entfernen, neue implementieren**

Die bestehenden Zeilen

```js
export function kontostand(settings, expenses, heute) {
  const summe = expenses
    .filter((e) => e.datum >= settings.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  return settings.kontostand_start - summe;
}
```

ersetzen durch:

```js
export function kontostandProKonto(konto, expenses, einnahmen, heute) {
  const ausgabenSumme = expenses
    .filter((e) => e.konto_id === konto.id && e.datum >= konto.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = einnahmen
    .filter((e) => e.konto_id === konto.id && e.datum >= konto.stand_datum && e.datum <= heute)
    .reduce((s, e) => s + e.betrag, 0);
  return konto.kontostand_start + einnahmenSumme - ausgabenSumme;
}

export function gesamtKontostand(konten, expenses, einnahmen, heute) {
  return konten.reduce((s, k) => s + kontostandProKonto(k, expenses, einnahmen, heute), 0);
}
```

Die bestehende Zeile

```js
export function unechterKontostand(settings, expenses, teile, heute) {
  return kontostand(settings, expenses, heute) + warenwert(teile);
}
```

ersetzen durch:

```js
export function unechterGesamtKontostand(konten, expenses, einnahmen, teile, heute) {
  return gesamtKontostand(konten, expenses, einnahmen, heute) + warenwert(teile);
}
```

Ganz am Ende der Datei (nach `kategorisiereIconTyp`) ergänzen:

```js
export function schuldenRestbetrag(schuld, zahlungen) {
  const bezahlt = zahlungen
    .filter((z) => z.schuld_id === schuld.id)
    .reduce((s, z) => s + z.betrag, 0);
  return Math.round((schuld.gesamtbetrag - bezahlt) * 100) / 100;
}

export function offeneSchulden(schulden, zahlungen) {
  return schulden.filter((s) => schuldenRestbetrag(s, zahlungen) > 0);
}

export function sortiereSchulden(schulden, zahlungen) {
  return [...schulden].sort((a, b) => {
    const restA = schuldenRestbetrag(a, zahlungen);
    const restB = schuldenRestbetrag(b, zahlungen);
    const offenA = restA > 0;
    const offenB = restB > 0;
    if (offenA !== offenB) return offenA ? -1 : 1;
    if (offenA) return restB - restA;
    return a.erstellt_am < b.erstellt_am ? 1 : -1;
  });
}

export function nettoVermoegen(konten, expenses, einnahmen, teile, schulden, zahlungen, heute) {
  const forderungen = schulden.filter((s) => s.richtung === 'mir_wird_geschuldet')
    .reduce((sum, s) => sum + Math.max(0, schuldenRestbetrag(s, zahlungen)), 0);
  const verbindlichkeiten = schulden.filter((s) => s.richtung === 'ich_schulde')
    .reduce((sum, s) => sum + Math.max(0, schuldenRestbetrag(s, zahlungen)), 0);
  return unechterGesamtKontostand(konten, expenses, einnahmen, teile, heute) + forderungen - verbindlichkeiten;
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/finanzen/berechnung.js test/finanzen-berechnung.test.js
git commit -m "feat: Mehrkonten-Kontostand und Schulden-Berechnungen"
```

---

### Task 2: Datenzugriff — Konten, Einnahmen, Schulden

**Files:**
- Modify: `js/module/finanzen/daten.js`

**Interfaces:**
- Konsumiert: nichts aus Task 1 (reiner Supabase-Zugriff).
- Produziert: `ladeAlles()` liefert jetzt zusätzlich `{ konten,
  einnahmen, einnahmenVorlagen, schulden, zahlungen }` neben den
  bisherigen `{ expenses, settings, teile }`. Neue Funktionen:
  `legeEinnahmeAn({ betrag, bezeichnung, notiz, datum, quelle,
  konto_id, wiederkehr })`, `bestaetigeEinnahmenVorlage(vorlage)`,
  `entferneEinnahme(einnahme)`, `legeKontoAn({ id, name,
  kontostand_start, stand_datum })`, `legeSchuldAn({ person,
  gesamtbetrag, richtung, notiz })`, `verbucheZahlung(schuldId, betrag)`
  — werden von Task 3/4/5 (UI-Dateien) importiert und aufgerufen.

- [ ] **Schritt 1: `ladeAlles` erweitern**

Die bestehende Funktion

```js
export async function ladeAlles() {
  const [expenses, settings, teile] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
  ]);
  if (expenses.error) throw fehler('Ausgaben laden', expenses.error);
  if (settings.error) throw fehler('Einstellungen laden', settings.error);
  if (teile.error) throw fehler('Teile laden', teile.error);
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { expenses: expenses.data, settings: settingsObj, teile: teile.data };
}
```

ersetzen durch:

```js
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
```

- [ ] **Schritt 2: Einnahmen-Funktionen ergänzen**

Die bestehende Import-Zeile am Dateianfang

```js
import { supabase } from '../../supabase.js';
```

ersetzen durch:

```js
import { supabase } from '../../supabase.js';
import { naechsteFaelligkeit } from '../todos/planung.js';
```

Nach `entferneAusgabe` (vor `setzeKontostandStart`) einfügen:

```js
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
```

- [ ] **Schritt 3: Konten- und Schulden-Funktionen ergänzen**

Nach `entferneTeil`/`setzeStatus` (am Dateiende) einfügen:

```js
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
```

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/module/finanzen/daten.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (`daten.js` hat keine
automatisierten Tests, siehe Global Constraints — die bestehende Suite
ist von dieser Änderung nicht betroffen).

- [ ] **Schritt 5: Commit**

```bash
git add js/module/finanzen/daten.js
git commit -m "feat: Datenzugriff fuer Konten, Einnahmen und Schulden"
```

---

### Task 3: UI-Tab "Einnahmen"

**Files:**
- Create: `js/module/finanzen/einnahmen.js`

**Interfaces:**
- Konsumiert: `legeEinnahmeAn`, `bestaetigeEinnahmenVorlage`,
  `entferneEinnahme` (Task 2, `./daten.js`).
- Produziert: `zeigeEinnahmen(container, zustand, aktualisieren):
  Promise<void>` — wird von Task 6 (`index.js`) importiert.

- [ ] **Schritt 1: Datei anlegen**

```js
import { legeEinnahmeAn, bestaetigeEinnahmenVorlage, entferneEinnahme } from './daten.js';

const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function baueFormular(container, zustand, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  const kontoOptionen = zustand.konten
    .map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('');
  form.innerHTML = `
    <input name="betrag" type="number" step="0.01" placeholder="Betrag" required>
    <input name="bezeichnung" type="text" placeholder="Bezeichnung (z. B. Handyreparaturen)">
    <input name="datum" type="date" value="${heute()}" required>
    <select name="konto_id" required>${kontoOptionen}</select>
    <button type="submit">+ Einnahme anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeEinnahmeAn({
        betrag: Number(daten.get('betrag')),
        bezeichnung: daten.get('bezeichnung') || 'sonstiges',
        datum: daten.get('datum'),
        konto_id: daten.get('konto_id'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeEinnahmen(container, zustand, aktualisieren) {
  baueFormular(container, zustand, aktualisieren);

  const faelligeVorlagen = zustand.einnahmenVorlagen.filter((v) => v.naechste_faelligkeit <= heute());
  if (faelligeVorlagen.length > 0) {
    const abschnitt = document.createElement('div');
    abschnitt.className = 'punkt-liste';
    for (const v of faelligeVorlagen) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.innerHTML = `
        <div class="icon-badge">${EINNAHME_ICON}</div>
        <div class="punkt-info">
          <strong>${esc(v.bezeichnung)}</strong>
          <small>fällig seit ${v.naechste_faelligkeit} · ${v.betrag.toFixed(2)} €</small>
        </div>
        <button data-a="eingegangen">Eingegangen</button>`;
      zeile.querySelector('[data-a=eingegangen]').addEventListener('click', async () => {
        try { await bestaetigeEinnahmenVorlage(v); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
      abschnitt.appendChild(zeile);
    }
    container.appendChild(abschnitt);
  }

  if (zustand.einnahmen.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Noch keine Einnahmen eingetragen.';
    container.appendChild(p);
  }

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (const e of zustand.einnahmen) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${EINNAHME_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(e.bezeichnung)}</strong>
        <small>${e.datum}${e.notiz ? ` · ${esc(e.notiz)}` : ''}</small>
      </div>
      <strong class="betrag-plus">+${e.betrag.toFixed(2)} €</strong>
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      const hinweis = e.vorlage_id
        ? `„${e.bezeichnung}" entfernen? Die Wiederkehr wird beendet.`
        : `„${e.bezeichnung}" entfernen?`;
      if (!confirm(hinweis)) return;
      try { await entferneEinnahme(e); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
    liste.appendChild(zeile);
  }
}
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/finanzen/einnahmen.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 3: Prüfen, ob `.betrag-plus`/`.punkt-formular` bereits in `app.css` existieren**

Run: `grep -n "betrag-plus\|punkt-formular" app.css`
Falls beide Klassen fehlen (erwartet — `.betrag-minus` existiert
bereits, `.betrag-plus`/`.punkt-formular` sind neu), in `app.css` direkt
nach der bestehenden `.betrag-minus`-Regel ergänzen:

```css
.betrag-plus { color: var(--hm-gruen); }
.punkt-formular { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.punkt-formular input, .punkt-formular select { flex: 1; min-width: 100px; }
.punkt-formular button { flex: none; }
```

(`--hm-gruen` als CSS-Variable prüfen: `grep -n -- "--hm-gruen:" app.css`
— falls die Variable unter anderem Namen existiert, z. B. nur `--green`
o. Ä., den tatsächlich vorhandenen Namen verwenden statt `--hm-gruen`.)

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/einnahmen.js app.css
git commit -m "feat: UI-Tab Einnahmen mit Formular und Vorlagen-Bestaetigung"
```

---

### Task 4: UI-Tab "Konten"

**Files:**
- Create: `js/module/finanzen/konten.js`

**Interfaces:**
- Konsumiert: `legeKontoAn` (Task 2, `./daten.js`); `kontostandProKonto`
  (Task 1, `./berechnung.js`).
- Produziert: `zeigeKonten(container, zustand, aktualisieren):
  Promise<void>` — wird von Task 6 (`index.js`) importiert. Zeigt pro
  Konto zusätzlich dessen einzelne Transaktionen (Ausgaben + Einnahmen
  dieses Kontos) — explizite Anforderung aus `CLAUDE.md` ("einzelne
  Konten mit ihren jeweiligen Transaktionen"), nicht nur der Saldo.

- [ ] **Schritt 1: Datei anlegen**

```js
import { legeKontoAn } from './daten.js';
import { kontostandProKonto } from './berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="name" type="text" placeholder="Kontoname (z. B. Trade Republic)" required>
    <input name="kontostand_start" type="number" step="0.01" placeholder="Aktueller Stand" required>
    <input name="stand_datum" type="date" value="${heute()}" required>
    <button type="submit">+ Konto anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeKontoAn({
        name: daten.get('name'),
        kontostand_start: Number(daten.get('kontostand_start')),
        stand_datum: daten.get('stand_datum'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeKonten(container, zustand, aktualisieren) {
  baueFormular(container, aktualisieren);

  const heuteStr = heute();
  for (const k of zustand.konten) {
    const stand = kontostandProKonto(k, zustand.expenses, zustand.einnahmen, heuteStr);
    const kopf = document.createElement('div');
    kopf.className = 'punkt-zeile';
    kopf.innerHTML = `
      <div class="icon-badge">${WALLET_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(k.name)}</strong>
        <small>Stand seit ${k.stand_datum}: ${k.kontostand_start.toFixed(2)} €</small>
      </div>
      <strong>${stand.toFixed(2)} €</strong>
      <div class="punkt-aktionen"><button data-a="neusetzen">Neu setzen</button></div>`;
    kopf.querySelector('[data-a=neusetzen]').addEventListener('click', async () => {
      const neuerStand = prompt(`Neuen Stand für „${k.name}" (heute, ${heuteStr}):`, stand.toFixed(2));
      if (neuerStand === null) return;
      const zahl = Number(neuerStand);
      if (Number.isNaN(zahl)) { alert('Bitte eine Zahl eingeben.'); return; }
      try {
        await legeKontoAn({ id: k.id, name: k.name, kontostand_start: zahl, stand_datum: heuteStr });
        await aktualisieren();
      } catch (err) { alert(err.message); }
    });
    container.appendChild(kopf);

    const transaktionen = [
      ...zustand.expenses.filter((e) => e.konto_id === k.id)
        .map((e) => ({ datum: e.datum, text: e.notiz || e.kategorie, betrag: e.betrag, typ: 'ausgabe' })),
      ...zustand.einnahmen.filter((e) => e.konto_id === k.id)
        .map((e) => ({ datum: e.datum, text: e.bezeichnung, betrag: e.betrag, typ: 'einnahme' })),
    ].sort((a, b) => (a.datum < b.datum ? 1 : -1));

    const liste = document.createElement('div');
    liste.className = 'punkt-liste';
    liste.innerHTML = transaktionen.length === 0
      ? '<p class="lade">Noch keine Transaktionen auf diesem Konto.</p>'
      : transaktionen.map((t) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><small>${t.datum} · ${esc(t.text)}</small></div>
          <strong class="${t.typ === 'einnahme' ? 'betrag-plus' : 'betrag-minus'}">${t.typ === 'einnahme' ? '+' : '-'}${t.betrag.toFixed(2)} €</strong>
        </div>`).join('');
    container.appendChild(liste);
  }
}
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/finanzen/konten.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 3: Commit**

```bash
git add js/module/finanzen/konten.js
git commit -m "feat: UI-Tab Konten mit Anlegen und Stand-Neusetzen"
```

---

### Task 5: UI-Tab "Schulden"

**Files:**
- Create: `js/module/finanzen/schulden.js`

**Interfaces:**
- Konsumiert: `legeSchuldAn`, `verbucheZahlung` (Task 2, `./daten.js`);
  `schuldenRestbetrag`, `sortiereSchulden` (Task 1, `./berechnung.js`).
- Produziert: `zeigeSchulden(container, zustand, aktualisieren):
  Promise<void>` — wird von Task 6 (`index.js`) importiert. Zeigt pro
  Schuld zusätzlich den Zahlungs-Verlauf (einzelne Teilzahlungen aus
  `zustand.zahlungen`) — explizite Nutzer-Anforderung "mit
  Teilzahlungen/Verlauf", nicht nur der berechnete Restbetrag.

- [ ] **Schritt 1: Datei anlegen**

```js
import { legeSchuldAn, verbucheZahlung } from './daten.js';
import { schuldenRestbetrag, sortiereSchulden } from './berechnung.js';

const SCHULD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function baueFormular(container, aktualisieren) {
  const form = document.createElement('form');
  form.className = 'punkt-formular';
  form.innerHTML = `
    <input name="person" type="text" placeholder="Person" required>
    <input name="gesamtbetrag" type="number" step="0.01" placeholder="Betrag" required>
    <select name="richtung" required>
      <option value="mir_wird_geschuldet">wird mir geschuldet</option>
      <option value="ich_schulde">ich schulde</option>
    </select>
    <input name="notiz" type="text" placeholder="Notiz (optional)">
    <button type="submit">+ Schuld anlegen</button>`;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const daten = new FormData(form);
    try {
      await legeSchuldAn({
        person: daten.get('person'),
        gesamtbetrag: Number(daten.get('gesamtbetrag')),
        richtung: daten.get('richtung'),
        notiz: daten.get('notiz'),
      });
      await aktualisieren();
    } catch (err) { alert(err.message); }
  });
  container.appendChild(form);
}

export async function zeigeSchulden(container, zustand, aktualisieren) {
  baueFormular(container, aktualisieren);

  const sortiert = sortiereSchulden(zustand.schulden, zustand.zahlungen);
  if (sortiert.length === 0) {
    const p = document.createElement('p');
    p.className = 'lade';
    p.textContent = 'Keine Schulden eingetragen.';
    container.appendChild(p);
  }

  for (const s of sortiert) {
    const rest = schuldenRestbetrag(s, zustand.zahlungen);
    const richtungText = s.richtung === 'mir_wird_geschuldet' ? 'schuldet mir' : 'ich schulde';
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${SCHULD_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(s.person)}</strong>
        <small>${richtungText}, Gesamt ${s.gesamtbetrag.toFixed(2)} €${s.notiz ? ` · ${esc(s.notiz)}` : ''}</small>
      </div>
      <strong>${rest > 0 ? rest.toFixed(2) + ' €' : 'beglichen'}</strong>
      ${rest > 0 ? '<div class="punkt-aktionen"><button data-a="zahlung">+ Zahlung</button></div>' : ''}`;
    const zahlungBtn = zeile.querySelector('[data-a=zahlung]');
    if (zahlungBtn) {
      zahlungBtn.addEventListener('click', async () => {
        const betrag = prompt(`Zahlung für „${s.person}" (Restbetrag ${rest.toFixed(2)} €):`, rest.toFixed(2));
        if (betrag === null) return;
        const zahl = Number(betrag);
        if (Number.isNaN(zahl) || zahl <= 0) { alert('Bitte einen gültigen Betrag eingeben.'); return; }
        try { await verbucheZahlung(s.id, zahl); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
    }
    container.appendChild(zeile);

    const eigeneZahlungen = zustand.zahlungen.filter((z) => z.schuld_id === s.id)
      .sort((a, b) => (a.datum < b.datum ? 1 : -1));
    if (eigeneZahlungen.length > 0) {
      const verlauf = document.createElement('div');
      verlauf.className = 'punkt-liste';
      verlauf.innerHTML = eigeneZahlungen.map((z) => `
        <div class="punkt-zeile">
          <div class="punkt-info"><small>${z.datum}${z.notiz ? ` · ${esc(z.notiz)}` : ''}</small></div>
          <strong class="betrag-plus">${z.betrag.toFixed(2)} €</strong>
        </div>`).join('');
      container.appendChild(verlauf);
    }
  }
}
```

- [ ] **Schritt 2: Statische Prüfung**

Run: `node --check js/module/finanzen/schulden.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 3: Commit**

```bash
git add js/module/finanzen/schulden.js
git commit -m "feat: UI-Tab Schulden mit Anlegen und Teilzahlungen"
```

---

### Task 6: Tabs verdrahten

**Files:**
- Modify: `js/module/finanzen/index.js`

**Interfaces:**
- Konsumiert: `zeigeEinnahmen` (Task 3), `zeigeKonten` (Task 4),
  `zeigeSchulden` (Task 5).

- [ ] **Schritt 1: `TABS` erweitern**

Die bestehende Zeile

```js
const TABS = [['ausgaben', 'Ausgaben'], ['kontostand', 'Kontostand'], ['monat', 'Monat'],
  ['abos', 'Abos'], ['teile', 'Teile'], ['bestellen', 'Bestellen']];
```

ersetzen durch:

```js
const TABS = [['ausgaben', 'Ausgaben'], ['einnahmen', 'Einnahmen'], ['kontostand', 'Kontostand'],
  ['konten', 'Konten'], ['schulden', 'Schulden'], ['monat', 'Monat'],
  ['abos', 'Abos'], ['teile', 'Teile'], ['bestellen', 'Bestellen']];
```

- [ ] **Schritt 2: `LADER` erweitern**

Die bestehende Zeile

```js
const LADER = {
  ausgaben: () => import('./ausgaben.js').then((m) => m.zeigeAusgaben),
  kontostand: () => import('./kontostand.js').then((m) => m.zeigeKontostand),
  monat: () => import('./monat.js').then((m) => m.zeigeMonat),
  abos: () => import('./abos.js').then((m) => m.zeigeAbos),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};
```

ersetzen durch:

```js
const LADER = {
  ausgaben: () => import('./ausgaben.js').then((m) => m.zeigeAusgaben),
  einnahmen: () => import('./einnahmen.js').then((m) => m.zeigeEinnahmen),
  kontostand: () => import('./kontostand.js').then((m) => m.zeigeKontostand),
  konten: () => import('./konten.js').then((m) => m.zeigeKonten),
  schulden: () => import('./schulden.js').then((m) => m.zeigeSchulden),
  monat: () => import('./monat.js').then((m) => m.zeigeMonat),
  abos: () => import('./abos.js').then((m) => m.zeigeAbos),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/index.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/index.js
git commit -m "feat: neue Finanzen-Tabs Einnahmen/Konten/Schulden verdrahtet"
```

---

### Task 7: Bestehende Kontostand-Aufrufer auf Mehrkonten umstellen

**Files:**
- Modify: `js/module/finanzen/kontostand.js`
- Modify: `js/module/home/index.js`

**Interfaces:**
- Konsumiert: `gesamtKontostand`, `unechterGesamtKontostand`,
  `nettoVermoegen` (Task 1, `finanzen/berechnung.js`) statt der
  entfernten `kontostand`/`unechterKontostand`. `nettoVermoegen` wird
  in dieser Sub-Etappe an keiner anderen Stelle angezeigt — Task 7 ist
  ihr einziger Anzeigeort (Definition of Done fordert alle vier
  Kontostand-Kennzahlen aus der Spec, nicht nur drei).

- [ ] **Schritt 1: `kontostand.js` umstellen**

Die komplette bestehende Datei

```js
import { kontostand, unechterKontostand, summeProMonat } from './berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeKontostand(container, zustand, aktualisieren) {
  const gesetzt = zustand.settings.kontostand_start !== undefined;

  if (gesetzt) {
    const stand = kontostand(zustand.settings, zustand.expenses, heute());
    const jetzt = new Date();
    const ausgabenMonat = summeProMonat(zustand.expenses, jetzt.getFullYear(), jetzt.getMonth() + 1);
    const unecht = unechterKontostand(zustand.settings, zustand.expenses, zustand.teile, heute());
    const box = document.createElement('div');
    box.className = 'stat-karte gross';
    box.innerHTML = `
      <div class="stat-kopf">
        <div class="icon-badge">${WALLET_ICON}</div>
        <small>Aktueller Kontostand</small>
      </div>
      <span>${stand.toFixed(2)} €</span>
      <small class="betrag-minus">-${ausgabenMonat.toFixed(2)} € Ausgaben diesen Monat</small>
      <small>${unecht.toFixed(2)} € inkl. Warenwert (unechter Kontostand)</small>`;
    container.appendChild(box);
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = `Ausgangswert ${zustand.settings.kontostand_start.toFixed(2)} € `
      + `am ${zustand.settings.stand_datum}, seither alle Ausgaben abgezogen.`;
    container.appendChild(hinweis);
  } else {
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = 'Noch kein Kontostand gesetzt.';
    container.appendChild(hinweis);
  }
}
```

komplett ersetzen durch:

```js
import { gesamtKontostand, unechterGesamtKontostand, nettoVermoegen, summeProMonat } from './berechnung.js';

const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeKontostand(container, zustand, aktualisieren) {
  const gesetzt = zustand.konten.length > 0;

  if (gesetzt) {
    const stand = gesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, heute());
    const jetzt = new Date();
    const ausgabenMonat = summeProMonat(zustand.expenses, jetzt.getFullYear(), jetzt.getMonth() + 1);
    const unecht = unechterGesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, zustand.teile, heute());
    const netto = nettoVermoegen(zustand.konten, zustand.expenses, zustand.einnahmen, zustand.teile, zustand.schulden, zustand.zahlungen, heute());
    const box = document.createElement('div');
    box.className = 'stat-karte gross';
    box.innerHTML = `
      <div class="stat-kopf">
        <div class="icon-badge">${WALLET_ICON}</div>
        <small>Aktueller Kontostand (alle Konten)</small>
      </div>
      <span>${stand.toFixed(2)} €</span>
      <small class="betrag-minus">-${ausgabenMonat.toFixed(2)} € Ausgaben diesen Monat</small>
      <small>${unecht.toFixed(2)} € inkl. Warenwert (unechter Kontostand)</small>
      <small>${netto.toFixed(2)} € Netto-Vermögen (inkl. Warenwert und offener Schulden)</small>`;
    container.appendChild(box);
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = `Aufgeteilt auf ${zustand.konten.length} Konto${zustand.konten.length === 1 ? '' : 'en'} — Details im Tab „Konten".`;
    container.appendChild(hinweis);
  } else {
    const hinweis = document.createElement('p');
    hinweis.className = 'lade';
    hinweis.textContent = 'Noch kein Konto angelegt.';
    container.appendChild(hinweis);
  }
}
```

- [ ] **Schritt 2: `home/index.js` umstellen**

Die bestehende Import-Zeile

```js
import { kontostand, unechterKontostand, summeProMonat } from '../finanzen/berechnung.js';
```

ersetzen durch:

```js
import { gesamtKontostand, unechterGesamtKontostand, summeProMonat } from '../finanzen/berechnung.js';
```

Die bestehenden Zeilen

```js
    const gesetzt = finanzen.settings.kontostand_start !== undefined;
    const stand = gesetzt ? kontostand(finanzen.settings, finanzen.expenses, heute()) : null;
    const unecht = gesetzt ? unechterKontostand(finanzen.settings, finanzen.expenses, finanzen.teile, heute()) : null;
```

ersetzen durch:

```js
    const gesetzt = finanzen.konten.length > 0;
    const stand = gesetzt ? gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute()) : null;
    const unecht = gesetzt ? unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heute()) : null;
```

- [ ] **Schritt 3: Test & statische Prüfung**

Run: `npm test`
Expected: alle Tests weiterhin PASS.

Run: `node --check js/module/finanzen/kontostand.js && node --check js/module/home/index.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/kontostand.js js/module/home/index.js
git commit -m "fix: Kontostand-Tab und Home auf Mehrkonten-Berechnung umgestellt"
```

---

### Task 8: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` – neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum des Implementierungstags), Was/Warum/
Entscheidungen/Stand-danach-Muster wie bei den vorherigen Etappen.
Inhalt: neue Tabellen `konten`/`einnahmen`/`einnahmen_vorlagen`/
`schulden`/`schulden_zahlungen`, `expenses.konto_id`, Ergebnis der
Vorbereitungs-Migration (übernommene Hauptkonto-Werte, konkrete Zahlen
einsetzen), die Vorlagen-Bestätigungs-Mechanik, die vier
Kontostand-Kennzahlen. **Wichtig laut Doku-Rigor-Regel:** auch
auftretende Fehler/verworfene Ansätze während der Umsetzung dieser
Sub-Etappe dokumentieren, nicht nur das Endergebnis (z. B. falls die
Migrations-Reihenfolge Konten/Vorlagen/Einnahmen angepasst werden
musste, falls Testwerte nicht auf Anhieb stimmten o. Ä.). Unter "Offene
Punkte": Sub-Etappe B (Finanzen-Redesign mit Einnahmen+Ausgaben,
Zeitraum-Filter, Regelmäßige-Ausgaben-Vorlagen) als Nächstes, ganzer
Backlog A–Q weiterhin in `CLAUDE.md`.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand" aktualisieren: Sub-Etappe A als fertig
markieren, Sub-Etappe B als Nächstes. Abschnitt zum Finanzen-Modul (im
"Aufbau"-Teil weiter unten in der Datei) um die neuen Dateien
(`einnahmen.js`, `konten.js`, `schulden.js`), neuen Tabs, und die
Tatsache ergänzen, dass es jetzt die ersten echten Formulare der App
gibt. `npm test`-Ausgabe tatsächlich ausführen und die echte Testanzahl
übernehmen (nicht die alte Zahl weiterschreiben).

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe A (Konten/Einnahmen/Schulden) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Vorbereitungs-Migration ausgeführt (Konten/Einnahmen/Vorlagen/
      Schulden/Zahlungen angelegt, `expenses.konto_id` befüllt, alte
      `finance_settings`-Kontostand-Keys entfernt).
- [ ] Alle 8 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Einnahme anlegen (Formular + Chat-Diktat-fähige `daten.js`-
      Funktion), wiederkehrende Einnahme per Vorlage bestätigen
      funktioniert und rückt korrekt vor.
- [ ] Konto anlegen, Stand neu setzen, Kontostand pro Konto und gesamt
      korrekt (Kontostand-Tab und Home zeigen den Mehrkonten-Wert).
- [ ] Schuld anlegen, Teilzahlung verbuchen, Restbetrag korrekt,
      beglichene Schulden werden als solche angezeigt.
- [ ] Keine Regression: bestehende Ausgaben/Teile/Abos/Bestellen-Tabs
      funktionieren unverändert.
- [ ] `docs/PROJEKT-LOG.md` (inkl. aufgetretener Fehler/verworfener
      Ansätze) + `CLAUDE.md` aktualisiert, nach `main` gemergt, gepusht.
