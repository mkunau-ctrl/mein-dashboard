# Etappe 4, Sub-Etappe B: Finanzen-Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finanzen-Modul bekommt die drei Prototyp-Tabs Übersicht/
Transaktionen/Analyse mit echten Einnahmen+Ausgaben, echtem
Zeitraum-Filter, CSV-Export, echte Vorlagen für regelmäßige Ausgaben
(ersetzt die reine Muster-Erkennung), und einen Kontostand-Detail-Screen
von Home aus mit echter Sparkline.

**Architecture:** Neue reine Berechnungsfunktionen in
`js/module/finanzen/berechnung.js` (Zeitraum-Grenzen, Zeitraum-basierte
Kategorien-Summen, Monats-Reihen, Jahresübersicht, Kontostand-Verlauf,
CSV-Zeilen). Drei neue UI-Tabs + ein neuer "Regelmäßige Ausgaben"-Tab
(ersetzt "Abos", "Monat" entfällt zugunsten von "Analyse"). Ein
geteilter `zeitraum`-Zustand in `finanzen/index.js` wird an Übersicht
und Transaktionen durchgereicht. Der Kontostand-Detail-Screen wird eine
Unterseite von `home/index.js` (`#/home/kontostand`), das dafür einen
eigenen `hashchange`-Listener bekommt (Muster wie bei Finanzen/Todos/
Berichtsheft).

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase (Postgres + RLS),
kein Framework, kein Build.

**Spec:** `docs/superpowers/specs/2026-09-21-etappe-4-sub-b-finanzen-redesign-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`-Funktionen bekommen automatisierte Tests
  (Projekt-Konvention).
- `naechsteFaelligkeit` (aus `js/module/todos/planung.js`) **immer** mit
  `{ plan_typ: 'monatlich', plan_tag_im_monat }` aufrufen, nie mit der
  rohen Vorlagen-Zeile — das war der Critical-Bug aus Sub-Etappe A's
  Whole-Branch-Review, hier von Anfang an richtig machen.
- CSV-Format: Komma-getrennt, Dezimalpunkt, ISO-Datum, UTF-8 (Spec
  Abschnitt 2).
- Analyse-Tab-Kategorien beziehen sich auf den **aktuellen
  Kalendermonat**, nicht auf den Übersicht/Transaktionen-Zeitraum (Spec
  Abschnitt 2 — bewusste Entkopplung).
- **Abweichung von der Spec, beim Planen gefunden:** Spec Abschnitt 5
  beschreibt `legeAusgabenVorlageAn` so, als würde sie (wie
  `legeEinnahmeAn`) zusätzlich zur Vorlage sofort eine neue
  `expenses`-Zeile anlegen. Das ist beim "Als Vorlage übernehmen"-Fluss
  falsch: die erkannten Abo-Muster (`erkenneAbos`) basieren auf bereits
  vorhandenen `expenses`-Zeilen aus der Vergangenheit — eine weitere,
  neue Zeile beim Übernehmen anzulegen würde eine Zahlung verdoppeln,
  die es so nie gab. Task 6 unten legt deshalb `legeAusgabenVorlageAn`
  bewusst **ohne** begleitende `expenses`-Zeile an (nur die Vorlage,
  `naechste_faelligkeit` kommt direkt aus dem erkannten Muster) — die
  erste echte Ausgabe entsteht erst beim nächsten `bestaetigeAusgabenVorlage`-
  Aufruf. Wird in Task 9 (Doku) im Projekt-Log festgehalten.

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, da reine DB-Aktion ohne Repo-Dateien, gleiches Muster wie
Sub-Etappe A):**

1. Tabelle `ausgaben_vorlagen` anlegen (1:1 wie `einnahmen_vorlagen`:
   `id uuid primary key default gen_random_uuid()`, `user_id uuid not
   null default auth.uid() references auth.users`, `bezeichnung text
   not null`, `betrag numeric not null`, `plan_tag_im_monat int not
   null`, `naechste_faelligkeit date not null`, `konto_id uuid not null
   references konten`, `aktiv boolean not null default true`), RLS wie
   überall.
2. Spalte `vorlage_id uuid references ausgaben_vorlagen` auf `expenses`
   ergänzen (nullable, mirrors `einnahmen.vorlage_id`).

---

### Task 1: Berechnungen — Zeitraum, Analyse, Kontostand-Verlauf, CSV

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `zeitraumVon(bereich, heute): string`,
  `summenProKategorieZeitraum(expenses, von, bis): {kategorie,summe}[]`,
  `summenProBezeichnungZeitraum(einnahmen, von, bis): {bezeichnung,summe}[]`,
  `letzteMonate(anzahl, heute): {jahr,monat}[]`,
  `jahresUebersicht(expenses, einnahmen, jahr): {einnahmenSumme,
  ausgabenSumme, sparquote}`, `kontostandVerlauf(konten, expenses,
  einnahmen, tage, heute): {datum,stand}[]`, `zuCsvZeilen(transaktionen):
  string[]` — werden von Task 3 (`uebersicht.js`), Task 4
  (`transaktionen.js`), Task 5 (`analyse.js`) und Task 8
  (`home/kontostand.js`) importiert.
- Konsumiert: `gesamtKontostand` (bereits in `berechnung.js`, für
  `kontostandVerlauf`), `warenwert` (nur in Task 8 gebraucht,
  unverändert).

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

Die bestehende Import-Zeile am Dateianfang

```js
import { summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus,
  kategorisiereIconTyp, kontostandProKonto, gesamtKontostand,
  unechterGesamtKontostand, schuldenRestbetrag, offeneSchulden,
  sortiereSchulden, nettoVermoegen }
  from '../js/module/finanzen/berechnung.js';
```

ersetzen durch:

```js
import { summeProMonat, summenProKategorie, erkenneAbos,
  warenwert, sortiereTeile, merkliste, naechsterStatus,
  kategorisiereIconTyp, kontostandProKonto, gesamtKontostand,
  unechterGesamtKontostand, schuldenRestbetrag, offeneSchulden,
  sortiereSchulden, nettoVermoegen, zeitraumVon,
  summenProKategorieZeitraum, summenProBezeichnungZeitraum,
  letzteMonate, jahresUebersicht, kontostandVerlauf, zuCsvZeilen }
  from '../js/module/finanzen/berechnung.js';
```

Ganz am Ende der Datei (nach dem letzten `nettoVermoegen`-Test)
ergänzen:

