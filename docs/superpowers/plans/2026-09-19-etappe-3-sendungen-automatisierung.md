# Etappe 3: Sendungen-Automatisierung (Dedup + Status-Historie) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die E-Mail-Automatisierung erkennt eine bestehende Sendung anhand
ihrer Trackingnummer wieder (statt bei jeder Status-Mail eine neue Zeile
anzulegen), führt eine echte Status-Historie, und extrahiert Abholcode/
-adresse/-zeiten, wo in der Mail vorhanden.

**Architecture:** Eine neue, reine Funktion `kategorisiereStatus()`
kategorisiert Freitext-Status deterministisch; der Klassifikator-Prompt
liefert mehr optionale Felder; `postfach-scan.mjs` sucht vor jedem Insert
nach einer bestehenden Sendung per Trackingnummer und aktualisiert statt
dupliziert; eine neue Tabelle `sendungen_ereignisse` sammelt die Historie.
Die bestehende Sendungen-Liste bekommt eine vierte Status-Kategorie
("abholbereit"), aber keinen neuen Screen (das ist Etappe 4).

**Tech Stack:** Vanilla JS/ESM, `node:test`, Supabase (Postgres + RLS),
IMAP (`imapflow`), `claude -p` als Klassifikator (unverändert).

**Spec:** `docs/superpowers/specs/2026-09-19-etappe-3-sendungen-automatisierung-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt.
- ESM überall, deutsche Texte/Commits.
- Keine erfundenen Daten: `statusText`/`ort`/`abholcode`/`abholadresse`/
  `abholzeiten` nur füllen, wenn wörtlich/eindeutig in der E-Mail
  vorhanden — sonst `null`.
- Dedup ausschließlich über Trackingnummer; Sendungen ohne Trackingnummer
  bleiben unverknüpft (dokumentierte Grenze, kein Bug).
- Status bewegt sich nur vorwärts (`unterwegs` < `abholbereit` <
  `zugestellt`), eine Mail ohne erkennbaren Status (`unbekannt`)
  überschreibt nie einen bekannten Status.
- Kein QR-/Barcode-Bild-Parsing aus E-Mails — nur Text-Extraktion.
- `automatisierung/postfach-scan.mjs` hat keine automatisierten Tests
  (bestehende Konvention, per Live-Lauf verifiziert) — diese Etappe fügt
  keine hinzu.

**Vorbereitung (vom Koordinator direkt ausgeführt, VOR Task 1 — keine
eigene Task, da reine DB-Aktion ohne Repo-Dateien):**

1. Neue Tabelle `sendungen_ereignisse` anlegen + RLS-Policy (SQL aus
   Spec Abschnitt 3.1, per Supabase-Tool `apply_migration`).
2. Drei neue Spalten auf `sendungen` (SQL aus Spec Abschnitt 3.2).
3. Bestehende 7 `sendungen`-Zeilen sichten, erkennbare Duplikate (gleiche
   Trackingnummer) zusammenfassen/löschen, Ergebnis im Projekt-Log
   dokumentieren (wie in Task 5 beschrieben).

---

### Task 1: Klassifikator erweitern (Status-Kategorisierung + Prompt)

**Files:**
- Modify: `automatisierung/klassifizieren.js`
- Test: `test/automatisierung-klassifizieren.test.js`

**Interfaces:**
- Produziert: `kategorisiereStatus(statusText: string|null|undefined):
  'unterwegs'|'abholbereit'|'zugestellt'|'unbekannt'` — wird von Task 4
  (`postfach-scan.mjs`) importiert und aufgerufen.
- `baustePrompt()` liefert ab jetzt für `sendung`/`amazon` zusätzlich die
  Felder `statusText`, `ort`, `abholcode`, `abholadresse`, `abholzeiten`
  (alle `string|null`) — Task 4 liest diese Felder vom Klassifikations-
  ergebnis.

- [ ] **Schritt 1: Fehlschlagenden Test für `kategorisiereStatus` schreiben**

Am Ende von `test/automatisierung-klassifizieren.test.js` ergänzen (Import-
Zeile oben erweitern):

```js
import { parseKlassifikation, kategorisiereStatus } from '../automatisierung/klassifizieren.js';
```

(ersetzt die bisherige Import-Zeile, die nur `parseKlassifikation`
importiert)

```js
test('kategorisiereStatus: erkennt zugestellt', () => {
  assert.equal(kategorisiereStatus('Ihre Sendung wurde zugestellt.'), 'zugestellt');
  assert.equal(kategorisiereStatus('Paket erfolgreich ausgeliefert'), 'zugestellt');
});