```js
test('zeitraumVon: Tage-Bereiche', () => {
  assert.equal(zeitraumVon('7T', '2026-09-21'), '2026-09-14');
  assert.equal(zeitraumVon('30T', '2026-09-21'), '2026-08-22');
});

test('zeitraumVon: Monats-Bereiche, inkl. Jahreswechsel bei 1J', () => {
  assert.equal(zeitraumVon('3M', '2026-09-21'), '2026-06-21');
  assert.equal(zeitraumVon('6M', '2026-09-21'), '2026-03-21');
  assert.equal(zeitraumVon('1J', '2026-09-21'), '2025-09-21');
});

test('summenProKategorieZeitraum: wie summenProKategorie, aber Datumsfenster statt Kalendermonat', () => {
  assert.deepEqual(summenProKategorieZeitraum(expenses, '2026-09-01', '2026-09-16'), [
    { kategorie: 'lebensmittel', summe: 65 },
    { kategorie: 'tanken', summe: 20 },
  ]);
});

test('summenProBezeichnungZeitraum: gruppiert Einnahmen nach Bezeichnung im Datumsfenster', () => {
  assert.deepEqual(summenProBezeichnungZeitraum(einnahmen, '2026-09-01', '2026-09-16'), [
    { bezeichnung: 'Ausbildungsverguetung', summe: 750 },
    { bezeichnung: 'Dividende', summe: 200 },
  ]);
});

test('letzteMonate: die letzten n Kalendermonate inkl. dem aktuellen, aelteste zuerst', () => {
  assert.deepEqual(letzteMonate(3, '2026-09-21'), [
    { jahr: 2026, monat: 7 }, { jahr: 2026, monat: 8 }, { jahr: 2026, monat: 9 },
  ]);
});

test('letzteMonate: Jahreswechsel wird korrekt ueberschritten', () => {
  assert.deepEqual(letzteMonate(6, '2026-01-15'), [
    { jahr: 2025, monat: 8 }, { jahr: 2025, monat: 9 }, { jahr: 2025, monat: 10 },
    { jahr: 2025, monat: 11 }, { jahr: 2025, monat: 12 }, { jahr: 2026, monat: 1 },
  ]);
});

test('jahresUebersicht: Summen und Sparquote fuers Jahr', () => {
  // einnahmenSumme 950 (750+200), ausgabenSumme 185 (20+50+15+100), Sparquote (950-185)/950*100 = 80.5
  assert.deepEqual(jahresUebersicht(expenses, einnahmen, 2026), {
    einnahmenSumme: 950, ausgabenSumme: 185, sparquote: 80.5,
  });
});

test('jahresUebersicht: Sparquote ist null ohne Einnahmen (keine Division durch 0)', () => {
  assert.deepEqual(jahresUebersicht([], [], 2026), {
    einnahmenSumme: 0, ausgabenSumme: 0, sparquote: null,
  });
});

test('kontostandVerlauf: ein Eintrag pro Tag, Buchung wirkt erst ab ihrem Datum', () => {
  const konten2 = [{ id: 'k1', name: 'Hauptkonto', kontostand_start: 500, stand_datum: '2026-09-01' }];
  const expenses2 = [{ betrag: 20, kategorie: 'tanken', datum: '2026-09-09', konto_id: 'k1' }];
  assert.deepEqual(kontostandVerlauf(konten2, expenses2, [], 3, '2026-09-10'), [
    { datum: '2026-09-08', stand: 500 },
    { datum: '2026-09-09', stand: 480 },
    { datum: '2026-09-10', stand: 480 },
  ]);
});

test('zuCsvZeilen: Header plus eine Zeile pro Transaktion, Anfuehrungszeichen werden escaped', () => {
  const zeilen = zuCsvZeilen([
    { datum: '2026-09-01', typ: 'ausgabe', bezeichnung: 'Tanken', betrag: 20, quelle: 'manuell' },
    { datum: '2026-09-03', typ: 'einnahme', bezeichnung: 'Kunde "Max"', betrag: 750, quelle: 'manuell' },
  ]);
  assert.deepEqual(zeilen, [
    'Datum,Typ,Bezeichnung,Betrag,Quelle',
    '2026-09-01,ausgabe,"Tanken",20.00,manuell',
    '2026-09-03,einnahme,"Kunde ""Max""",750.00,manuell',
  ]);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — die sieben neuen Funktionen sind keine Exports.

- [ ] **Schritt 3: Funktionen implementieren**

Ganz am Ende von `js/module/finanzen/berechnung.js` ergänzen:

```js
export function zeitraumVon(bereich, heute) {
  const d = new Date(heute + 'T00:00:00Z');
  const TAGE = { '7T': 7, '30T': 30 };
  if (TAGE[bereich]) {
    d.setUTCDate(d.getUTCDate() - TAGE[bereich]);
  } else {
    const MONATE = { '3M': 3, '6M': 6, '1J': 12 };
    d.setUTCMonth(d.getUTCMonth() - MONATE[bereich]);
  }
  return d.toISOString().slice(0, 10);
}

export function summenProKategorieZeitraum(expenses, von, bis) {
  const summen = new Map();
  for (const e of expenses.filter((e) => e.datum >= von && e.datum <= bis)) {
    summen.set(e.kategorie, (summen.get(e.kategorie) || 0) + e.betrag);
  }
  return [...summen.entries()]
    .map(([kategorie, summe]) => ({ kategorie, summe }))
    .sort((a, b) => b.summe - a.summe);
}

export function summenProBezeichnungZeitraum(einnahmen, von, bis) {
  const summen = new Map();
  for (const e of einnahmen.filter((e) => e.datum >= von && e.datum <= bis)) {
    summen.set(e.bezeichnung, (summen.get(e.bezeichnung) || 0) + e.betrag);
  }
  return [...summen.entries()]
    .map(([bezeichnung, summe]) => ({ bezeichnung, summe }))
    .sort((a, b) => b.summe - a.summe);
}

export function letzteMonate(anzahl, heute) {
  const d = new Date(heute + 'T00:00:00Z');
  const ergebnis = [];
  for (let i = anzahl - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    ergebnis.push({ jahr: m.getUTCFullYear(), monat: m.getUTCMonth() + 1 });
  }
  return ergebnis;
}

export function jahresUebersicht(expenses, einnahmen, jahr) {
  const inJahr = (b) => Number(b.datum.slice(0, 4)) === jahr;
  const ausgabenSumme = expenses.filter(inJahr).reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = einnahmen.filter(inJahr).reduce((s, e) => s + e.betrag, 0);
  const sparquote = einnahmenSumme > 0
    ? Math.round(((einnahmenSumme - ausgabenSumme) / einnahmenSumme) * 1000) / 10
    : null;
  return { einnahmenSumme, ausgabenSumme, sparquote };
}

export function kontostandVerlauf(konten, expenses, einnahmen, tage, heute) {
  const ergebnis = [];
  const ende = new Date(heute + 'T00:00:00Z');
  for (let i = tage - 1; i >= 0; i--) {
    const tag = new Date(ende);
    tag.setUTCDate(tag.getUTCDate() - i);
    const datum = tag.toISOString().slice(0, 10);
    ergebnis.push({ datum, stand: gesamtKontostand(konten, expenses, einnahmen, datum) });
  }
  return ergebnis;
}

export function zuCsvZeilen(transaktionen) {
  const header = 'Datum,Typ,Bezeichnung,Betrag,Quelle';
  const zeilen = transaktionen.map((t) =>
    [t.datum, t.typ, `"${String(t.bezeichnung).replace(/"/g, '""')}"`, t.betrag.toFixed(2), t.quelle].join(','));
  return [header, ...zeilen];
}
```

**Wichtig bei Schritt 3:** `jahresUebersicht`s Rundungsformel ist
`Math.round(x * 1000) / 10` **nicht** korrekt für "eine
Nachkommastelle" (das würde auf drei Nachkommastellen runden und durch
10 teilen — falsch). Die korrekte Formel für eine Nachkommastelle ist
`Math.round(x * 10) / 10`, wie oben im Code bereits richtig
geschrieben — dieser Hinweis ist nur zur Warnung, falls beim Abtippen
ein Fehler passiert; der Test aus Schritt 1 (`sparquote: 80.5`) deckt
das ab.

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/finanzen/berechnung.js test/finanzen-berechnung.test.js
git commit -m "feat: Zeitraum-, Analyse- und Kontostand-Verlauf-Berechnungen"
```

---

### Task 2: Datenzugriff — Regelmäßige Ausgaben

**Files:**
- Modify: `js/module/finanzen/daten.js`
- Modify: `js/module/finanzen/ausgaben.js`

**Interfaces:**
- Produziert: `legeAusgabenVorlageAn({ bezeichnung, betrag,
  plan_tag_im_monat, konto_id, naechste_faelligkeit }): Promise<void>`,
  `bestaetigeAusgabenVorlage(vorlage): Promise<void>` — werden von Task 6
  (`regelmaessige-ausgaben.js`) importiert. `ladeAlles()` liefert
  zusätzlich `zustand.ausgabenVorlagen` (aktive Vorlagen).
- **Ändert eine bestehende Schnittstelle:** `entferneAusgabe(id)` wird zu
  `entferneAusgabe(ausgabe)` (nimmt jetzt das ganze Objekt statt nur die
  ID, mirrors `entferneEinnahme(einnahme)`) — der einzige bestehende
  Aufrufer (`ausgaben.js`) wird in diesem Task mit angepasst.

- [ ] **Schritt 1: `ladeAlles` um `ausgaben_vorlagen` erweitern**

Die bestehende Zeile

```js
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
```

ersetzen durch:

```js
  const [expenses, settings, teile, konten, einnahmen, einnahmenVorlagen, schulden, zahlungen, ausgabenVorlagen] = await Promise.all([
    supabase.from('expenses').select('*').order('datum', { ascending: false }),
    supabase.from('finance_settings').select('key,value'),
    supabase.from('parts').select('*'),
    supabase.from('konten').select('*').order('erstellt_am'),
    supabase.from('einnahmen').select('*').order('datum', { ascending: false }),
    supabase.from('einnahmen_vorlagen').select('*').eq('aktiv', true),
    supabase.from('schulden').select('*').order('erstellt_am', { ascending: false }),
    supabase.from('schulden_zahlungen').select('*'),
    supabase.from('ausgaben_vorlagen').select('*').eq('aktiv', true),
  ]);
```

Die bestehende Zeile

```js
  for (const [name, r] of Object.entries({
    Ausgaben: expenses, Einstellungen: settings, Teile: teile, Konten: konten,
    Einnahmen: einnahmen, 'Einnahmen-Vorlagen': einnahmenVorlagen, Schulden: schulden,
    'Schulden-Zahlungen': zahlungen,
  })) {
```

ersetzen durch:

```js
  for (const [name, r] of Object.entries({
    Ausgaben: expenses, Einstellungen: settings, Teile: teile, Konten: konten,
    Einnahmen: einnahmen, 'Einnahmen-Vorlagen': einnahmenVorlagen, Schulden: schulden,
    'Schulden-Zahlungen': zahlungen, 'Ausgaben-Vorlagen': ausgabenVorlagen,
  })) {
```

Die bestehende Rückgabe

```js
  return {
    expenses: expenses.data, settings: settingsObj, teile: teile.data,
    konten: konten.data, einnahmen: einnahmen.data, einnahmenVorlagen: einnahmenVorlagen.data,
    schulden: schulden.data, zahlungen: zahlungen.data,
  };
```

ersetzen durch:

```js
  return {
    expenses: expenses.data, settings: settingsObj, teile: teile.data,
    konten: konten.data, einnahmen: einnahmen.data, einnahmenVorlagen: einnahmenVorlagen.data,
    schulden: schulden.data, zahlungen: zahlungen.data, ausgabenVorlagen: ausgabenVorlagen.data,
  };
```

- [ ] **Schritt 2: `entferneAusgabe` erweitern**

Die bestehende Funktion

```js
export async function entferneAusgabe(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw fehler('Ausgabe entfernen', error);
}
```

ersetzen durch:

```js
export async function entferneAusgabe(ausgabe) {
  if (ausgabe.vorlage_id) {
    const { error: vErr } = await supabase.from('ausgaben_vorlagen')
      .update({ aktiv: false }).eq('id', ausgabe.vorlage_id);
    if (vErr) throw fehler('Wiederkehr beenden', vErr);
  }
  const { error } = await supabase.from('expenses').delete().eq('id', ausgabe.id);
  if (error) throw fehler('Ausgabe entfernen', error);
}
```

- [ ] **Schritt 3: `js/module/finanzen/ausgaben.js` an die neue Signatur anpassen**

Die bestehende Zeile

```js
import { entferneAusgabe } from './daten.js';
```

bleibt unverändert (Name ist gleich, nur der Parameter ändert sich).

Die bestehende Zeile

```js
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm('Ausgabe entfernen?')) return;
      try { await entferneAusgabe(e.id); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
```

ersetzen durch:

```js
      <div class="punkt-aktionen"><button data-a="weg">✕</button></div>`;
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      const hinweis = e.vorlage_id
        ? `„${e.notiz || e.kategorie}" entfernen? Die Wiederkehr wird beendet.`
        : 'Ausgabe entfernen?';
      if (!confirm(hinweis)) return;
      try { await entferneAusgabe(e); await aktualisieren(); }
      catch (err) { alert(err.message); }
    });
```

- [ ] **Schritt 4: Regelmäßige-Ausgaben-Funktionen ergänzen**

Am Dateiende von `js/module/finanzen/daten.js` ergänzen:

```js
export async function legeAusgabenVorlageAn({ bezeichnung, betrag, plan_tag_im_monat, konto_id, naechste_faelligkeit }) {
  const { error } = await supabase.from('ausgaben_vorlagen').insert({
    bezeichnung, betrag, plan_tag_im_monat, naechste_faelligkeit, konto_id,
  });
  if (error) throw fehler('Regelmäßige Ausgabe anlegen', error);
}

export async function bestaetigeAusgabenVorlage(vorlage) {
  const naechste = naechsteFaelligkeit(
    { plan_typ: 'monatlich', plan_tag_im_monat: vorlage.plan_tag_im_monat },
    vorlage.naechste_faelligkeit,
  );
  const { error: upErr } = await supabase.from('ausgaben_vorlagen')
    .update({ naechste_faelligkeit: naechste }).eq('id', vorlage.id);
  if (upErr) throw fehler('Vorlage fortschreiben', upErr);
  const { error: eErr } = await supabase.from('expenses').insert({
    betrag: vorlage.betrag, kategorie: vorlage.bezeichnung,
    datum: vorlage.naechste_faelligkeit, quelle: 'manuell',
    konto_id: vorlage.konto_id, vorlage_id: vorlage.id,
  });
  if (eErr) throw fehler('Ausgabe anlegen', eErr);
}
```

(`naechsteFaelligkeit` ist schon importiert — die bestehende
Import-Zeile `import { naechsteFaelligkeit } from '../todos/planung.js';`
am Dateianfang deckt das bereits ab, seit Sub-Etappe A. Kein neuer
Import nötig.)

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/finanzen/daten.js && node --check js/module/finanzen/ausgaben.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (`daten.js`/`ausgaben.js` sind
ungetestet, siehe Global Constraints — die bestehende Suite ist von
dieser Änderung nicht betroffen).

- [ ] **Schritt 6: Commit**

```bash
git add js/module/finanzen/daten.js js/module/finanzen/ausgaben.js
git commit -m "feat: Datenzugriff fuer regelmaessige Ausgaben"
```

---

### Task 3: Übersicht-Tab

**Files:**
- Create: `js/module/finanzen/uebersicht.js`
- Modify: `app.css`

**Interfaces:**
- Konsumiert: `gesamtKontostand` (bereits vorhanden), `zeitraumVon`,
  `summenProKategorieZeitraum`, `kategorisiereIconTyp` (Task 1, alle aus
  `./berechnung.js`).
- Produziert: `zeigeUebersicht(container, zustand, aktualisieren,
  zeitraum, setZeitraum): Promise<void>` — wird von Task 7 (`index.js`)
  importiert. `setZeitraum(neuerBereich: string): void` ist ein Callback,
  den Task 7 bereitstellt (aktualisiert den geteilten Zeitraum-Zustand
  und rendert den aktuellen Tab neu).

- [ ] **Schritt 1: CSS für die Zeitraum-Buttons ergänzen**

Run: `grep -n "\.range" app.css` — erwartungsgemäß kein Treffer (neue
Klasse). Direkt nach der bestehenden `.punkt-formular button { flex:
none; }`-Regel einfügen:

```css
.range-row { display: flex; gap: 8px; margin: 14px 0 4px; }
.range { flex: 1; text-align: center; padding: 7px 4px; border-radius: 9px;
  font-size: .78rem; font-weight: 600; background: var(--icon-bg);
  color: var(--gedaempft); border: none; font-family: inherit; cursor: pointer; }