test('kategorisiereStatus: erkennt abholbereit', () => {
  assert.equal(kategorisiereStatus('Ihr Paket liegt zur Abholung bereit.'), 'abholbereit');
  assert.equal(kategorisiereStatus('in der Packstation hinterlegt und abholbereit'), 'abholbereit');
});

test('kategorisiereStatus: erkennt unterwegs', () => {
  assert.equal(kategorisiereStatus('Die Sendung ist unterwegs zu Ihnen.'), 'unterwegs');
  assert.equal(kategorisiereStatus('befindet sich im Sortierzentrum'), 'unterwegs');
});

test('kategorisiereStatus: kein Treffer oder leer -> unbekannt', () => {
  assert.equal(kategorisiereStatus('Vielen Dank für Ihre Bestellung.'), 'unbekannt');
  assert.equal(kategorisiereStatus(null), 'unbekannt');
  assert.equal(kategorisiereStatus(undefined), 'unbekannt');
});

test('baustePrompt: enthaelt die neuen optionalen Sendungsfelder', () => {
  const prompt = baustePrompt();
  for (const feld of ['statusText', 'ort', 'abholcode', 'abholadresse', 'abholzeiten']) {
    assert.ok(prompt.includes(feld), `Prompt sollte "${feld}" erwaehnen`);
  }
});
```

Die letzte Test-Datei-Import-Zeile muss auch `baustePrompt` importieren:

```js
import { parseKlassifikation, kategorisiereStatus, baustePrompt } from '../automatisierung/klassifizieren.js';
```

(diese Zeile ersetzt die vorherige aus Schritt 1 endgültig — nur eine
Import-Zeile am Dateianfang)

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `kategorisiereStatus` ist kein Export aus
`automatisierung/klassifizieren.js`, und `baustePrompt()` enthält die
neuen Feldnamen noch nicht.

- [ ] **Schritt 3: `kategorisiereStatus` implementieren**

In `automatisierung/klassifizieren.js`, direkt unter der
`ERLAUBTE_TYPEN`-Konstante einfügen:

```js
const STATUS_SCHLUESSELWOERTER = [
  { kategorie: 'zugestellt', muster: /zugestellt|geliefert|ausgeliefert|abgegeben/i },
  { kategorie: 'abholbereit', muster: /abholbereit|zur abholung|packstation.*bereit|paketshop.*hinterlegt|abholung möglich/i },
  { kategorie: 'unterwegs', muster: /unterwegs|zustellfahrzeug|sortierzentrum|im zielland|versandt|übergeben/i },
];

export function kategorisiereStatus(statusText) {
  if (!statusText) return 'unbekannt';
  for (const { kategorie, muster } of STATUS_SCHLUESSELWOERTER) {
    if (muster.test(statusText)) return kategorie;
  }
  return 'unbekannt';
}
```

- [ ] **Schritt 4: `baustePrompt()` erweitern**

Die bestehende Funktion

```js
export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon/Rechnung für einen Kauf
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin (z. B. Prüfungsanmeldung, Rechnungsfälligkeit)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.`;
}
```

ersetzen durch:

```js
export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon/Rechnung für einen Kauf
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin (z. B. Prüfungsanmeldung, Rechnungsfälligkeit)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.
Fülle "statusText"/"ort"/"abholcode"/"abholadresse"/"abholzeiten" NUR, wenn der Wert wörtlich oder eindeutig aus der E-Mail hervorgeht. Erfinde keine Werte - bei Unsicherheit null.`;
}
```

- [ ] **Schritt 5: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 6: Commit**

```bash
git add automatisierung/klassifizieren.js test/automatisierung-klassifizieren.test.js
git commit -m "feat: Klassifikator erkennt Sendungsstatus und extrahiert Abholdaten"
```

---

### Task 2: Sendungen-Berechnung um "abholbereit" erweitern

**Files:**
- Modify: `js/module/sendungen/berechnung.js`
- Test: `test/sendungen-berechnung.test.js`

**Interfaces:**
- Produziert: `STATUS_PRIORITAET` (jetzt **exportiert**, bisher intern) =
  `{ unterwegs: 0, abholbereit: 1, unbekannt: 2, zugestellt: 3 }` — wird
  von Task 4 (`postfach-scan.mjs`) importiert, um zu prüfen, ob ein neuer
  Status ein Fortschritt ist.
- `naechsterSendungStatus('abholbereit')` liefert jetzt `'zugestellt'`,
  `naechsterSendungStatus('unterwegs')` liefert jetzt `'abholbereit'`
  (bisher `'zugestellt'`).

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `test/sendungen-berechnung.test.js` das `sendungen`-Test-Array am
Dateianfang erweitern (ersetzt das bestehende Array):

```js
const sendungen = [
  { haendler: 'Hermes', status: 'zugestellt' },
  { haendler: 'DHL', status: 'unterwegs' },
  { haendler: 'Amazon', status: 'unbekannt' },
  { haendler: 'DPD', status: 'abholbereit' },
];
```

Den bestehenden Test `sortiereSendungen: unterwegs vor unbekannt vor
zugestellt` ersetzen durch:

```js
test('sortiereSendungen: unterwegs vor abholbereit vor unbekannt vor zugestellt', () => {
  assert.deepEqual(sortiereSendungen(sendungen).map((s) => s.haendler),
    ['DHL', 'DPD', 'Amazon', 'Hermes']);
});
```

Den bestehenden Test `offeneSendungen: zaehlt alles ausser zugestellt`
ersetzen durch:

```js
test('offeneSendungen: zaehlt alles ausser zugestellt', () => {
  assert.equal(offeneSendungen(sendungen), 3);
});
```

Den bestehenden Test `naechsterSendungStatus: ...` ersetzen durch:

```js
test('naechsterSendungStatus: zyklisch unterwegs -> abholbereit -> zugestellt -> unterwegs, unbekannt -> unterwegs', () => {
  assert.equal(naechsterSendungStatus('unterwegs'), 'abholbereit');
  assert.equal(naechsterSendungStatus('abholbereit'), 'zugestellt');
  assert.equal(naechsterSendungStatus('zugestellt'), 'unterwegs');
  assert.equal(naechsterSendungStatus('unbekannt'), 'unterwegs');
});
```

Neuen Test ergänzen (Import-Zeile am Dateianfang um `STATUS_PRIORITAET`
erweitern: `import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus, STATUS_PRIORITAET } from '../js/module/sendungen/berechnung.js';`):

```js
test('STATUS_PRIORITAET: unterwegs < abholbereit < unbekannt < zugestellt', () => {
  assert.ok(STATUS_PRIORITAET.unterwegs < STATUS_PRIORITAET.abholbereit);
  assert.ok(STATUS_PRIORITAET.abholbereit < STATUS_PRIORITAET.unbekannt);
  assert.ok(STATUS_PRIORITAET.unbekannt < STATUS_PRIORITAET.zugestellt);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `STATUS_PRIORITAET` ist kein Export, Sortier-/Zyklus-
Reihenfolge stimmt noch nicht.

- [ ] **Schritt 3: `berechnung.js` anpassen**

Die bestehenden Zeilen

```js
const STATUS_PRIORITAET = { unterwegs: 0, unbekannt: 1, zugestellt: 2 };
const STATUS_ZYKLUS = { unterwegs: 'zugestellt', zugestellt: 'unterwegs', unbekannt: 'unterwegs' };
```

ersetzen durch:

```js
export const STATUS_PRIORITAET = { unterwegs: 0, abholbereit: 1, unbekannt: 2, zugestellt: 3 };
const STATUS_ZYKLUS = { unterwegs: 'abholbereit', abholbereit: 'zugestellt', zugestellt: 'unterwegs', unbekannt: 'unterwegs' };
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/sendungen/berechnung.js test/sendungen-berechnung.test.js
git commit -m "feat: neue Status-Kategorie abholbereit in der Sendungen-Berechnung"
```

---

### Task 3: UI für "abholbereit" (CSS-Token + Status-Text)

**Files:**
- Modify: `app.css`
- Modify: `js/module/sendungen/pakete.js`

**Interfaces:**
- Konsumiert: nichts Neues aus vorherigen Tasks (reine Darstellung).
- Produziert: keine neuen Exporte — reine UI-Ergänzung.

- [ ] **Schritt 1: Neue Design-Tokens in `app.css` ergänzen**

In allen drei `:root`-Blöcken (Dunkel, Light-Media-Query,
`[data-theme="light"]`) die Zeile mit `--hm-rot-bg`/`--hm-gruen-bg`/
`--akzent-bg` um `--hm-gelb-bg` erweitern.

Im Dunkel-Block (`:root { ... }`, ganz oben in der Datei) die Zeile

```css
  --hm-rot-bg: #3D2020; --hm-gruen-bg: #183A28; --akzent-bg: #122A47;
```

ersetzen durch:

```css
  --hm-rot-bg: #3D2020; --hm-gruen-bg: #183A28; --akzent-bg: #122A47; --hm-gelb-bg: #3D2F0F;
```

Im `@media (prefers-color-scheme: light)`-Block UND im
`:root[data-theme="light"]`-Block (beide enthalten dieselbe Zeile,
zweimal ersetzen) die Zeile

```css
    --hm-rot-bg: #FBDAD8; --hm-gruen-bg: #DCF3E3; --akzent-bg: #DCEBFF;
```

ersetzen durch:

```css
    --hm-rot-bg: #FBDAD8; --hm-gruen-bg: #DCF3E3; --akzent-bg: #DCEBFF; --hm-gelb-bg: #FBF0D6;
```

(Achtung: im `:root[data-theme="light"]`-Block hat dieselbe Zeile keine
zusätzliche Einrückung wie im `@media`-Block — dort steht sie als
`  --hm-rot-bg: #FBDAD8; --hm-gruen-bg: #DCF3E3; --akzent-bg: #DCEBFF;`
mit zwei Leerzeichen Einrückung statt vier; beim Ersetzen auf die
jeweils korrekte Einrückung der Originalzeile achten.)

- [ ] **Schritt 2: `.status-abholbereit`-Regel ergänzen**

In der `/* Status-Pillen (Finanzen-Teile, Sendungen) */`-Sektion, nach
der Zeile `.status-bestellt { background: var(--akzent-bg); color: var(--akzent); }`
einfügen:

```css
.status-abholbereit { background: var(--hm-gelb-bg); color: var(--hm-gelb); }
```

- [ ] **Schritt 3: `pakete.js` `STATUS_TEXT` erweitern**

Die Zeile

```js
const STATUS_TEXT = { unterwegs: 'unterwegs', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
```

ersetzen durch:

```js
const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
```

- [ ] **Schritt 4: Verifizieren**

Run: `npm test`
Expected: weiterhin alle Tests grün (reine CSS-/Text-Änderung, keine
Logikänderung). `node --check js/module/sendungen/pakete.js` fehlerfrei.

- [ ] **Schritt 5: Commit**

```bash
git add app.css js/module/sendungen/pakete.js
git commit -m "feat: Optik fuer neue Status-Kategorie abholbereit ergaenzt"
```

---

### Task 4: Dedup + Status-Historie in der Postfach-Automatisierung

**Files:**
- Modify: `automatisierung/postfach-scan.mjs`

**Interfaces:**
- Konsumiert: `kategorisiereStatus` (Task 1, `automatisierung/klassifizieren.js`);
  `STATUS_PRIORITAET` (Task 2, `js/module/sendungen/berechnung.js`,
  jetzt exportiert).
- Produziert: keine neuen Exporte — dieses Skript wird nur ausgeführt,
  nicht importiert.

- [ ] **Schritt 1: Imports ergänzen**

Die bestehende Zeile

```js
import { baustePrompt, parseKlassifikation } from './klassifizieren.js';
```

ersetzen durch:

```js
import { baustePrompt, parseKlassifikation, kategorisiereStatus } from './klassifizieren.js';
import { STATUS_PRIORITAET } from '../js/module/sendungen/berechnung.js';
```

- [ ] **Schritt 2: Dedup-Hilfsfunktionen ergänzen**

Direkt vor der bestehenden `async function schreibeErgebnis(k) {`-Zeile
einfügen:

```js
async function findeBestehendeSendung(trackingnummer) {
  const { data, error } = await supabase.from('sendungen')
    .select('*').eq('user_id', DASHBOARD_USER_ID).eq('trackingnummer', trackingnummer)
    .maybeSingle();
  if (error) throw new Error(`Sendung suchen: ${error.message}`);
  return data;
}

async function aktualisiereSendung(bestehend, k, statusKategorie) {
  const aktualisierung = { letzte_aktualisierung: new Date().toISOString() };
  const neuePrio = STATUS_PRIORITAET[statusKategorie];
  const aktuellePrio = STATUS_PRIORITAET[bestehend.status] ?? STATUS_PRIORITAET.unbekannt;
  if (statusKategorie !== 'unbekannt' && neuePrio >= aktuellePrio) {
    aktualisierung.status = statusKategorie;
  }
  if (k.beschreibung) aktualisierung.beschreibung = k.beschreibung;
  if (k.abholcode) aktualisierung.abholcode = k.abholcode;
  if (k.abholadresse) aktualisierung.abholadresse = k.abholadresse;
  if (k.abholzeiten) aktualisierung.abholzeiten = k.abholzeiten;
  const { error } = await supabase.from('sendungen').update(aktualisierung).eq('id', bestehend.id);
  if (error) throw new Error(`Sendung aktualisieren: ${error.message}`);
}

async function legeEreignisAn(sendungId, k, statusKategorie) {
  const { error } = await supabase.from('sendungen_ereignisse').insert({
    user_id: DASHBOARD_USER_ID, sendung_id: sendungId,
    beschreibung: k.statusText || k.beschreibung || 'Status-Update',
    status_kategorie: statusKategorie, ort: k.ort || null,
  });
  if (error) throw new Error(`Sendungs-Ereignis anlegen: ${error.message}`);
}

async function schreibeSendung(k) {
  const statusKategorie = kategorisiereStatus(k.statusText);
  const haendler = k.typ === 'amazon' ? 'Amazon' : k.haendler;
  if (k.trackingnummer) {
    const bestehend = await findeBestehendeSendung(k.trackingnummer);
    if (bestehend) {
      await aktualisiereSendung(bestehend, k, statusKategorie);
      await legeEreignisAn(bestehend.id, k, statusKategorie);
      return;
    }
  }
  const { data, error } = await supabase.from('sendungen').insert({
    user_id: DASHBOARD_USER_ID, haendler,
    trackingnummer: k.trackingnummer || null,
    beschreibung: k.beschreibung || null,
    abholcode: k.abholcode || null,
    abholadresse: k.abholadresse || null,
    abholzeiten: k.abholzeiten || null,
    status: statusKategorie !== 'unbekannt' ? statusKategorie : 'unterwegs',
    quelle: 'email',
  }).select().single();
  if (error) throw new Error(`Sendung speichern: ${error.message}`);
  await legeEreignisAn(data.id, k, statusKategorie);
}
```

- [ ] **Schritt 3: `schreibeErgebnis` auf die neue Logik umstellen**

Der bestehende Block

```js
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    const { error } = await supabase.from('sendungen').insert({
      user_id: DASHBOARD_USER_ID,
      haendler: k.typ === 'amazon' ? 'Amazon' : k.haendler,
      trackingnummer: k.trackingnummer || null,
      beschreibung: k.beschreibung || null,
      quelle: 'email',
    });
    if (error) throw new Error(`Sendung speichern: ${error.message}`);
    return;
  }
```

ersetzen durch:

```js
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    await schreibeSendung(k);
    return;
  }
```

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check automatisierung/postfach-scan.mjs`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (dieses Skript hat keine
automatisierten Tests, siehe Global Constraints — die vorhandene Suite
ist von dieser Änderung nicht betroffen).

- [ ] **Schritt 5: Live-Verifikation dokumentieren**

Da `postfach-scan.mjs` nicht automatisiert testbar ist (echtes IMAP +
Supabase + `claude -p`), im Report/PROJEKT-LOG vermerken, dass die
eigentliche Verifikation erst beim nächsten regulären, automatischen
Lauf (täglich per Windows Scheduled Task) erfolgt — dort beobachten, ob
eine bekannte Sendung mit neuer Status-Mail aktualisiert statt dupliziert
wird. Kein manueller Testlauf mit echten GMX-Zugangsdaten in dieser
Task nötig.

- [ ] **Schritt 6: Commit**

```bash
git add automatisierung/postfach-scan.mjs
git commit -m "feat: Sendungen-Dedup per Trackingnummer + Status-Historie in der Postfach-Automatisierung"
```

---

### Task 5: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` – neuen Abschnitt oben einfügen**

Neuer Abschnitt (Datum des Implementierungstags) nach dem etablierten
Was/Warum/Entscheidungen/Stand-danach-Muster. Inhalt: Dedup-Fix behoben
(seit Etappe 6 geparkter Bug), neue Tabelle `sendungen_ereignisse`, neue
Felder auf `sendungen` (`abholcode`/`abholadresse`/`abholzeiten`), neue
Status-Kategorie `abholbereit`, und das Ergebnis der einmaligen
Aufräum-Aktion der 7 Bestandszeilen (wie viele vorher/nachher, welche
Duplikate zusammengeführt wurden — konkrete Zahlen aus der
Vorbereitungs-Aktion vor Task 1 einsetzen). Unter "Offene Punkte":
weiterhin Etappe 4 (Detail-Ansichten, konsumiert diese neuen Daten).

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt zum Sendungen-Modul/zur Automatisierung um die neue Tabelle
`sendungen_ereignisse`, die neuen `sendungen`-Spalten, und die vier
Status-Kategorien (`unterwegs`/`abholbereit`/`zugestellt`/`unbekannt`)
ergänzen. Testanzahl/`npm test`-Ausgabe aktualisieren (`npm test`
tatsächlich ausführen, echte Zahl übernehmen).

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Etappe 3 (Sendungen-Dedup + Status-Historie) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Alle 5 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] `kategorisiereStatus()` implementiert und getestet.
- [ ] `STATUS_PRIORITAET`/`STATUS_ZYKLUS` unterstützen `abholbereit`,
      exportiert für die Automatisierung.
- [ ] `postfach-scan.mjs` aktualisiert bestehende Sendungen statt sie zu
      duplizieren, legt Status-Historie in `sendungen_ereignisse` an.
- [ ] Neue Status-Kategorie `abholbereit` sichtbar in der Sendungen-Liste
      (Status-Pille + Zyklus-Klick).
- [ ] Bestehende 7 Zeilen einmalig aufgeräumt, im Projekt-Log
      dokumentiert.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktuell, gepusht.