.range.aktiv { background: var(--text); color: var(--bg); }
```

- [ ] **Schritt 2: Datei anlegen**

```js
import { gesamtKontostand, zeitraumVon, summenProKategorieZeitraum, kategorisiereIconTyp } from './berechnung.js';

const RANGES = [['7T', '7T'], ['30T', '30T'], ['3M', '3M'], ['6M', '6M'], ['1J', '1J']];

const DOWN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16"/><path d="M6 14l6 6 6-6"/></svg>';
const UP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V4"/><path d="M6 10l6-6 6 6"/></svg>';
const PLUS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
const KATEGORIE_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l2-6h14l2 6v6H3v-6z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></svg>',
  essen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v7a3 3 0 003 3v9M4 3v7M7 3v7"/><path d="M18 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  freizeit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
  sonstiges: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum) {
  const heuteStr = heute();
  const von = zeitraumVon(zeitraum, heuteStr);
  const stand = gesamtKontostand(zustand.konten, zustand.expenses, zustand.einnahmen, heuteStr);
  const imFenster = (b) => b.datum >= von && b.datum <= heuteStr;
  const ausgabenSumme = zustand.expenses.filter(imFenster).reduce((s, e) => s + e.betrag, 0);
  const einnahmenSumme = zustand.einnahmen.filter(imFenster).reduce((s, e) => s + e.betrag, 0);
  const differenz = einnahmenSumme - ausgabenSumme;
  const kategorien = summenProKategorieZeitraum(zustand.expenses, von, heuteStr).slice(0, 4);

  container.innerHTML = `
    <div class="stat-karte gross" id="uebersicht-kontostand" style="cursor:pointer;">
      <small>Kontostand</small>
      <span>${stand.toFixed(2)} €</span>
      <div class="range-row">
        ${RANGES.map(([id, txt]) => `<button type="button" data-range="${id}" class="range${id === zeitraum ? ' aktiv' : ''}">${txt}</button>`).join('')}
      </div>
    </div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="icon-badge gruen">${DOWN_ICON}</div>
        <div class="punkt-info"><strong>Einnahmen</strong></div>
        <strong class="betrag-plus">+${einnahmenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="icon-badge rot">${UP_ICON}</div>
        <div class="punkt-info"><strong>Ausgaben</strong></div>
        <strong class="betrag-minus">-${ausgabenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="icon-badge">${PLUS_ICON}</div>
        <div class="punkt-info"><strong>Differenz</strong></div>
        <strong>${differenz >= 0 ? '+' : ''}${differenz.toFixed(2)} €</strong></div>
    </div>
    <div class="section-head"><h2>Ausgaben nach Kategorie</h2>
      <button type="button" class="link-muted" id="uebersicht-alle-kategorien">Alle anzeigen</button></div>
    <div class="punkt-liste">
      ${kategorien.length === 0 ? '<p class="lade">Keine Ausgaben in diesem Zeitraum.</p>' : kategorien.map((k) => `
        <div class="punkt-zeile">
          <div class="icon-badge">${KATEGORIE_ICON[kategorisiereIconTyp(k.kategorie)]}</div>
          <div class="punkt-info"><strong>${esc(k.kategorie)}</strong></div>
          <strong>${k.summe.toFixed(2)} €</strong>
        </div>`).join('')}
    </div>`;

  container.querySelectorAll('[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => setZeitraum(btn.dataset.range));
  });
  container.querySelector('#uebersicht-kontostand').addEventListener('click', () => {
    location.hash = '#/home/kontostand';
  });
  container.querySelector('#uebersicht-alle-kategorien').addEventListener('click', () => {
    location.hash = '#/finanzen/analyse';
  });
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/uebersicht.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/uebersicht.js app.css
git commit -m "feat: Uebersicht-Tab mit echtem Zeitraum-Filter"
```

---

### Task 4: Transaktionen-Tab + CSV-Export

**Files:**
- Create: `js/module/finanzen/transaktionen.js`
- Modify: `app.css`

**Interfaces:**
- Konsumiert: `zeitraumVon`, `zuCsvZeilen`, `kategorisiereIconTyp`
  (Task 1, `./berechnung.js`).
- Produziert: `zeigeTransaktionen(container, zustand, aktualisieren,
  zeitraum): Promise<void>` — wird von Task 7 (`index.js`) importiert.

- [ ] **Schritt 1: CSS für die Kategorie-Chips ergänzen**

Direkt nach den in Task 3 ergänzten `.range`-Regeln einfügen:

```css
.chips { display: flex; gap: 8px; margin: 14px 0; overflow-x: auto; padding-bottom: 2px; }
.chip { flex: none; padding: 8px 14px; border-radius: 999px; font-size: .82rem;
  font-weight: 600; border: 1px solid var(--rand); background: var(--karte);
  color: var(--gedaempft); cursor: pointer; font-family: inherit; }
.chip.aktiv { background: var(--text); color: var(--bg); border-color: var(--text); }
```

- [ ] **Schritt 2: Datei anlegen**

```js
import { zeitraumVon, zuCsvZeilen, kategorisiereIconTyp } from './berechnung.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const KATEGORIEN = ['alle', 'auto', 'essen', 'freizeit', 'sonstiges'];
const KATEGORIE_TEXT = { alle: 'Alle', auto: 'Auto', essen: 'Essen', freizeit: 'Freizeit', sonstiges: 'Sonstiges' };

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

let suchtext = '';
let kategorie = 'alle';

function baueTransaktionen(zustand, von, bis) {
  const ausgaben = zustand.expenses.filter((e) => e.datum >= von && e.datum <= bis)
    .map((e) => ({ datum: e.datum, typ: 'ausgabe', bezeichnung: e.notiz || e.kategorie, kategorie: e.kategorie, betrag: e.betrag, quelle: e.quelle }));
  const einnahmen = zustand.einnahmen.filter((e) => e.datum >= von && e.datum <= bis)
    .map((e) => ({ datum: e.datum, typ: 'einnahme', bezeichnung: e.bezeichnung, kategorie: null, betrag: e.betrag, quelle: e.quelle }));
  return [...ausgaben, ...einnahmen].sort((a, b) => (a.datum < b.datum ? 1 : -1));
}

function ladeCsv(transaktionen) {
  const zeilen = zuCsvZeilen(transaktionen);
  const blob = new Blob([zeilen.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transaktionen-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function zeigeTransaktionen(container, zustand, aktualisieren, zeitraum) {
  const heuteStr = new Date().toISOString().slice(0, 10);
  const von = zeitraumVon(zeitraum, heuteStr);
  const alleTransaktionen = baueTransaktionen(zustand, von, heuteStr);

  container.innerHTML = `
    <div class="searchbar"><input id="tx-suche" placeholder="Transaktionen suchen …" value="${esc(suchtext)}"></div>
    <div class="chips">
      ${KATEGORIEN.map((k) => `<button type="button" class="chip${k === kategorie ? ' aktiv' : ''}" data-k="${k}">${KATEGORIE_TEXT[k]}</button>`).join('')}
    </div>
    <button type="button" id="tx-csv" class="knopf-neutral">CSV exportieren</button>
    <div class="punkt-liste" id="tx-liste"></div>`;

  function zeichneListe() {
    const gefiltert = alleTransaktionen.filter((t) => {
      if (kategorie !== 'alle' && (t.typ !== 'ausgabe' || kategorisiereIconTyp(t.kategorie) !== kategorie)) return false;
      return t.bezeichnung.toLowerCase().includes(suchtext.toLowerCase());
    });
    const liste = container.querySelector('#tx-liste');
    liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Treffer.</p>' : gefiltert.map((t) => `
      <div class="punkt-zeile">
        <div class="icon-badge">${t.typ === 'einnahme' ? EINNAHME_ICON : AUSGABE_ICON}</div>
        <div class="punkt-info"><strong>${esc(t.bezeichnung)}</strong><small>${t.datum}</small></div>
        <strong class="${t.typ === 'einnahme' ? 'betrag-plus' : 'betrag-minus'}">${t.typ === 'einnahme' ? '+' : '-'}${t.betrag.toFixed(2)} €</strong>
      </div>`).join('');
  }

  container.querySelector('#tx-suche').addEventListener('input', (e) => {
    suchtext = e.target.value;
    zeichneListe();
  });
  container.querySelectorAll('[data-k]').forEach((btn) => {
    btn.addEventListener('click', () => {
      kategorie = btn.dataset.k;
      container.querySelectorAll('[data-k]').forEach((b) => b.classList.toggle('aktiv', b.dataset.k === kategorie));
      zeichneListe();
    });
  });
  container.querySelector('#tx-csv').addEventListener('click', () => ladeCsv(alleTransaktionen));
  zeichneListe();
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/transaktionen.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/transaktionen.js app.css
git commit -m "feat: Transaktionen-Tab mit Suche, Kategorie-Filter und CSV-Export"
```

---

### Task 5: Analyse-Tab (ersetzt Monat-Tab)

**Files:**
- Create: `js/module/finanzen/analyse.js`
- Delete: `js/module/finanzen/monat.js`

**Interfaces:**
- Konsumiert: `summenProKategorie`, `summenProBezeichnungZeitraum`,
  `letzteMonate`, `summeProMonat`, `jahresUebersicht`,
  `kategorisiereIconTyp` (alle bereits vorhanden bzw. Task 1, `./berechnung.js`).
- Produziert: `zeigeAnalyse(container, zustand, aktualisieren):
  Promise<void>` — wird von Task 7 (`index.js`) importiert.

- [ ] **Schritt 1: Datei anlegen**

```js
import { summenProKategorie, summenProBezeichnungZeitraum, letzteMonate,
  summeProMonat, jahresUebersicht, kategorisiereIconTyp } from './berechnung.js';

const KATEGORIE_ICON = {
  auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13l2-6h14l2 6v6H3v-6z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></svg>',
  essen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v7a3 3 0 003 3v9M4 3v7M7 3v7"/><path d="M18 3c-2 0-3 3-3 6s1 4 3 4v8"/></svg>',
  freizeit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9 9h.01M15 9h.01M8 14s1.5 2 4 2 4-2 4-2"/></svg>',
  sonstiges: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function kategorieZeile(k) {
  return `<div class="punkt-zeile">
    <div class="icon-badge">${KATEGORIE_ICON[kategorisiereIconTyp(k.kategorie)]}</div>
    <div class="punkt-info"><strong>${esc(k.kategorie)}</strong></div>
    <strong>${k.summe.toFixed(2)} €</strong>
  </div>`;
}

export async function zeigeAnalyse(container, zustand, aktualisieren) {
  const heuteStr = new Date().toISOString().slice(0, 10);
  const jahr = Number(heuteStr.slice(0, 4));
  const monat = Number(heuteStr.slice(5, 7));
  const monatsAnfang = `${heuteStr.slice(0, 7)}-01`;

  const ausgabenKategorien = summenProKategorie(zustand.expenses, jahr, monat);
  const einnahmenQuellen = summenProBezeichnungZeitraum(zustand.einnahmen, monatsAnfang, heuteStr);

  const monate = letzteMonate(6, heuteStr);
  const monatsDaten = monate.map(({ jahr: j, monat: m }) => ({
    label: MONATE_KURZ[m - 1],
    ausgaben: summeProMonat(zustand.expenses, j, m),
    einnahmen: summeProMonat(zustand.einnahmen, j, m),
  }));
  const maxWert = Math.max(1, ...monatsDaten.flatMap((m) => [m.ausgaben, m.einnahmen]));

  const jahresDaten = jahresUebersicht(zustand.expenses, zustand.einnahmen, jahr);

  container.innerHTML = `
    <div class="section-head"><h2>Ausgaben nach Kategorie (${MONATE_KURZ[monat - 1]})</h2></div>
    <div class="punkt-liste">
      ${ausgabenKategorien.length === 0 ? '<p class="lade">Keine Ausgaben diesen Monat.</p>' : ausgabenKategorien.map(kategorieZeile).join('')}
    </div>
    <div class="section-head"><h2>Einnahmen nach Quelle (${MONATE_KURZ[monat - 1]})</h2></div>
    <div class="punkt-liste">
      ${einnahmenQuellen.length === 0 ? '<p class="lade">Keine Einnahmen diesen Monat.</p>' : einnahmenQuellen.map((q) => `
        <div class="punkt-zeile">
          <div class="icon-badge gruen">${EINNAHME_ICON}</div>
          <div class="punkt-info"><strong>${esc(q.bezeichnung)}</strong></div>
          <strong class="betrag-plus">${q.summe.toFixed(2)} €</strong>
        </div>`).join('')}
    </div>
    <div class="section-head"><h2>Letzte 6 Monate</h2></div>
    <div class="punkt-liste">
      <div style="display:flex;align-items:flex-end;gap:8px;height:120px;padding:14px 4px;">
        ${monatsDaten.map((m) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="display:flex;gap:2px;align-items:flex-end;height:90px;">
              <div style="width:8px;background:var(--hm-gruen);border-radius:3px 3px 0 0;height:${Math.max(2, (m.einnahmen / maxWert) * 90)}px;"></div>
              <div style="width:8px;background:var(--hm-rot);border-radius:3px 3px 0 0;height:${Math.max(2, (m.ausgaben / maxWert) * 90)}px;"></div>
            </div>
            <span style="font-size:.7rem;color:var(--gedaempft);">${m.label}</span>
          </div>`).join('')}
      </div>
    </div>
    <div class="section-head"><h2>Jahresübersicht ${jahr}</h2></div>
    <div class="punkt-liste">
      <div class="punkt-zeile"><div class="punkt-info"><strong>Einnahmen</strong></div><strong class="betrag-plus">+${jahresDaten.einnahmenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Ausgaben</strong></div><strong class="betrag-minus">-${jahresDaten.ausgabenSumme.toFixed(2)} €</strong></div>
      <div class="punkt-zeile"><div class="punkt-info"><strong>Sparquote</strong></div><strong>${jahresDaten.sparquote === null ? '–' : jahresDaten.sparquote + ' %'}</strong></div>
    </div>`;
}
```

- [ ] **Schritt 2: `monat.js` löschen**

```bash
git rm js/module/finanzen/monat.js
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/analyse.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (`monat.js` hatte keine eigenen
Tests, nur seine importierten `berechnung.js`-Funktionen sind getestet
und bleiben unverändert).

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/analyse.js
git commit -m "feat: Analyse-Tab ersetzt Monat-Tab (Kategorien, 6-Monats-Chart, Jahresuebersicht)"
```

---

### Task 6: Regelmäßige-Ausgaben-Tab (ersetzt Abos-Tab)

**Files:**
- Create: `js/module/finanzen/regelmaessige-ausgaben.js`
- Delete: `js/module/finanzen/abos.js`

**Interfaces:**
- Konsumiert: `legeAusgabenVorlageAn`, `bestaetigeAusgabenVorlage`
  (Task 2, `./daten.js`); `erkenneAbos` (bereits vorhanden,
  `./berechnung.js`).
- Produziert: `zeigeRegelmaessigeAusgaben(container, zustand,
  aktualisieren): Promise<void>` — wird von Task 7 (`index.js`)
  importiert.
- **Wichtig (siehe Global Constraints):** `legeAusgabenVorlageAn` beim
  "Übernehmen" eines erkannten Musters legt **keine** begleitende
  `expenses`-Zeile an (anders als `legeEinnahmeAn`s `wiederkehr`-Zweig)
  — die `naechste_faelligkeit` kommt direkt aus dem bereits berechneten
  `a.naechsteFaelligkeit` des erkannten Musters.

- [ ] **Schritt 1: Datei anlegen**

```js
import { legeAusgabenVorlageAn, bestaetigeAusgabenVorlage } from './daten.js';
import { erkenneAbos } from './berechnung.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const WIEDERHOLUNG_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v5h5M20 20v-5h-5"/><path d="M4.5 15a8 8 0 0 0 14.7 3.2M19.5 9A8 8 0 0 0 4.8 5.8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

export async function zeigeRegelmaessigeAusgaben(container, zustand, aktualisieren) {
  const heuteStr = heute();
  const alleVorlagen = zustand.ausgabenVorlagen || [];
  const faellig = alleVorlagen.filter((v) => v.naechste_faelligkeit <= heuteStr);
  const erkannt = erkenneAbos(zustand.expenses);
  const bekannteBezeichnungen = new Set(alleVorlagen.map((v) => v.bezeichnung.toLowerCase()));
  const neueErkannte = erkannt.filter((a) => !bekannteBezeichnungen.has(a.haendler.toLowerCase()));

  container.innerHTML = `
    ${faellig.length > 0 ? '<div class="section-head"><h2>Fällig</h2></div><div class="punkt-liste" id="ra-faellig"></div>' : ''}
    <div class="section-head"><h2>Regelmäßige Ausgaben</h2></div>
    <div class="punkt-liste" id="ra-liste">
      ${alleVorlagen.length === 0 ? '<p class="lade">Noch keine regelmäßigen Ausgaben angelegt.</p>' : ''}
    </div>
    <div class="section-head"><h2>Erkannte Muster</h2></div>
    <div class="punkt-liste" id="ra-erkannt">
      ${neueErkannte.length === 0 ? '<p class="lade">Keine neuen Muster erkannt.</p>' : ''}
    </div>`;

  if (faellig.length > 0) {
    const box = container.querySelector('#ra-faellig');
    for (const v of faellig) {
      const zeile = document.createElement('div');
      zeile.className = 'punkt-zeile';
      zeile.innerHTML = `
        <div class="icon-badge">${AUSGABE_ICON}</div>
        <div class="punkt-info">
          <strong>${esc(v.bezeichnung)}</strong>
          <small>fällig seit ${v.naechste_faelligkeit} · ${v.betrag.toFixed(2)} €</small>
        </div>
        <button data-a="bezahlt">Bezahlt</button>`;
      zeile.querySelector('[data-a=bezahlt]').addEventListener('click', async () => {
        try { await bestaetigeAusgabenVorlage(v); await aktualisieren(); }
        catch (err) { alert(err.message); }
      });
      box.appendChild(zeile);
    }
  }

  const liste = container.querySelector('#ra-liste');
  for (const v of alleVorlagen) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${WIEDERHOLUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(v.bezeichnung)}</strong>
        <small>${v.betrag.toFixed(2)} € · nächste Fälligkeit ${v.naechste_faelligkeit}</small>
      </div>`;
    liste.appendChild(zeile);
  }

  const erkanntBox = container.querySelector('#ra-erkannt');
  for (const a of neueErkannte) {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="icon-badge">${WIEDERHOLUNG_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(a.haendler)}</strong>
        <small>${a.betrag.toFixed(2)} € · ca. ${a.naechsteFaelligkeit}</small>
      </div>
      <button data-a="uebernehmen">Als Vorlage übernehmen</button>`;
    zeile.querySelector('[data-a=uebernehmen]').addEventListener('click', async () => {
      const tag = Number(a.naechsteFaelligkeit.slice(8, 10));
      try {
        await legeAusgabenVorlageAn({
          bezeichnung: a.haendler, betrag: a.betrag, plan_tag_im_monat: tag,
          konto_id: zustand.konten[0]?.id, naechste_faelligkeit: a.naechsteFaelligkeit,
        });
        await aktualisieren();
      } catch (err) { alert(err.message); }
    });
    erkanntBox.appendChild(zeile);
  }
}
```

- [ ] **Schritt 2: `abos.js` löschen**

```bash
git rm js/module/finanzen/abos.js
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/regelmaessige-ausgaben.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/regelmaessige-ausgaben.js
git commit -m "feat: Regelmaessige-Ausgaben-Tab ersetzt Abos-Tab (echte Vorlagen + Uebernehmen)"
```

---

### Task 7: Tabs verdrahten (index.js)

**Files:**
- Modify: `js/module/finanzen/index.js`

**Interfaces:**
- Konsumiert: `zeigeUebersicht` (Task 3), `zeigeTransaktionen`
  (Task 4), `zeigeAnalyse` (Task 5), `zeigeRegelmaessigeAusgaben`
  (Task 6).
- Produziert: alle `zeigeFn`-Aufrufe (auch für die bestehenden Tabs)
  bekommen jetzt einheitlich `(container, zustand, aktualisieren,
  zeitraum, setZeitraum)` übergeben — bestehende Tab-Dateien
  (`ausgaben.js`, `einnahmen.js`, `kontostand.js`, `konten.js`,
  `schulden.js`, `teile.js`, `bestellen.js`) ignorieren die zwei neuen,
  für sie ungenutzten letzten Parameter einfach (kein Aufruferfehler in
  JS bei zu vielen Argumenten) — **diese Dateien müssen dafür nicht
  geändert werden**.

- [ ] **Schritt 1: `TABS` neu sortieren, `monat`/`abos` entfernen, neue Tabs ergänzen**

Die bestehende Zeile

```js
const TABS = [['ausgaben', 'Ausgaben'], ['einnahmen', 'Einnahmen'], ['kontostand', 'Kontostand'],
  ['konten', 'Konten'], ['schulden', 'Schulden'], ['monat', 'Monat'],
  ['abos', 'Abos'], ['teile', 'Teile'], ['bestellen', 'Bestellen']];
```

ersetzen durch:

```js
const TABS = [
  ['uebersicht', 'Übersicht'], ['transaktionen', 'Transaktionen'], ['analyse', 'Analyse'],
  ['ausgaben', 'Ausgaben'], ['einnahmen', 'Einnahmen'], ['kontostand', 'Kontostand'],
  ['konten', 'Konten'], ['schulden', 'Schulden'],
  ['regelmaessige-ausgaben', 'Regelmäßige Ausgaben'],
  ['teile', 'Teile'], ['bestellen', 'Bestellen'],
];
```

- [ ] **Schritt 2: `zeitraum`-Zustand ergänzen**

Die bestehende Zeile

```js
let zustand = null;
let containerRef = null;
```

ersetzen durch:

```js
let zustand = null;
let containerRef = null;
let zeitraum = '30T';
```

- [ ] **Schritt 3: `LADER` erweitern, `monat`/`abos` entfernen**

Die bestehende Zeile

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

ersetzen durch:

```js
const LADER = {
  uebersicht: () => import('./uebersicht.js').then((m) => m.zeigeUebersicht),
  transaktionen: () => import('./transaktionen.js').then((m) => m.zeigeTransaktionen),
  analyse: () => import('./analyse.js').then((m) => m.zeigeAnalyse),
  ausgaben: () => import('./ausgaben.js').then((m) => m.zeigeAusgaben),
  einnahmen: () => import('./einnahmen.js').then((m) => m.zeigeEinnahmen),
  kontostand: () => import('./kontostand.js').then((m) => m.zeigeKontostand),
  konten: () => import('./konten.js').then((m) => m.zeigeKonten),
  schulden: () => import('./schulden.js').then((m) => m.zeigeSchulden),
  'regelmaessige-ausgaben': () => import('./regelmaessige-ausgaben.js').then((m) => m.zeigeRegelmaessigeAusgaben),
  teile: () => import('./teile.js').then((m) => m.zeigeTeile),
  bestellen: () => import('./bestellen.js').then((m) => m.zeigeBestellen),
};
```

- [ ] **Schritt 4: `zeigeAktuellenTab` — Default-Tab und Zeitraum-Übergabe**

Die bestehende Funktion

```js
async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'ausgaben';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}
```

ersetzen durch:

```js
async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'uebersicht';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  const setZeitraum = (neu) => { zeitraum = neu; zeigeAktuellenTab(); };

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    }, zeitraum, setZeitraum);
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
}
```

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/finanzen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/finanzen/index.js
git commit -m "feat: neue Finanzen-Tabs verdrahtet, geteilter Zeitraum-Zustand, Default-Tab Uebersicht"
```

---

### Task 8: Kontostand-Detail-Screen (Home)

**Files:**
- Create: `js/module/home/kontostand.js`
- Modify: `js/module/home/index.js`

**Interfaces:**
- Konsumiert: `gesamtKontostand`, `unechterGesamtKontostand`,
  `kontostandVerlauf`, `warenwert` (Task 1 bzw. bereits vorhanden, aus
  `../finanzen/berechnung.js`).
- Produziert: `zeigeKontostandDetail(container, zustand): Promise<void>`
  — wird von `home/index.js` importiert (dynamischer Import, gleiches
  Muster wie `finanzen/index.js`s `LADER`).

- [ ] **Schritt 1: `js/module/home/kontostand.js` anlegen**

```js
import { gesamtKontostand, unechterGesamtKontostand, kontostandVerlauf, warenwert } from '../finanzen/berechnung.js';

const EYE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.9 10.9 0 0112 5c7 0 11 7 11 7a17.6 17.6 0 01-3.2 4M6.5 6.5C3.6 8.3 1 12 1 12s4 7 11 7c1.4 0 2.7-.2 3.9-.6"/><path d="M9.9 9.9A3 3 0 0014 14"/></svg>';

function heute() {
  return new Date().toISOString().slice(0, 10);
}

function sparklinePunkte(verlauf) {
  if (verlauf.length < 2) return '';
  const werte = verlauf.map((v) => v.stand);
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const spanne = max - min || 1;
  const breite = 280;
  const hoehe = 60;
  return verlauf.map((v, i) => {
    const x = (i / (verlauf.length - 1)) * breite;
    const y = hoehe - ((v.stand - min) / spanne) * hoehe;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

let ausgeblendet = false;

export async function zeigeKontostandDetail(container, zustand) {
  const { finanzen } = zustand;
  const heuteStr = heute();
  const stand = gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heuteStr);
  const unecht = unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heuteStr);
  const verlauf = kontostandVerlauf(finanzen.konten, finanzen.expenses, finanzen.einnahmen, 30, heuteStr);
  const wert = warenwert(finanzen.teile);

  function zeichne() {
    const anzeige = ausgeblendet ? '••••••,•• €' : `${stand.toFixed(2)} €`;
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="kd-zurueck" type="button">‹ Home</button>
        <h2>Kontostand</h2>
      </div>
      <div class="stat-karte gross">
        <div class="stat-kopf">
          <small>Kontostand</small>
          <button id="kd-auge" type="button" style="background:none;border:none;padding:0;color:var(--gedaempft);">${ausgeblendet ? EYE_OFF_ICON : EYE_ICON}</button>
        </div>
        <span>${anzeige}</span>
        <svg width="280" height="60" viewBox="0 0 280 60" style="margin-top:8px;">
          <polyline points="${sparklinePunkte(verlauf)}" fill="none" stroke="var(--gedaempft)" stroke-width="2"/>
        </svg>
        <small>${unecht.toFixed(2)} € inkl. Warenwert</small>
        <small>Warenwert: ${wert.toFixed(2)} €</small>
      </div>`;
    container.querySelector('#kd-zurueck').addEventListener('click', () => { location.hash = '#/home'; });
    container.querySelector('#kd-auge').addEventListener('click', () => { ausgeblendet = !ausgeblendet; zeichne(); });
  }
  zeichne();
}
```

- [ ] **Schritt 2: `js/module/home/index.js` umstellen**

Die bestehende komplette Datei

```js
import { registriere } from '../../registry.js';
import { ladeAlles } from './daten.js';
import { gesamtKontostand, unechterGesamtKontostand, summeProMonat } from '../finanzen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';
import { sortiereSendungen, sortiereTermine } from '../sendungen/berechnung.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function abschnitt(titel, ziel, zeilenHtml) {
  return `
    <div class="section-head"><h2>${titel}</h2><a href="${ziel}" class="link-muted">Alle anzeigen</a></div>
    <div class="punkt-liste">${zeilenHtml || '<p class="lade">Nichts Offenes.</p>'}</div>`;
}

registriere({
  id: 'home',
  titel: 'Home',
  icon: HOME_ICON,
  async init(container) {
    await ladeZustand();
    const { finanzen, todos, sendungen } = zustand;
    const gesetzt = finanzen.konten.length > 0;
    const stand = gesetzt ? gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute()) : null;
    const unecht = gesetzt ? unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heute()) : null;
    const heuteDatum = new Date();
    const ausgabenMonat = summeProMonat(finanzen.expenses, heuteDatum.getFullYear(), heuteDatum.getMonth() + 1);

    const termineHtml = sortiereTermine(sendungen.termine).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
      .join('');
    const sendungenHtml = sortiereSendungen(sendungen.sendungen).filter((s) => s.status !== 'zugestellt').slice(0, 3)
      .map((s) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(s.haendler)}</strong><small>${esc(s.status)}</small></div></div>`)
      .join('');
    const todosHtml = sortiereOffeneTodos(todos.offen, heute()).slice(0, 3)
      .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
      .join('');

    container.innerHTML = `
      <header class="modul-kopf"><h2>Home</h2></header>
      <div class="stat-karte gross">
        <small>Kontostand</small>
        <span>${gesetzt ? stand.toFixed(2) + ' €' : '–'}</span>
        ${gesetzt ? `<small>${unecht.toFixed(2)} € inkl. Warenwert</small>` : ''}
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="icon-badge">${WALLET_ICON}</div>
          <div class="stat-lbl">Kontostand</div>
          <div class="stat-val">${gesetzt ? stand.toFixed(2) + ' €' : '–'}</div></div>
        <div class="stat"><div class="icon-badge">${BOX_ICON}</div>
          <div class="stat-lbl">Unecht</div>
          <div class="stat-val">${gesetzt ? unecht.toFixed(2) + ' €' : '–'}</div></div>
        <div class="stat"><div class="icon-badge rot">${AUSGABE_ICON}</div>
          <div class="stat-lbl">Ausgaben Monat</div>
          <div class="stat-val">${ausgabenMonat.toFixed(2)} €</div></div>
      </div>
      <section>${abschnitt('Nächste Termine', '#/sendungen/termine', termineHtml)}</section>
      <section>${abschnitt('Aktuelle Sendungen', '#/sendungen/pakete', sendungenHtml)}</section>
      <section>${abschnitt('Offene To-dos', '#/todos', todosHtml)}</section>`;
  },
});
```

komplett ersetzen durch:

```js
import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { gesamtKontostand, unechterGesamtKontostand, summeProMonat } from '../finanzen/berechnung.js';
import { sortiereOffeneTodos } from '../todos/planung.js';
import { sortiereSendungen, sortiereTermine } from '../sendungen/berechnung.js';

const HOME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>';
const WALLET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none"/></svg>';
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function heute() {
  return new Date().toISOString().slice(0, 10);
}

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function abschnitt(titel, ziel, zeilenHtml) {
  return `
    <div class="section-head"><h2>${titel}</h2><a href="${ziel}" class="link-muted">Alle anzeigen</a></div>
    <div class="punkt-liste">${zeilenHtml || '<p class="lade">Nichts Offenes.</p>'}</div>`;
}

function renderHome(container) {
  const { finanzen, todos, sendungen } = zustand;
  const gesetzt = finanzen.konten.length > 0;
  const stand = gesetzt ? gesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, heute()) : null;
  const unecht = gesetzt ? unechterGesamtKontostand(finanzen.konten, finanzen.expenses, finanzen.einnahmen, finanzen.teile, heute()) : null;
  const heuteDatum = new Date();
  const ausgabenMonat = summeProMonat(finanzen.expenses, heuteDatum.getFullYear(), heuteDatum.getMonth() + 1);

  const termineHtml = sortiereTermine(sendungen.termine).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.titel)}</strong><small>fällig ${t.faellig_am}</small></div></div>`)
    .join('');
  const sendungenHtml = sortiereSendungen(sendungen.sendungen).filter((s) => s.status !== 'zugestellt').slice(0, 3)
    .map((s) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(s.haendler)}</strong><small>${esc(s.status)}</small></div></div>`)
    .join('');
  const todosHtml = sortiereOffeneTodos(todos.offen, heute()).slice(0, 3)
    .map((t) => `<div class="punkt-zeile"><div class="punkt-info"><strong>${esc(t.text)}</strong></div></div>`)
    .join('');

  container.innerHTML = `
    <header class="modul-kopf"><h2>Home</h2></header>
    <div class="stat-karte gross" id="home-kontostand" style="cursor:pointer;">
      <small>Kontostand</small>
      <span>${gesetzt ? stand.toFixed(2) + ' €' : '–'}</span>
      ${gesetzt ? `<small>${unecht.toFixed(2)} € inkl. Warenwert</small>` : ''}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="icon-badge">${WALLET_ICON}</div>
        <div class="stat-lbl">Kontostand</div>
        <div class="stat-val">${gesetzt ? stand.toFixed(2) + ' €' : '–'}</div></div>
      <div class="stat"><div class="icon-badge">${BOX_ICON}</div>
        <div class="stat-lbl">Unecht</div>
        <div class="stat-val">${gesetzt ? unecht.toFixed(2) + ' €' : '–'}</div></div>
      <div class="stat"><div class="icon-badge rot">${AUSGABE_ICON}</div>
        <div class="stat-lbl">Ausgaben Monat</div>
        <div class="stat-val">${ausgabenMonat.toFixed(2)} €</div></div>
    </div>
    <section>${abschnitt('Nächste Termine', '#/sendungen/termine', termineHtml)}</section>
    <section>${abschnitt('Aktuelle Sendungen', '#/sendungen/pakete', sendungenHtml)}</section>
    <section>${abschnitt('Offene To-dos', '#/todos', todosHtml)}</section>`;

  if (gesetzt) {
    container.querySelector('#home-kontostand').addEventListener('click', () => {
      location.hash = '#/home/kontostand';
    });
  }
}

async function zeigeAktuelleAnsicht() {
  const { unterseite } = parseHash(location.hash);
  if (unterseite === 'kontostand') {
    const { zeigeKontostandDetail } = await import('./kontostand.js');
    containerRef.innerHTML = '';
    await zeigeKontostandDetail(containerRef, zustand);
  } else {
    renderHome(containerRef);
  }
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'home' && containerRef && containerRef.isConnected) zeigeAktuelleAnsicht();
}

registriere({
  id: 'home',
  titel: 'Home',
  icon: HOME_ICON,
  async init(container) {
    containerRef = container;
    await ladeZustand();
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuelleAnsicht();
  },
});
```

- [ ] **Schritt 3: Test & statische Prüfung**

Run: `npm test`
Expected: alle Tests weiterhin PASS (Ausgangs-Verhalten von `home/index.js`
ohne Hash-Unterseite ist unverändert — nur der Klick-Handler und der
Hashchange-Listener sind neu).

Run: `node --check js/module/home/kontostand.js && node --check js/module/home/index.js`
Expected: keine Syntaxfehler.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/home/kontostand.js js/module/home/index.js
git commit -m "feat: Kontostand-Detail-Screen von Home aus mit echter Sparkline"
```

---

### Task 9: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum des Implementierungstags), Was/Entscheidungen/
Stand-danach-Muster wie bei den vorherigen Etappen. Inhalt: die drei
neuen Tabs, der geteilte Zeitraum-Zustand, "Monat"/"Abos" entfallen
zugunsten von "Analyse"/"Regelmäßige Ausgaben", CSV-Export, der neue
Kontostand-Detail-Screen (inkl. der `#/home/kontostand`-Routing-
Entscheidung), die neue Tabelle `ausgaben_vorlagen` +
`expenses.vorlage_id`. **Wichtig laut Doku-Rigor-Regel:** die in den
Global Constraints dokumentierte Spec-Abweichung
(`legeAusgabenVorlageAn` ohne begleitende `expenses`-Zeile, anders als
ursprünglich in der Spec beschrieben) explizit festhalten, plus jeden
weiteren während der Umsetzung aufgetretenen Fehler/verworfenen Ansatz.
Unter "Offene Punkte": Sub-Etappe C (Detail-Klicks überall) als
Nächstes, ganzer Backlog A–Q weiterhin in `CLAUDE.md`.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand" aktualisieren: Sub-Etappe B als fertig
markieren, Sub-Etappe C als Nächstes. Abschnitt zum Finanzen-Modul (im
"Aufbau"-Teil) um die neue Tab-Reihenfolge, die drei neuen Dateien
(`uebersicht.js`, `transaktionen.js`, `analyse.js`), den ersetzten
`regelmaessige-ausgaben.js` (statt `abos.js`), das Entfallen von
`monat.js`, die neue Tabelle `ausgaben_vorlagen`, und den neuen
Kontostand-Detail-Screen (`home/kontostand.js`, Routing über
`#/home/kontostand`) ergänzen. `npm test`-Ausgabe tatsächlich ausführen
und die echte Testanzahl übernehmen.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe B (Finanzen-Redesign) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Vorbereitungs-Migration ausgeführt (`ausgaben_vorlagen` angelegt,
      `expenses.vorlage_id` ergänzt).
- [ ] Alle 9 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Übersicht zeigt echten Zeitraum-gefilterten Kontostand +
      Einnahmen/Ausgaben/Differenz, Zeitraum-Wechsel wirkt auch auf
      Transaktionen (geteilter Zustand tatsächlich verifiziert, nicht
      nur pro Tab isoliert getestet).
- [ ] Transaktionen: Suche + Kategorie-Chips funktionieren, CSV-Export
      lädt eine Datei mit den sichtbaren Einträgen herunter.
- [ ] Analyse zeigt beide Kategorien-Aufschlüsselungen, 6-Monats-Chart,
      Jahresübersicht mit Sparquote.
- [ ] Regelmäßige Ausgaben: "Als Vorlage übernehmen" aus einem erkannten
      Muster + "Bezahlt"-Bestätigung funktionieren und rücken korrekt vor.
- [ ] Kontostand-Detail-Screen von Home aus erreichbar (`#/home/kontostand`),
      zeigt echte Sparkline + Warenwert-Zeile, Augen-Icon blendet aus,
      "‹ Home" führt zurück.
- [ ] Keine Regression: Ausgaben/Einnahmen/Kontostand/Konten/Schulden/
      Teile/Bestellen-Tabs funktionieren unverändert; normale
      Home-Ansicht (ohne `#/home/kontostand`) unverändert.
- [ ] `docs/PROJEKT-LOG.md` (inkl. Fehlern/verworfener Ansätze) +
      `CLAUDE.md` aktualisiert, nach `main` gemergt, gepusht.
