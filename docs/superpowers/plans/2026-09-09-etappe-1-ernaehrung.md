# Etappe 1 – Modul Ernährung: Implementierungsplan

> **Für agentische Worker:** ERFORDERLICHER SUB-SKILL:
> `superpowers:subagent-driven-development` (empfohlen) oder
> `superpowers:executing-plans`, um diesen Plan Aufgabe für Aufgabe umzusetzen.
> Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Nachverfolgen.

**Goal:** Mark hakt täglich seine Ernährungs- und Supplement-Punkte ab, trägt
sein Gewicht ein und sieht vier Statistiken (Streak, Quote pro Punkt,
Kalender-Heatmap, Ziel-Prognose); Claude kann per Supabase-MCP Tageseinträge
setzen, die im Dashboard erscheinen.

**Architecture:** Statische Web-App ohne Build. Neues Modul als Ordner
`js/module/ernaehrung/` mit dünnen Supabase-Wrappern (`daten.js`) und reiner,
mit `node:test` geprüfter Rechenlogik (`zeitplan.js`, `berechnung.js`). Die
Ansichten (Heute, Liste, Gewicht, Statistik, Infos) rendern aus einem einmal
geladenen Zustand. Statistik wird im Browser berechnet, nicht in Postgres.

**Tech Stack:** HTML5, CSS, ES-Module (Browser-nativ), `@supabase/supabase-js`
2.116.0 (jsDelivr-ESM), `chart.js` 4.x (jsDelivr-ESM, `/auto`), `node:test`,
Supabase (Postgres 17) mit RLS.

**Spec:** `docs/superpowers/specs/2026-09-09-etappe-1-ernaehrung-design.md`

## Global Constraints

- **Kein Build-Schritt, kein Bundler.** Nur Dateien, die der Browser direkt lädt.
- **Kein npm-Dependency im Auslieferungscode.** `package.json` nur für
  `"test": "node --test"`, keine `dependencies`/`devDependencies`.
- **Externe Libs nur per CDN mit fester Version:** `@supabase/supabase-js@2.116.0`,
  `chart.js@<exakte 4.x-Version>`. Kein `@latest`.
- **Anon-/Publishable-Key darf im Quelltext stehen.** Service-Role-Key /
  Secrets niemals.
- **Alle Supabase-Tabellen** haben `user_id uuid not null default auth.uid()`
  mit RLS-Policy für `authenticated`, alle Operationen,
  `using (user_id = auth.uid()) with check (user_id = auth.uid())`.
- **MCP-Inserts mit Admin-Rechten:** `user_id` in jedem Insert **explizit** auf
  `df0b24a6-6a74-4830-995c-84015161dcc3` setzen (Marks Auth-UID, steht in
  `CLAUDE.md`).
- **Sprache:** UI-Texte, Kommentare, Commits, Doku auf Deutsch.
- **Zielbrowser:** aktuelles Safari (iOS) + Desktop-Chrome/Firefox. Kein
  Offline-Betrieb.
- **Deploy-URL:** `https://mkunau-ctrl.github.io/mein-dashboard/`
  (Push auf `main` → GitHub Pages baut automatisch).
- **Wochentage:** überall 1=Montag … 7=Sonntag. `Date.getDay()` liefert
  0=Sonntag … 6=Samstag – **immer umrechnen** mit
  `((d.getDay() + 6) % 7) + 1`.
- **Datum als `YYYY-MM-DD`-String** an den Schnittstellen von `zeitplan.js` und
  `berechnung.js` (nicht `Date`-Objekte) – vermeidet Zeitzonen-Überraschungen.
  Hilfsfunktion dafür lebt in `berechnung.js` und wird exportiert.
- Commits klein und häufig, deutsche Commit-Nachrichten. Am Ende jeder
  Commit-Nachricht:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XEtR5To4ojB4JK2YPQiKmy
  ```

---

## Dateistruktur nach Etappe 1

| Datei | Verantwortung |
|---|---|
| `js/module/ernaehrung/index.js` | Registriert das Modul (`id:'ernaehrung'`, `titel:'Ernährung'`), baut Tab-Leiste, Unter-Routing, `renderKachel`, `init(container)`. |
| `js/module/ernaehrung/daten.js` | Dünne Supabase-Wrapper. Einzige Datei mit Netz-Zugriff. |
| `js/module/ernaehrung/zeitplan.js` | Reine Funktion `istFaellig(item, datumStr, kontext)` + `wochentagVon(datumStr)`. |
| `js/module/ernaehrung/berechnung.js` | Reine Funktionen: `heute()`, `tageImZeitraum()`, `letzteErledigungVor()`, `tagesStatus()`, `streak()`, `quoteProPunkt()`, `prognose()`, `heatmapDaten()`. |
| `js/module/ernaehrung/heute.js` | Heute-Ansicht + Fortschrittsring. |
| `js/module/ernaehrung/liste.js` | „Liste bearbeiten": anlegen/umbenennen/Zeitplan/sortieren/deaktivieren. |
| `js/module/ernaehrung/gewicht.js` | Gewicht eintragen, Chart.js-Kurve, Ziel-Linie, BMI, Körpergröße-Feld. |
| `js/module/ernaehrung/statistik.js` | Streak-Karten, Quote-Balken, CSS-Heatmap, Prognose-Text. |
| `js/module/ernaehrung/infos.js` | `settings.infos_markdown` nur lesen (Mini-Markdown → HTML). |
| `js/router.js` | *(geändert)* `parseHash` liefert zusätzlich `unterseite`. |
| `js/app.js` | *(geändert)* Detail-Routing: Modul öffnen/schließen. |
| `index.html` | *(geändert)* Chart.js-CDN, Container `#modul-detail`. |
| `app.css` | *(geändert)* Stile für Tabs, Heute-Liste, Ring, Balken, Heatmap. |
| `js/module/README.md` | *(geändert)* Ordner-Konvention `module/<name>/index.js`. |
| `test/router.test.js` | *(geändert)* Tests für `unterseite`. |
| `test/ernaehrung-zeitplan.test.js` | Tests für `zeitplan.js`. |
| `test/ernaehrung-berechnung.test.js` | Tests für `berechnung.js`. |
| Supabase | Migration `etappe1_ernaehrung` (4 Tabellen + RLS), Seed-Daten. |

**Modul-Zustand (in `index.js` gehalten, an Views übergeben):**
```
zustand = {
  items:    [ { id, label, kategorie, typ, zielwert, einheit,
                plan_typ, plan_wochentage, plan_intervall_tage,
                pflicht, sortierung, aktiv, erstellt_am } ],
  logs:     [ { datum, item_id, erledigt, wert } ],   // 'YYYY-MM-DD'
  gewicht:  [ { datum, gewicht_kg } ],
  settings: { koerpergroesse_cm?, zielgewicht_kg?, infos_markdown? },
}
```

---

## Task 1: Supabase-Schema anlegen (4 Tabellen + RLS)

**Files:**
- Supabase-Migration `etappe1_ernaehrung` (über MCP `apply_migration`).
- Keine Repo-Datei.

**Interfaces:**
- Produces: Tabellen `checklist_items`, `daily_log`, `weight_log`, `settings`
  im Schema `public`, jeweils mit RLS. Spalten exakt wie unten – `daten.js`
  (Task 9) und der Seed (Task 2) verlassen sich darauf.

- [ ] **Schritt 1: Bestehende Tabellen prüfen**

MCP `list_tables` (project_id `vogztxoaqbnuciboughd`, schemas `["public"]`).
Erwartet: leer (noch keine Tabellen). Falls doch welche da sind: STOP, mit Mark
klären.

- [ ] **Schritt 2: Migration anwenden**

MCP `apply_migration`, project_id `vogztxoaqbnuciboughd`, name
`etappe1_ernaehrung`, query:

```sql
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  label text not null,
  kategorie text not null default 'ernaehrung'
    check (kategorie in ('ernaehrung','supplement')),
  typ text not null default 'haken'
    check (typ in ('haken','zaehler')),
  zielwert numeric,
  einheit text,
  plan_typ text not null default 'taeglich'
    check (plan_typ in ('taeglich','wochentage','intervall')),
  plan_wochentage int[],
  plan_intervall_tage int,
  pflicht boolean not null default true,
  sortierung int not null default 0,
  aktiv boolean not null default true,
  erstellt_am timestamptz not null default now()
);

create table public.daily_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  datum date not null,
  item_id uuid not null references public.checklist_items(id) on delete cascade,
  erledigt boolean not null default false,
  wert numeric,
  aktualisiert_am timestamptz not null default now(),
  unique (user_id, datum, item_id)
);

create table public.weight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  datum date not null,
  gewicht_kg numeric not null,
  unique (user_id, datum)
);

create table public.settings (
  user_id uuid not null default auth.uid(),
  key text not null,
  value jsonb not null,
  primary key (user_id, key)
);

alter table public.checklist_items enable row level security;
alter table public.daily_log      enable row level security;
alter table public.weight_log     enable row level security;
alter table public.settings       enable row level security;

create policy "eigene_zeilen" on public.checklist_items
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene_zeilen" on public.daily_log
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene_zeilen" on public.weight_log
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "eigene_zeilen" on public.settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create index daily_log_such_idx  on public.daily_log (user_id, datum);
create index daily_log_item_idx  on public.daily_log (item_id);
create index weight_log_such_idx on public.weight_log (user_id, datum);
```

Falls der MCP-Aufruf vom Classifier blockiert wird: Mark führt das SQL im
Supabase-Dashboard unter **SQL Editor** aus (Text 1:1 weitergeben) und meldet
sich zurück.

- [ ] **Schritt 3: Ergebnis prüfen**

MCP `list_tables` (schemas `["public"]`, verbose `true`). Erwartet: 4 Tabellen,
RLS aktiv, Spalten wie oben.
Zusätzlich MCP `get_advisors` (type `security`) – erwartet keine neuen
kritischen Findings zu diesen Tabellen (RLS ist an).

**Deliverable:** 4 Tabellen mit RLS in Supabase. Kein Commit (keine Repo-Datei).

---

## Task 2: Startdaten seeden

**Files:**
- Supabase-Daten über MCP `execute_sql`.
- Keine Repo-Datei.

**Interfaces:**
- Consumes: Tabellen aus Task 1.
- Produces: 14 `checklist_items`, 1 `weight_log`-Zeile, 3 `settings`-Zeilen –
  alle mit `user_id = 'df0b24a6-6a74-4830-995c-84015161dcc3'`.

- [ ] **Schritt 1: Checklisten-Punkte einfügen**

MCP `execute_sql`, project_id `vogztxoaqbnuciboughd`:

```sql
insert into public.checklist_items
  (user_id, label, kategorie, plan_typ, plan_wochentage, plan_intervall_tage, sortierung)
values
  ('df0b24a6-6a74-4830-995c-84015161dcc3','2 Brötchen (Sauerteig)','ernaehrung','taeglich',null,null,10),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','4 Eier','ernaehrung','taeglich',null,null,20),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','1 Banane','ernaehrung','taeglich',null,null,30),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','1 Glas Milch','ernaehrung','taeglich',null,null,40),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','350 g Sauerteigbrot gesamt','ernaehrung','taeglich',null,null,50),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','1 Handvoll geröstete Kürbiskerne','ernaehrung','taeglich',null,null,60),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','1–2 Paranüsse','ernaehrung','taeglich',null,null,70),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','Jodiertes Meersalz beim Kochen','ernaehrung','taeglich',null,null,80),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','100 g Fleisch','ernaehrung','wochentage','{1,2,3,4,5,6}',null,90),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','Leber 25 g','ernaehrung','wochentage','{1,4}',null,100),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','NORSAN Omega-3 Total 4 ml','supplement','taeglich',null,null,110),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','Magnesiumbisglycinat 2 Kapseln','supplement','taeglich',null,null,120),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','Vitamin C gepuffert 2 Kapseln','supplement','taeglich',null,null,130),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','Vitamin D3/K2 + Omega-3 Kombi (1 Kps)','supplement','intervall',null,5,140);
```

- [ ] **Schritt 2: Gewicht + Einstellungen einfügen**

```sql
insert into public.weight_log (user_id, datum, gewicht_kg)
values ('df0b24a6-6a74-4830-995c-84015161dcc3', current_date, 71);

insert into public.settings (user_id, key, value) values
  ('df0b24a6-6a74-4830-995c-84015161dcc3','koerpergroesse_cm','179'::jsonb),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','zielgewicht_kg','77'::jsonb),
  ('df0b24a6-6a74-4830-995c-84015161dcc3','infos_markdown', to_jsonb($$## Wichtigster offener Punkt

**Bluttest** (Vitamin D, Magnesium, ggf. Ferritin/B12) noch nicht gemacht.
Kosten ca. 30–80 € beim Hausarzt (IGeL-Leistung, vorher Kostenvoranschlag
verlangen, nüchtern hingehen, vorher keine Supplemente nehmen). Erst danach
lässt sich beurteilen, ob Magnesium wirklich nötig ist.

## Bezugsquellen

- NORSAN Omega-3 Total Öl: https://norsan.de/shop/omega-3-total-oel/
- Vitamin D3/K2 + Omega-3 Kombi (natural elements): https://naturalelements.de/products/vitamin-d3-k2-omega-3-kapseln
- Magnesiumbisglycinat (gloryfeel): https://www.gloryfeel.de/products/magnesiumbisglycinat-kapseln
- Vitamin C gepuffert (vit4ever, Amazon): https://www.amazon.de/dp/B0B71HSGVZ

## Hauptgerichte-Rotation (2 Tage am Stück, dann Wechsel)

Gulasch · Lasagne · Pizza · Burger · Kartoffelgratin · Reis/Nudeln mit Ei

## Wichtige Erkenntnisse aus der Recherche

- Leber täglich = zu viel Vitamin A (~5× Tagesbedarf) – auf 1–2×/Woche reduziert.
- Phytinsäure in Vollkorn/Nüssen senkt Magnesium-Aufnahme (32,5 % → 13 %).
  Sauerteig-Fermentation baut Phytinsäure ab.
- Aufgenommenes Magnesium aus der Ernährung (phytinsäurebereinigt): ca.
  240–250 mg/Tag – nah am Bedarf, Kapseln sind Sicherheitspuffer.
- Bei Omega-3/D3K2 zählt der Preis pro mg Wirkstoff. NORSAN ist die einzige
  Marke im Vergleich mit unabhängiger IFOS-Zertifizierung (SGS Nutrasource).
- Vitamin C bis 1.000 mg/Tag laut EFSA unbedenklich (BfR-Richtwert 250 mg –
  kein Sicherheits-Widerspruch, nur andere Vorsicht).
- Nutravita Omega-3 als „nicht geeignet unter 18 Jahren" gekennzeichnet –
  deshalb nicht gewählt.
$$));
```

*(PostgreSQL akzeptiert `$$…$$` als String-Literal – kein Escaping der
Apostrophe/Links nötig. `to_jsonb(text)` erzeugt einen JSON-String.)*

Falls MCP blockiert: Mark führt beide Blöcke im SQL Editor aus.

- [ ] **Schritt 3: Prüfen**

```sql
select kategorie, count(*) from public.checklist_items group by kategorie;
select key, jsonb_typeof(value) from public.settings order by key;
select datum, gewicht_kg from public.weight_log;
```
Erwartet: `ernaehrung` = 10, `supplement` = 4; 3 Settings (`string`,`number`
je nachdem – `koerpergroesse_cm`/`zielgewicht_kg` sind `number`,
`infos_markdown` ist `string`); 1 Gewichtszeile mit 71.

**Deliverable:** Startdaten in Supabase. Kein Commit.

---

## Task 3: Router um `unterseite` erweitern

**Files:**
- Modify: `js/router.js`
- Modify: `test/router.test.js`

**Interfaces:**
- Produces: `parseHash(hash) => { modul: string | null, unterseite: string | null }`.
  Konsumiert von `js/app.js` (Task 10) und `js/module/ernaehrung/index.js`
  (Task 10).

- [ ] **Schritt 1: Tests erweitern**

`test/router.test.js` komplett ersetzen:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/router.js';

test('leerer Hash -> nichts', () => {
  assert.deepEqual(parseHash(''), { modul: null, unterseite: null });
  assert.deepEqual(parseHash('#/'), { modul: null, unterseite: null });
});

test('Modul ohne Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung'), { modul: 'ernaehrung', unterseite: null });
});

test('Modul mit Unterseite', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik'),
    { modul: 'ernaehrung', unterseite: 'statistik' });
});

test('unbekannte Formen -> nichts', () => {
  assert.deepEqual(parseHash('#quatsch'), { modul: null, unterseite: null });
});

test('dritte Ebene wird ignoriert', () => {
  assert.deepEqual(parseHash('#/ernaehrung/statistik/extra'),
    { modul: 'ernaehrung', unterseite: 'statistik' });
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL (die neuen `unterseite`-Erwartungen).

- [ ] **Schritt 3: `js/router.js` umschreiben**

```js
// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung'            -> { modul: 'ernaehrung', unterseite: null }
// '#/ernaehrung/statistik'  -> { modul: 'ernaehrung', unterseite: 'statistik' }
// alles andere              -> { modul: null, unterseite: null }
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)(?:\/([a-z-]+))?/.exec(hash || '');
  return { modul: m ? m[1] : null, unterseite: m && m[2] ? m[2] : null };
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS (alle Suiten, inkl. der aus Etappe 0).

- [ ] **Schritt 5: Commit**

```bash
git add js/router.js test/router.test.js
git commit -m "feat: Router erkennt Modul-Unterseiten (#/modul/unterseite)"
```

**Deliverable:** `parseHash` liefert `unterseite`, alle Tests grün.

---

## Task 4: `zeitplan.js` – Fälligkeits-Logik

**Files:**
- Create: `js/module/ernaehrung/zeitplan.js`
- Create: `test/ernaehrung-zeitplan.test.js`

**Interfaces:**
- Produces:
  - `wochentagVon(datumStr: 'YYYY-MM-DD') => 1..7` (1=Mo … 7=So)
  - `istFaellig(item, datumStr, kontext?) => boolean`
    - `item`: Objekt mit `plan_typ`, `plan_wochentage`, `plan_intervall_tage`,
      `erstellt_am`
    - `kontext`: `{ letzteErledigung: 'YYYY-MM-DD' | null }` – nur für
      `plan_typ === 'intervall'` relevant, sonst ignoriert
- Konsumiert von `berechnung.js` (Task 5–8) und `heute.js` (Task 11).

- [ ] **Schritt 1: Failing test schreiben**

`test/ernaehrung-zeitplan.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wochentagVon, istFaellig } from '../js/module/ernaehrung/zeitplan.js';

const basis = { erstellt_am: '2026-01-01T00:00:00Z' };

test('wochentagVon: Mo=1 .. So=7', () => {
  assert.equal(wochentagVon('2026-09-07'), 1); // Montag
  assert.equal(wochentagVon('2026-09-13'), 7); // Sonntag
});

test('taeglich ist immer fällig', () => {
  assert.equal(istFaellig({ ...basis, plan_typ: 'taeglich' }, '2026-09-09'), true);
});

test('wochentage: nur an gelisteten Tagen', () => {
  const leber = { ...basis, plan_typ: 'wochentage', plan_wochentage: [1, 4] };
  assert.equal(istFaellig(leber, '2026-09-07'), true);  // Mo
  assert.equal(istFaellig(leber, '2026-09-10'), true);  // Do
  assert.equal(istFaellig(leber, '2026-09-08'), false); // Di
});

test('intervall: nie erledigt -> fällig', () => {
  const d3 = { ...basis, plan_typ: 'intervall', plan_intervall_tage: 5 };
  assert.equal(istFaellig(d3, '2026-09-09', { letzteErledigung: null }), true);
});

test('intervall: vor Ablauf nicht fällig, ab Tag N wieder fällig', () => {
  const d3 = { ...basis, plan_typ: 'intervall', plan_intervall_tage: 5 };
  assert.equal(istFaellig(d3, '2026-09-13', { letzteErledigung: '2026-09-10' }), false); // 3 Tage
  assert.equal(istFaellig(d3, '2026-09-15', { letzteErledigung: '2026-09-10' }), true);  // 5 Tage
  assert.equal(istFaellig(d3, '2026-09-20', { letzteErledigung: '2026-09-10' }), true);  // überfällig
});

test('vor erstellt_am nie fällig', () => {
  const neu = { erstellt_am: '2026-09-09T12:00:00Z', plan_typ: 'taeglich' };
  assert.equal(istFaellig(neu, '2026-09-08'), false);
  assert.equal(istFaellig(neu, '2026-09-09'), true);
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL – `Cannot find module '.../zeitplan.js'`.

- [ ] **Schritt 3: `zeitplan.js` implementieren**

```js
// Reine Fälligkeits-Logik für Checklisten-Punkte. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

const TAG_MS = 86_400_000;

// 'YYYY-MM-DD' -> UTC-Mitternacht als Millisekunden
function tagMs(datumStr) {
  return Date.parse(datumStr.slice(0, 10) + 'T00:00:00Z');
}

// 1 = Montag ... 7 = Sonntag
export function wochentagVon(datumStr) {
  const d = new Date(tagMs(datumStr));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

export function istFaellig(item, datumStr, kontext = {}) {
  if (tagMs(datumStr) < tagMs(item.erstellt_am)) return false;

  if (item.plan_typ === 'taeglich') return true;

  if (item.plan_typ === 'wochentage') {
    const liste = item.plan_wochentage || [];
    return liste.includes(wochentagVon(datumStr));
  }

  if (item.plan_typ === 'intervall') {
    const letzte = kontext.letzteErledigung;
    if (!letzte) return true;
    const abstandTage = Math.round((tagMs(datumStr) - tagMs(letzte)) / TAG_MS);
    return abstandTage >= item.plan_intervall_tage;
  }

  return false;
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/zeitplan.js test/ernaehrung-zeitplan.test.js
git commit -m "feat: zeitplan.istFaellig (taeglich/wochentage/intervall)"
```

**Deliverable:** `istFaellig` + `wochentagVon` fertig und getestet.

---

## Task 5: `berechnung.js` – Grundlagen + `tagesStatus`

**Files:**
- Create: `js/module/ernaehrung/berechnung.js`
- Create: `test/ernaehrung-berechnung.test.js`

**Interfaces:**
- Consumes: `istFaellig` aus `zeitplan.js`.
- Produces (in diesem Task):
  - `heute() => 'YYYY-MM-DD'` (lokales Datum)
  - `tageImZeitraum(vonStr, bisStr) => ['YYYY-MM-DD', ...]` (inkl. beider Enden)
  - `letzteErledigungVor(itemId, datumStr, logs) => 'YYYY-MM-DD' | null`
  - `tagesStatus(datumStr, items, logs) => 'keine' | 'erfuellt' | 'teilweise' | 'offen'`
- `items`: aktive `checklist_items`-Objekte. `logs`: `{ datum, item_id, erledigt }`.

- [ ] **Schritt 1: Failing test schreiben**

`test/ernaehrung-berechnung.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tageImZeitraum, letzteErledigungVor, tagesStatus,
} from '../js/module/ernaehrung/berechnung.js';

const item = (o) => ({
  id: o.id, label: o.id, kategorie: 'ernaehrung', pflicht: o.pflicht ?? true,
  aktiv: true, plan_typ: o.plan_typ ?? 'taeglich',
  plan_wochentage: o.plan_wochentage ?? null,
  plan_intervall_tage: o.plan_intervall_tage ?? null,
  erstellt_am: o.erstellt_am ?? '2026-01-01T00:00:00Z',
});
const log = (datum, item_id, erledigt = true) => ({ datum, item_id, erledigt });

test('tageImZeitraum inkl. Enden', () => {
  assert.deepEqual(tageImZeitraum('2026-09-08', '2026-09-10'),
    ['2026-09-08', '2026-09-09', '2026-09-10']);
});

test('letzteErledigungVor findet das jüngste erledigte Datum davor', () => {
  const logs = [log('2026-09-01', 'a'), log('2026-09-05', 'a'),
                log('2026-09-07', 'a', false), log('2026-09-09', 'a')];
  assert.equal(letzteErledigungVor('a', '2026-09-09', logs), '2026-09-05');
  assert.equal(letzteErledigungVor('a', '2026-09-02', logs), '2026-09-01');
  assert.equal(letzteErledigungVor('a', '2026-08-01', logs), null);
});

test('tagesStatus: keine fälligen Pflicht-Punkte -> keine', () => {
  const items = [item({ id: 'x', plan_typ: 'wochentage', plan_wochentage: [1] })];
  assert.equal(tagesStatus('2026-09-08', items, []), 'keine'); // Di
});

test('tagesStatus: alle erledigt -> erfuellt', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' })];
  const logs = [log('2026-09-09', 'a'), log('2026-09-09', 'b')];
  assert.equal(tagesStatus('2026-09-09', items, logs), 'erfuellt');
});

test('tagesStatus: teils erledigt -> teilweise; nichts -> offen', () => {
  const items = [item({ id: 'a' }), item({ id: 'b' })];
  assert.equal(tagesStatus('2026-09-09', items, [log('2026-09-09', 'a')]), 'teilweise');
  assert.equal(tagesStatus('2026-09-09', items, []), 'offen');
});

test('tagesStatus ignoriert Nicht-Pflicht-Punkte', () => {
  const items = [item({ id: 'a' }), item({ id: 'b', pflicht: false })];
  assert.equal(tagesStatus('2026-09-09', items, [log('2026-09-09', 'a')]), 'erfuellt');
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL – Modul fehlt.

- [ ] **Schritt 3: `berechnung.js` anlegen**

```js
// Reine Statistik-Rechnung fürs Ernährungsmodul. Kein Netz, keine DOM.
// Datum überall als 'YYYY-MM-DD'.
import { istFaellig } from './zeitplan.js';

const TAG_MS = 86_400_000;
const tagMs = (s) => Date.parse(s.slice(0, 10) + 'T00:00:00Z');
const alsStr = (ms) => new Date(ms).toISOString().slice(0, 10);

export function heute() {
  const j = new Date();
  return `${j.getFullYear()}-${String(j.getMonth() + 1).padStart(2, '0')}-${String(j.getDate()).padStart(2, '0')}`;
}

export function tageImZeitraum(vonStr, bisStr) {
  const tage = [];
  for (let ms = tagMs(vonStr); ms <= tagMs(bisStr); ms += TAG_MS) tage.push(alsStr(ms));
  return tage;
}

export function letzteErledigungVor(itemId, datumStr, logs) {
  let treffer = null;
  for (const l of logs) {
    if (l.item_id === itemId && l.erledigt && l.datum < datumStr) {
      if (!treffer || l.datum > treffer) treffer = l.datum;
    }
  }
  return treffer;
}

// Alle an datumStr fälligen, aktiven Pflicht-Punkte.
function faelligePflicht(datumStr, items, logs) {
  return items.filter((it) => {
    if (!it.aktiv || !it.pflicht) return false;
    const kontext = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigungVor(it.id, datumStr, logs) }
      : {};
    return istFaellig(it, datumStr, kontext);
  });
}

function istErledigt(datumStr, itemId, logs) {
  return logs.some((l) => l.datum === datumStr && l.item_id === itemId && l.erledigt);
}

export function tagesStatus(datumStr, items, logs) {
  const faellig = faelligePflicht(datumStr, items, logs);
  if (faellig.length === 0) return 'keine';
  const erledigt = faellig.filter((it) => istErledigt(datumStr, it.id, logs)).length;
  if (erledigt === faellig.length) return 'erfuellt';
  if (erledigt === 0) return 'offen';
  return 'teilweise';
}

// wird von Task 6-8 erweitert
export { faelligePflicht, istErledigt };
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/berechnung.js test/ernaehrung-berechnung.test.js
git commit -m "feat: berechnung – tagesStatus + Datums-Helfer"
```

**Deliverable:** `tagesStatus` + Helfer fertig und getestet.

---

## Task 6: `berechnung.js` – `streak`

**Files:**
- Modify: `js/module/ernaehrung/berechnung.js`
- Modify: `test/ernaehrung-berechnung.test.js`

**Interfaces:**
- Consumes: `tagesStatus`, `tageImZeitraum` (Task 5).
- Produces: `streak(items, logs, heuteStr) => { aktuell: number, laengste: number }`.
  Bewertet Tage von der ersten `erstellt_am`-Datumsangabe bis **gestern**
  (heuteStr exklusiv). `keine`-Tage unterbrechen nicht und zählen nicht.
  `aktuell` = Serie, die auf „gestern" endet.

- [ ] **Schritt 1: Failing test ergänzen**

In `test/ernaehrung-berechnung.test.js` anhängen:

```js
import { streak } from '../js/module/ernaehrung/berechnung.js';

test('streak: aktuelle und längste Serie', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const tage = ['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05','2026-09-06'];
  // erledigt an 1,2, Lücke 3, erledigt 4,5,6
  const logs = ['2026-09-01','2026-09-02','2026-09-04','2026-09-05','2026-09-06']
    .map((d) => log(d, 'a'));
  const r = streak(items, logs, '2026-09-07'); // bewertet bis 06.
  assert.equal(r.aktuell, 3);   // 4,5,6
  assert.equal(r.laengste, 3);
});

test('streak: gebrochen wenn gestern offen', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const logs = [log('2026-09-01', 'a'), log('2026-09-02', 'a')];
  const r = streak(items, logs, '2026-09-05'); // 3.,4. offen
  assert.equal(r.aktuell, 0);
  assert.equal(r.laengste, 2);
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test` – Erwartet: FAIL (`streak` undefined).

- [ ] **Schritt 3: `streak` implementieren**

In `berechnung.js` ergänzen:

```js
export function streak(items, logs, heuteStr) {
  const aktive = items.filter((it) => it.aktiv);
  if (aktive.length === 0) return { aktuell: 0, laengste: 0 };
  const start = aktive
    .map((it) => it.erstellt_am.slice(0, 10))
    .reduce((a, b) => (a < b ? a : b));
  const gestern = tageImZeitraum(start, heuteStr).slice(0, -1); // heute raus

  let aktuell = 0;
  let laengste = 0;
  let lauf = 0;
  for (const tag of gestern) {
    const status = tagesStatus(tag, aktive, logs);
    if (status === 'erfuellt') {
      lauf += 1;
      laengste = Math.max(laengste, lauf);
    } else if (status === 'keine') {
      // neutral: Serie läuft weiter, zählt aber nicht hoch
    } else {
      lauf = 0;
    }
  }
  // aktuelle Serie: von hinten zählen bis zum ersten Nicht-erfuellt (keine = weiter)
  for (let i = gestern.length - 1; i >= 0; i -= 1) {
    const status = tagesStatus(gestern[i], aktive, logs);
    if (status === 'erfuellt') aktuell += 1;
    else if (status === 'keine') continue;
    else break;
  }
  return { aktuell, laengste };
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test` – Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/berechnung.js test/ernaehrung-berechnung.test.js
git commit -m "feat: berechnung – streak (aktuell + längste Serie)"
```

**Deliverable:** `streak` fertig und getestet.

---

## Task 7: `berechnung.js` – `quoteProPunkt`

**Files:**
- Modify: `js/module/ernaehrung/berechnung.js`
- Modify: `test/ernaehrung-berechnung.test.js`

**Interfaces:**
- Consumes: `faelligePflicht`-Logik-Idee, aber **pro Punkt** (auch
  Nicht-Pflicht): „an wie vielen der fälligen Tage war der Punkt erledigt?".
- Produces:
  `quoteProPunkt(items, logs, heuteStr, zeitraumTage = null) => [{ itemId, label, faelligeTage, erledigteTage, quote }]`
  - `zeitraumTage = null` → seit `erstellt_am` des Punktes; sonst die letzten
    `zeitraumTage` Tage bis **gestern**.
  - `quote` = `erledigteTage / faelligeTage` (0 wenn `faelligeTage === 0`).
  - nur aktive Punkte, Reihenfolge nach `sortierung`.

- [ ] **Schritt 1: Failing test ergänzen**

```js
import { quoteProPunkt } from '../js/module/ernaehrung/berechnung.js';

test('quoteProPunkt: fällige vs. erledigte Tage', () => {
  const items = [
    { ...item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' }), sortierung: 1 },
    { ...item({ id: 'l', plan_typ: 'wochentage', plan_wochentage: [1],
                erstellt_am: '2026-09-01T00:00:00Z' }), sortierung: 2 },
  ];
  // a: täglich 01..07 (bis gestern bei heute=08) = 7 fällige Tage, erledigt an 5
  // l: montags -> im Zeitraum 01(Mo),08 ... nur 01 zählt (bis 07), erledigt: ja
  const logs = [
    ...['2026-09-01','2026-09-02','2026-09-03','2026-09-04','2026-09-05'].map((d) => log(d,'a')),
    log('2026-09-01','l'),
  ];
  const r = quoteProPunkt(items, logs, '2026-09-08');
  const a = r.find((x) => x.itemId === 'a');
  const l = r.find((x) => x.itemId === 'l');
  assert.equal(a.faelligeTage, 7);
  assert.equal(a.erledigteTage, 5);
  assert.equal(l.faelligeTage, 1);
  assert.equal(l.erledigteTage, 1);
  assert.equal(l.quote, 1);
});

test('quoteProPunkt: zeitraumTage begrenzt', () => {
  const items = [{ ...item({ id: 'a', erstellt_am: '2026-01-01T00:00:00Z' }), sortierung: 1 }];
  const logs = [log('2026-09-06', 'a'), log('2026-09-07', 'a')];
  const r = quoteProPunkt(items, logs, '2026-09-08', 3); // 05,06,07
  assert.equal(r[0].faelligeTage, 3);
  assert.equal(r[0].erledigteTage, 2);
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test` – Erwartet: FAIL.

- [ ] **Schritt 3: `quoteProPunkt` implementieren**

```js
export function quoteProPunkt(items, logs, heuteStr, zeitraumTage = null) {
  const TAG = 86_400_000;
  const bis = tageImZeitraum(heuteStr, heuteStr)[0]; // heuteStr normalisiert
  const gesternMs = Date.parse(bis + 'T00:00:00Z') - TAG;
  const gestern = new Date(gesternMs).toISOString().slice(0, 10);

  return items
    .filter((it) => it.aktiv)
    .slice()
    .sort((a, b) => a.sortierung - b.sortierung)
    .map((it) => {
      const startPunkt = it.erstellt_am.slice(0, 10);
      let von = startPunkt;
      if (zeitraumTage) {
        const fensterVon = new Date(gesternMs - (zeitraumTage - 1) * TAG)
          .toISOString().slice(0, 10);
        von = fensterVon > startPunkt ? fensterVon : startPunkt;
      }
      if (von > gestern) {
        return { itemId: it.id, label: it.label, faelligeTage: 0, erledigteTage: 0, quote: 0 };
      }
      let faelligeTage = 0;
      let erledigteTage = 0;
      for (const tag of tageImZeitraum(von, gestern)) {
        const kontext = it.plan_typ === 'intervall'
          ? { letzteErledigung: letzteErledigungVor(it.id, tag, logs) }
          : {};
        if (!istFaellig(it, tag, kontext)) continue;
        faelligeTage += 1;
        if (istErledigt(tag, it.id, logs)) erledigteTage += 1;
      }
      return {
        itemId: it.id, label: it.label, faelligeTage, erledigteTage,
        quote: faelligeTage ? erledigteTage / faelligeTage : 0,
      };
    });
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test` – Erwartet: PASS.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/berechnung.js test/ernaehrung-berechnung.test.js
git commit -m "feat: berechnung – quoteProPunkt (fällige vs. erledigte Tage)"
```

**Deliverable:** `quoteProPunkt` fertig und getestet.

---

## Task 8: `berechnung.js` – `prognose` + `heatmapDaten`

**Files:**
- Modify: `js/module/ernaehrung/berechnung.js`
- Modify: `test/ernaehrung-berechnung.test.js`

**Interfaces:**
- Consumes: `tagesStatus`, `tageImZeitraum` (Task 5).
- Produces:
  - `prognose(items, logs, heuteStr, fensterTage = 14, zielTage = 30) => { quote, erwartet, zielTage }`
    - `quote` = `erfuellt`-Tage / (bewertete Tage im Fenster, also `erfuellt`
      + `teilweise` + `offen`, ohne `keine`). 0 wenn keine bewerteten Tage.
    - `erwartet` = `Math.round(quote * zielTage)`.
  - `heatmapDaten(jahr, monat, items, logs) => [{ datum, status }]`
    - `monat` 1..12. Nur Tage bis **heute** (zukünftige Tage des Monats weg).
    - `status` wie `tagesStatus`.

- [ ] **Schritt 1: Failing test ergänzen**

```js
import { prognose, heatmapDaten } from '../js/module/ernaehrung/berechnung.js';

test('prognose: Quote der letzten Tage hochgerechnet', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-08-01T00:00:00Z' })];
  // letzte 14 Tage vor heute=2026-09-15 -> 01..14.09; erledigt an 7 davon
  const logs = ['2026-09-01','2026-09-02','2026-09-03','2026-09-04',
                '2026-09-05','2026-09-06','2026-09-07'].map((d) => log(d, 'a'));
  const r = prognose(items, logs, '2026-09-15', 14, 30);
  assert.equal(r.quote, 0.5);
  assert.equal(r.erwartet, 15);
  assert.equal(r.zielTage, 30);
});

test('heatmapDaten: Status je Tag, Zukunft abgeschnitten', () => {
  const items = [item({ id: 'a', erstellt_am: '2026-09-01T00:00:00Z' })];
  const logs = [log('2026-09-01', 'a')];
  const r = heatmapDaten(2026, 9, items, logs);
  assert.equal(r[0].datum, '2026-09-01');
  assert.equal(r[0].status, 'erfuellt');
  assert.ok(r.length <= 30);
  assert.ok(r.every((x) => x.datum <= '2026-09-30'));
});
```
*(Hinweis für den Umsetzer: `heute()` ist nicht gemockt; der zweite Test prüft
nur Obergrenzen, keine exakte Länge.)*

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test` – Erwartet: FAIL.

- [ ] **Schritt 3: implementieren**

```js
export function prognose(items, logs, heuteStr, fensterTage = 14, zielTage = 30) {
  const TAG = 86_400_000;
  const gesternMs = Date.parse(heuteStr.slice(0, 10) + 'T00:00:00Z') - TAG;
  const vonMs = gesternMs - (fensterTage - 1) * TAG;
  const tage = tageImZeitraum(
    new Date(vonMs).toISOString().slice(0, 10),
    new Date(gesternMs).toISOString().slice(0, 10),
  );
  const aktive = items.filter((it) => it.aktiv);
  let bewertet = 0;
  let erfuellt = 0;
  for (const tag of tage) {
    const s = tagesStatus(tag, aktive, logs);
    if (s === 'keine') continue;
    bewertet += 1;
    if (s === 'erfuellt') erfuellt += 1;
  }
  const quote = bewertet ? erfuellt / bewertet : 0;
  return { quote, erwartet: Math.round(quote * zielTage), zielTage };
}

export function heatmapDaten(jahr, monat, items, logs) {
  const aktive = items.filter((it) => it.aktiv);
  const letzterTag = new Date(Date.UTC(jahr, monat, 0)).getUTCDate();
  const mm = String(monat).padStart(2, '0');
  const bisHeute = heute();
  const raus = [];
  for (let t = 1; t <= letzterTag; t += 1) {
    const datum = `${jahr}-${mm}-${String(t).padStart(2, '0')}`;
    if (datum > bisHeute) break;
    raus.push({ datum, status: tagesStatus(datum, aktive, logs) });
  }
  return raus;
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test` – Erwartet: PASS (alle Suiten).

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/berechnung.js test/ernaehrung-berechnung.test.js
git commit -m "feat: berechnung – prognose + heatmapDaten"
```

**Deliverable:** Alle fünf Statistik-Funktionen fertig und getestet.

---

## Task 9: `daten.js` – Supabase-Wrapper

**Files:**
- Create: `js/module/ernaehrung/daten.js`

**Interfaces:**
- Consumes: `supabase` aus `../../supabase.js` (Etappe 0).
- Produces (alle `async`, werfen bei Fehler mit deutscher Meldung):
  - `ladeAlles() => { items, logs, gewicht, settings }` – lädt Items (aktiv,
    nach `sortierung`), `daily_log` der letzten 90 Tage, komplettes
    `weight_log`, alle `settings`. `settings` als Objekt `{ key: value }`.
  - `ladeLogSeit(vonStr) => logs` – `daily_log` ab `vonStr` (für Statistik-Tab).
  - `setzeLogEintrag(datumStr, itemId, erledigt) => void` – Upsert auf
    (`user_id`,`datum`,`item_id`).
  - `speichereItem(item) => item` – Insert (ohne `id`) oder Update (mit `id`).
    Felder: `label, kategorie, typ, zielwert, einheit, plan_typ,
    plan_wochentage, plan_intervall_tage, pflicht, sortierung`.
  - `deaktiviereItem(itemId) => void` – setzt `aktiv = false`.
  - `setzeGewicht(datumStr, kg) => void` – Upsert auf (`user_id`,`datum`).
  - `setzeSetting(key, wert) => void` – Upsert auf (`user_id`,`key`).
- Konsumiert von `index.js` (Task 10) und allen Views.

- [ ] **Schritt 1: `daten.js` schreiben**

```js
import { supabase } from '../../supabase.js';

const TAG_MS = 86_400_000;

function fehler(kontext, error) {
  return new Error(`${kontext}: ${error?.message ?? 'unbekannter Fehler'}`);
}

export async function ladeAlles() {
  const vor90 = new Date(Date.now() - 90 * TAG_MS).toISOString().slice(0, 10);
  const [items, logs, gewicht, settings] = await Promise.all([
    supabase.from('checklist_items').select('*').eq('aktiv', true).order('sortierung'),
    supabase.from('daily_log').select('datum,item_id,erledigt,wert').gte('datum', vor90),
    supabase.from('weight_log').select('datum,gewicht_kg').order('datum'),
    supabase.from('settings').select('key,value'),
  ]);
  for (const [name, r] of Object.entries({ items, logs, gewicht, settings })) {
    if (r.error) throw fehler(`Laden (${name})`, r.error);
  }
  const settingsObj = {};
  for (const row of settings.data) settingsObj[row.key] = row.value;
  return { items: items.data, logs: logs.data, gewicht: gewicht.data, settings: settingsObj };
}

export async function ladeLogSeit(vonStr) {
  const { data, error } = await supabase
    .from('daily_log').select('datum,item_id,erledigt,wert').gte('datum', vonStr);
  if (error) throw fehler('Log laden', error);
  return data;
}

export async function setzeLogEintrag(datumStr, itemId, erledigt) {
  const { error } = await supabase.from('daily_log').upsert(
    { datum: datumStr, item_id: itemId, erledigt, aktualisiert_am: new Date().toISOString() },
    { onConflict: 'user_id,datum,item_id' },
  );
  if (error) throw fehler('Eintrag speichern', error);
}

export async function speichereItem(item) {
  const felder = {
    label: item.label, kategorie: item.kategorie, typ: item.typ ?? 'haken',
    zielwert: item.zielwert ?? null, einheit: item.einheit ?? null,
    plan_typ: item.plan_typ, plan_wochentage: item.plan_wochentage ?? null,
    plan_intervall_tage: item.plan_intervall_tage ?? null,
    pflicht: item.pflicht ?? true, sortierung: item.sortierung ?? 0,
  };
  const abfrage = item.id
    ? supabase.from('checklist_items').update(felder).eq('id', item.id).select().single()
    : supabase.from('checklist_items').insert(felder).select().single();
  const { data, error } = await abfrage;
  if (error) throw fehler('Punkt speichern', error);
  return data;
}

export async function deaktiviereItem(itemId) {
  const { error } = await supabase.from('checklist_items')
    .update({ aktiv: false }).eq('id', itemId);
  if (error) throw fehler('Punkt entfernen', error);
}

export async function setzeGewicht(datumStr, kg) {
  const { error } = await supabase.from('weight_log').upsert(
    { datum: datumStr, gewicht_kg: kg }, { onConflict: 'user_id,datum' },
  );
  if (error) throw fehler('Gewicht speichern', error);
}

export async function setzeSetting(key, wert) {
  const { error } = await supabase.from('settings').upsert(
    { key, value: wert }, { onConflict: 'user_id,key' },
  );
  if (error) throw fehler('Einstellung speichern', error);
}
```

*(`user_id` wird von der DB-Default `auth.uid()` gesetzt – im Browser mit
Marks Session korrekt. Nur die MCP-Inserts brauchen `user_id` explizit.)*

- [ ] **Schritt 2: Syntax-Check**

Run: `node --check js/module/ernaehrung/daten.js`
Erwartet: keine Ausgabe (ok).

- [ ] **Schritt 3: Commit**

```bash
git add js/module/ernaehrung/daten.js
git commit -m "feat: daten.js – Supabase-Wrapper fürs Ernährungsmodul"
```

**Deliverable:** `daten.js` mit allen Wrappern. Echttest folgt in Task 11+
im Browser.

---

## Task 10: Modul-Gerüst + App-Routing + Seitenrahmen

**Files:**
- Create: `js/module/ernaehrung/index.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Modify: `app.css`
- Modify: `js/module/README.md`

**Interfaces:**
- Consumes: `registriere` (`js/registry.js`), `parseHash` (Task 3),
  `ladeAlles` (Task 9).
- Produces:
  - Modul-Objekt `{ id: 'ernaehrung', titel: 'Ernährung', renderKachel(el), init(container) }`
    via `registriere(...)` beim Import.
  - `init(container)` baut Tab-Leiste (Heute/Liste/Gewicht/Statistik/Infos) +
    `<div id="tab-inhalt">`, lädt `ladeAlles()` in `zustand`, zeigt die zur
    `unterseite` passende Ansicht. Ohne `unterseite` → „heute".
  - Sub-Navigation setzt `location.hash = '#/ernaehrung/<tab>'`.
  - Modul rendert die einzelnen Tabs über je eine Funktion
    `zeigeHeute/zeigeListe/... (container, zustand, aktualisierenCb)` –
    in Task 11–16 gefüllt, hier als leere Platzhalter („Kommt gleich").

- [ ] **Schritt 1: `index.html` erweitern**

Nach `<div id="kachel-raster"></div>` und dem Leer-Hinweis, noch innerhalb
`#dashboard-ansicht`, einfügen:

```html
      <section id="modul-detail" hidden></section>
```

Und direkt vor `<script type="module" src="js/app.js"></script>` **nichts** –
Chart.js wird per ESM-Import in `gewicht.js` geladen, kein `<script>`-Tag nötig.

- [ ] **Schritt 2: `js/module/README.md` ergänzen**

Am Ende anfügen:

```markdown

## Ordner-Konvention (ab Etappe 1)

Größere Module liegen als Ordner `js/module/<name>/` mit einer `index.js`, die
`registriere({...})` aufruft. Reine Logik (Berechnungen, Routing-Helfer) kommt
in eigene Dateien mit `node:test`-Tests, Supabase-Zugriff gebündelt in
`daten.js`. Aktivierung: Import-Zeile in `js/app.js` ergänzen
(`import './module/<name>/index.js';`).
```

- [ ] **Schritt 3: `js/app.js` um Detail-Routing erweitern**

`js/app.js` ersetzen durch:

```js
import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, meldeAb, beiAuthWechsel } from './auth.js';
import { alleModule, holeModul } from './registry.js';
import './module/ernaehrung/index.js';

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const kachelRaster = document.getElementById('kachel-raster');
const leerHinweis = document.getElementById('dashboard-leer-hinweis');
const modulDetail = document.getElementById('modul-detail');

let aktivesModulId = null;

function zeige(ansicht) {
  loginAnsicht.hidden = ansicht !== 'login';
  dashboardAnsicht.hidden = ansicht !== 'dashboard';
}

function rendereKacheln() {
  kachelRaster.innerHTML = '';
  for (const modul of alleModule()) {
    const kachel = document.createElement('button');
    kachel.className = 'kachel';
    kachel.textContent = modul.titel;
    kachel.addEventListener('click', () => { location.hash = `#/${modul.id}`; });
    if (typeof modul.renderKachel === 'function') modul.renderKachel(kachel);
    kachelRaster.appendChild(kachel);
  }
}

function zeigeRaster() {
  aktivesModulId = null;
  modulDetail.hidden = true;
  modulDetail.innerHTML = '';
  kachelRaster.hidden = false;
  leerHinweis.hidden = kachelRaster.children.length > 0;
}

async function oeffneModul(modul) {
  kachelRaster.hidden = true;
  leerHinweis.hidden = true;
  modulDetail.hidden = false;
  if (aktivesModulId !== modul.id) {
    aktivesModulId = modul.id;
    modulDetail.innerHTML = '';
    await modul.init(modulDetail);
  }
}

async function route() {
  const session = await holeSession();
  zeige(entscheideAnsicht(session));
  if (!session) return;
  rendereKacheln();
  const { modul } = parseHash(location.hash);
  const gewaehlt = modul ? holeModul(modul) : null;
  if (gewaehlt) await oeffneModul(gewaehlt);
  else zeigeRaster();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = loginForm.querySelector('button');
  knopf.disabled = true;
  loginHinweis.textContent = 'Sende Link …';
  const { ok, fehler } = await sendeMagicLink(emailFeld.value.trim());
  loginHinweis.textContent = ok
    ? 'Link ist unterwegs. Schau in dein Postfach.'
    : `Fehler: ${fehler}`;
  knopf.disabled = false;
});

document.getElementById('logout').addEventListener('click', async () => {
  await meldeAb();
  location.hash = '';
  route();
});

beiAuthWechsel(() => route());
window.addEventListener('hashchange', () => { route(); });

route();
```

*(Wichtig: `init` wird nur beim **Wechsel** des aktiven Moduls gerufen. Das
Unter-Routing zwischen den Tabs macht das Modul selbst, indem es bei
`hashchange` seine `unterseite` neu ausliest – siehe Schritt 4.)*

- [ ] **Schritt 4: `js/module/ernaehrung/index.js` schreiben**

```js
import { registriere } from '../../registry.js';
import { parseHash } from '../../router.js';
import { ladeAlles } from './daten.js';
import { heute, tagesStatus } from './berechnung.js';
import { istFaellig } from './zeitplan.js';

const TABS = [
  ['heute', 'Heute'], ['liste', 'Liste'], ['gewicht', 'Gewicht'],
  ['statistik', 'Statistik'], ['infos', 'Infos'],
];

let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

// Anzahl heute fälliger Pflicht-Punkte + davon erledigt (für Kachel + Ring).
export function heuteFortschritt() {
  const d = heute();
  const faellig = zustand.items.filter((it) => {
    if (!it.pflicht) return false;
    const k = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigung(it.id, d) } : {};
    return istFaellig(it, d, k);
  });
  const erledigt = faellig.filter((it) =>
    zustand.logs.some((l) => l.datum === d && l.item_id === it.id && l.erledigt));
  return { faellig: faellig.length, erledigt: erledigt.length };
}

function letzteErledigung(itemId, datumStr) {
  let treffer = null;
  for (const l of zustand.logs) {
    if (l.item_id === itemId && l.erledigt && l.datum < datumStr
        && (!treffer || l.datum > treffer)) treffer = l.datum;
  }
  return treffer;
}

function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="zurueck" type="button">‹ Dashboard</button>
      <h2>Ernährung</h2>
      <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
    </header>
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelector('.zurueck')
    .addEventListener('click', () => { location.hash = ''; });
  container.querySelector('.neu-laden')
    .addEventListener('click', async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/ernaehrung/${b.dataset.tab}`; });
  });
}

async function zeigeAktuellenTab() {
  const { unterseite } = parseHash(location.hash);
  const tab = TABS.some(([id]) => id === unterseite) ? unterseite : 'heute';
  const inhalt = containerRef.querySelector('#tab-inhalt');
  containerRef.querySelectorAll('.tab-leiste button')
    .forEach((b) => b.classList.toggle('aktiv', b.dataset.tab === tab));
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  const module = {
    heute: () => import('./heute.js').then((m) => m.zeigeHeute),
    liste: () => import('./liste.js').then((m) => m.zeigeListe),
    gewicht: () => import('./gewicht.js').then((m) => m.zeigeGewicht),
    statistik: () => import('./statistik.js').then((m) => m.zeigeStatistik),
    infos: () => import('./infos.js').then((m) => m.zeigeInfos),
  };
  const zeigeFn = await module[tab]();
  inhalt.innerHTML = '';
  await zeigeFn(inhalt, zustand, async () => { await ladeZustand(); zeigeAktuellenTab(); });
}

function beiHashwechsel() {
  const { modul } = parseHash(location.hash);
  if (modul === 'ernaehrung' && containerRef) zeigeAktuellenTab();
}

registriere({
  id: 'ernaehrung',
  titel: 'Ernährung',
  renderKachel(el) {
    if (!zustand) { el.textContent = 'Ernährung'; return; }
    const f = heuteFortschritt();
    el.innerHTML = `Ernährung<span class="kachel-zahl">${f.erledigt}/${f.faellig}</span>`;
  },
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
});
```

*(Die Views werden per dynamischem `import()` geladen – so bleibt jede
Tab-Datei klein und der Umsetzer kann sie in Task 11–16 einzeln nachrüsten.
Bis dahin schlägt der Import fehl; deshalb legt Schritt 5 leere Stubs an.)*

- [ ] **Schritt 5: Leere View-Stubs anlegen**

Fünf Dateien, jeweils mit dieser Signatur (Inhalt in späteren Tasks):

```js
// js/module/ernaehrung/heute.js
export async function zeigeHeute(container, zustand, aktualisieren) {
  container.textContent = 'Heute – kommt in Task 11.';
}
```
Analog `liste.js` (`zeigeListe`), `gewicht.js` (`zeigeGewicht`),
`statistik.js` (`zeigeStatistik`), `infos.js` (`zeigeInfos`).

- [ ] **Schritt 6: `app.css` – Rahmen-Stile ergänzen**

Am Ende von `app.css`:

```css
/* Modul-Detail */
#modul-detail { margin-top: 8px; }
.modul-kopf { display: flex; align-items: center; gap: 12px; }
.modul-kopf h2 { flex: 1; font-size: 1.2rem; margin: 0; }
.modul-kopf button { background: transparent; color: var(--gedaempft);
  border: 1px solid var(--rand); padding: 8px 12px; }
.tab-leiste { display: flex; gap: 6px; overflow-x: auto; margin: 14px 0;
  border-bottom: 1px solid var(--rand); }
.tab-leiste button { background: transparent; color: var(--gedaempft);
  border: none; border-bottom: 2px solid transparent; border-radius: 0;
  padding: 10px 12px; white-space: nowrap; }
.tab-leiste button.aktiv { color: var(--text); border-bottom-color: var(--akzent); }
.kachel-zahl { display: block; font-size: 1.4rem; font-weight: 700; margin-top: 6px; }
.lade { color: var(--gedaempft); }
```

- [ ] **Schritt 7: Tests + Syntax prüfen**

Run: `npm test` – Erwartet: PASS (unverändert, keine neuen Tests).
Run: `node --check js/app.js && node --check js/module/ernaehrung/index.js`
Erwartet: ok.

- [ ] **Schritt 8: Manuell im Browser prüfen**

```bash
python -m http.server 8000
```
`http://localhost:8000` → einloggen (Magic-Link; Session aus Etappe 0 evtl.
noch aktiv) → Kachel „Ernährung" sichtbar → anklicken → Modul-Rahmen mit
Tab-Leiste, „‹ Dashboard" führt zurück, Tabs wechseln die (Stub-)Inhalte und
setzen den Hash. Konsole ohne Fehler.

- [ ] **Schritt 9: Commit**

```bash
git add index.html app.css js/app.js js/module/README.md js/module/ernaehrung/
git commit -m "feat: Ernährungsmodul-Gerüst + Detail-Routing in app.js"
```

**Deliverable:** Modul öffnet sich mit Tab-Leiste und Unter-Routing;
Tab-Inhalte noch Platzhalter.

---

## Task 11: Heute-Ansicht

**Files:**
- Modify: `js/module/ernaehrung/heute.js`
- Modify: `app.css`

**Interfaces:**
- Consumes: `zustand` (`{ items, logs, ... }`), `istFaellig` (`zeitplan.js`),
  `heute` (`berechnung.js`), `setzeLogEintrag` (`daten.js`),
  `heuteFortschritt` (`index.js`).
- Produces: `zeigeHeute(container, zustand, aktualisieren)` – rendert die heute
  fälligen Punkte, gruppiert nach `kategorie` (`ernaehrung`, dann
  `supplement`), jeweils mit Checkbox. Oben ein Fortschrittsring
  (erledigte/fällige Pflicht-Punkte). Klick schreibt sofort via
  `setzeLogEintrag`, aktualisiert `zustand.logs` lokal und den Ring.

- [ ] **Schritt 1: `heute.js` implementieren**

```js
import { istFaellig } from './zeitplan.js';
import { heute } from './berechnung.js';
import { setzeLogEintrag } from './daten.js';

const KATEGORIE_TITEL = { ernaehrung: 'Ernährung', supplement: 'Supplemente' };

function letzteErledigung(itemId, datumStr, logs) {
  let treffer = null;
  for (const l of logs) {
    if (l.item_id === itemId && l.erledigt && l.datum < datumStr
        && (!treffer || l.datum > treffer)) treffer = l.datum;
  }
  return treffer;
}

export async function zeigeHeute(container, zustand, aktualisieren) {
  const d = heute();
  const faellige = zustand.items.filter((it) => {
    const k = it.plan_typ === 'intervall'
      ? { letzteErledigung: letzteErledigung(it.id, d, zustand.logs) } : {};
    return istFaellig(it, d, k);
  });

  const ring = document.createElement('div');
  ring.className = 'fortschritt-ring';
  container.appendChild(ring);

  function istErledigt(itemId) {
    return zustand.logs.some((l) => l.datum === d && l.item_id === itemId && l.erledigt);
  }
  function ringNeu() {
    const pflicht = faellige.filter((it) => it.pflicht);
    const erledigt = pflicht.filter((it) => istErledigt(it.id)).length;
    const prozent = pflicht.length ? Math.round((erledigt / pflicht.length) * 100) : 100;
    ring.style.setProperty('--prozent', prozent);
    ring.innerHTML = `<span>${erledigt}/${pflicht.length}</span><small>Tagesziel</small>`;
  }
  ringNeu();

  for (const kategorie of ['ernaehrung', 'supplement']) {
    const punkte = faellige.filter((it) => it.kategorie === kategorie);
    if (punkte.length === 0) continue;
    const gruppe = document.createElement('section');
    gruppe.className = 'heute-gruppe';
    gruppe.innerHTML = `<h3>${KATEGORIE_TITEL[kategorie]}</h3>`;
    for (const it of punkte) {
      const zeile = document.createElement('label');
      zeile.className = 'heute-zeile';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = istErledigt(it.id);
      box.addEventListener('change', async () => {
        box.disabled = true;
        try {
          await setzeLogEintrag(d, it.id, box.checked);
          const vorhanden = zustand.logs.find((l) => l.datum === d && l.item_id === it.id);
          if (vorhanden) vorhanden.erledigt = box.checked;
          else zustand.logs.push({ datum: d, item_id: it.id, erledigt: box.checked });
          ringNeu();
        } catch (e) {
          box.checked = !box.checked;
          alert(e.message);
        } finally {
          box.disabled = false;
        }
      });
      const text = document.createElement('span');
      text.textContent = it.label;
      zeile.append(box, text);
      gruppe.appendChild(zeile);
    }
    container.appendChild(gruppe);
  }

  if (faellige.length === 0) {
    container.appendChild(Object.assign(document.createElement('p'),
      { className: 'lade', textContent: 'Heute ist nichts fällig.' }));
  }
}
```

- [ ] **Schritt 2: `app.css` – Heute-Stile**

```css
.fortschritt-ring { --prozent: 0;
  width: 108px; height: 108px; border-radius: 50%; margin: 4px auto 20px;
  display: grid; place-content: center; text-align: center;
  background: conic-gradient(var(--akzent) calc(var(--prozent) * 1%), var(--rand) 0); }
.fortschritt-ring::before { content: ''; grid-area: 1/1;
  width: 84px; height: 84px; border-radius: 50%; background: var(--bg); }
.fortschritt-ring span, .fortschritt-ring small { grid-area: 1/1; z-index: 1; }
.fortschritt-ring span { font-size: 1.3rem; font-weight: 700; align-self: end; }
.fortschritt-ring small { color: var(--gedaempft); align-self: start; margin-top: 2px; }
.heute-gruppe { margin-bottom: 18px; }
.heute-gruppe h3 { font-size: .95rem; color: var(--gedaempft); margin: 0 0 8px; }
.heute-zeile { display: flex; align-items: center; gap: 12px; padding: 12px 4px;
  border-bottom: 1px solid var(--rand); cursor: pointer; }
.heute-zeile input { width: 22px; height: 22px; accent-color: var(--akzent); flex: none; }
```

- [ ] **Schritt 3: `renderKachel` aktiv nutzen**

Prüfen, dass `index.js` `renderKachel` nach dem ersten `ladeZustand()` die Zahl
zeigt. Da `rendereKacheln()` in `app.js` **vor** dem Öffnen läuft und `zustand`
dann evtl. noch `null` ist: in `index.js` am Ende von `init` und `ladeZustand`
kein Extra nötig – aber in `app.js` `route()` so anpassen, dass nach einem
Modul-Besuch beim Zurückkehren `rendereKacheln()` erneut läuft (tut es, weil
`route()` bei jedem `hashchange` neu rendert). Kein Code-Change, nur
verifizieren.

- [ ] **Schritt 4: Manueller Test**

Server starten, Modul öffnen, „Heute":
- Nur heute fällige Punkte sichtbar (an einem Dienstag: **keine** Leber).
- Häkchen setzen → Ring steigt, bleibt nach „⟳ Aktualisieren" gesetzt.
- Zurück zum Dashboard → Kachel zeigt `x/y` mit aktueller Zahl.
- Konsole fehlerfrei.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/heute.js app.css
git commit -m "feat: Heute-Ansicht mit Fortschrittsring"
```

**Deliverable:** Abhaken funktioniert und ist persistent; Ring + Kachel zeigen
den Tagesstand.

---

## Task 12: Liste bearbeiten

**Files:**
- Modify: `js/module/ernaehrung/liste.js`
- Modify: `app.css`

**Interfaces:**
- Consumes: `zustand.items`, `speichereItem`, `deaktiviereItem` (`daten.js`),
  `wochentagVon` nicht nötig.
- Produces: `zeigeListe(container, zustand, aktualisieren)` – Liste aller
  aktiven Punkte nach `sortierung`, je Zeile: Label, Kategorie, Zeitplan-Kurzform.
  Aktionen: **Neu**, **Bearbeiten** (Formular), **Hoch/Runter** (tauscht
  `sortierung` mit Nachbar, speichert beide), **Entfernen** (`deaktiviereItem`
  nach `confirm`). Nach jeder Änderung `await aktualisieren()`.

- [ ] **Schritt 1: `liste.js` implementieren**

```js
import { speichereItem, deaktiviereItem } from './daten.js';

const WT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function planText(it) {
  if (it.plan_typ === 'taeglich') return 'täglich';
  if (it.plan_typ === 'wochentage') {
    return (it.plan_wochentage || []).map((n) => WT[n - 1]).join(', ') || '—';
  }
  return `alle ${it.plan_intervall_tage} Tage`;
}

export async function zeigeListe(container, zustand, aktualisieren) {
  const items = [...zustand.items].sort((a, b) => a.sortierung - b.sortierung);

  const neu = document.createElement('button');
  neu.textContent = '+ Neuer Punkt';
  neu.className = 'listen-neu';
  neu.addEventListener('click', () => oeffneFormular(null));
  container.appendChild(neu);

  const liste = document.createElement('div');
  liste.className = 'punkt-liste';
  container.appendChild(liste);

  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.innerHTML = `
      <div class="punkt-info">
        <strong>${it.label}</strong>
        <small>${it.kategorie === 'supplement' ? 'Supplement' : 'Ernährung'} · ${planText(it)}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="hoch" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button data-a="runter" ${i === items.length - 1 ? 'disabled' : ''}>↓</button>
        <button data-a="bearbeiten">✎</button>
        <button data-a="weg">✕</button>
      </div>`;
    zeile.querySelector('[data-a=bearbeiten]')
      .addEventListener('click', () => oeffneFormular(it));
    zeile.querySelector('[data-a=weg]').addEventListener('click', async () => {
      if (!confirm(`„${it.label}" entfernen? (bleibt in der Historie)`)) return;
      await deaktiviereItem(it.id);
      await aktualisieren();
    });
    zeile.querySelector('[data-a=hoch]').addEventListener('click',
      () => tausche(i, i - 1));
    zeile.querySelector('[data-a=runter]').addEventListener('click',
      () => tausche(i, i + 1));
    liste.appendChild(zeile);
  }

  async function tausche(a, b) {
    const s = items[a].sortierung;
    items[a].sortierung = items[b].sortierung;
    items[b].sortierung = s;
    await speichereItem(items[a]);
    await speichereItem(items[b]);
    await aktualisieren();
  }

  function oeffneFormular(it) {
    const dlg = document.createElement('dialog');
    dlg.className = 'punkt-dialog';
    dlg.innerHTML = `
      <form method="dialog">
        <h3>${it ? 'Punkt bearbeiten' : 'Neuer Punkt'}</h3>
        <label>Name <input name="label" required value="${it?.label ?? ''}"></label>
        <label>Kategorie
          <select name="kategorie">
            <option value="ernaehrung" ${it?.kategorie !== 'supplement' ? 'selected' : ''}>Ernährung</option>
            <option value="supplement" ${it?.kategorie === 'supplement' ? 'selected' : ''}>Supplement</option>
          </select>
        </label>
        <label>Zeitplan
          <select name="plan_typ">
            <option value="taeglich" ${(!it || it.plan_typ === 'taeglich') ? 'selected' : ''}>täglich</option>
            <option value="wochentage" ${it?.plan_typ === 'wochentage' ? 'selected' : ''}>bestimmte Wochentage</option>
            <option value="intervall" ${it?.plan_typ === 'intervall' ? 'selected' : ''}>alle N Tage</option>
          </select>
        </label>
        <fieldset name="wt-feld" class="wt-feld">
          ${WT.map((t, idx) => `<label><input type="checkbox" name="wt" value="${idx + 1}"
            ${(it?.plan_wochentage || []).includes(idx + 1) ? 'checked' : ''}>${t}</label>`).join('')}
        </fieldset>
        <label class="intervall-feld">alle
          <input type="number" name="intervall" min="1" value="${it?.plan_intervall_tage ?? 5}"> Tage</label>
        <menu>
          <button value="abbrechen">Abbrechen</button>
          <button value="ok" id="speichern">Speichern</button>
        </menu>
      </form>`;
    container.appendChild(dlg);

    const form = dlg.querySelector('form');
    const sync = () => {
      const t = form.plan_typ.value;
      dlg.querySelector('.wt-feld').hidden = t !== 'wochentage';
      dlg.querySelector('.intervall-feld').hidden = t !== 'intervall';
    };
    form.plan_typ.addEventListener('change', sync);
    sync();

    dlg.addEventListener('close', async () => {
      const weg = () => dlg.remove();
      if (dlg.returnValue !== 'ok') return weg();
      const wt = [...form.querySelectorAll('input[name=wt]:checked')].map((c) => +c.value);
      const daten = {
        id: it?.id,
        label: form.label.value.trim(),
        kategorie: form.kategorie.value,
        plan_typ: form.plan_typ.value,
        plan_wochentage: form.plan_typ.value === 'wochentage' ? wt : null,
        plan_intervall_tage: form.plan_typ.value === 'intervall' ? +form.intervall.value : null,
        sortierung: it?.sortierung ?? (zustand.items.length + 1) * 10,
        pflicht: it?.pflicht ?? true,
      };
      try {
        await speichereItem(daten);
        weg();
        await aktualisieren();
      } catch (e) { alert(e.message); weg(); }
    });
    dlg.showModal();
  }
}
```

- [ ] **Schritt 2: `app.css` – Listen-Stile**

```css
.listen-neu { margin-bottom: 14px; }
.punkt-zeile { display: flex; align-items: center; gap: 10px; padding: 10px 4px;
  border-bottom: 1px solid var(--rand); }
.punkt-info { flex: 1; display: flex; flex-direction: column; }
.punkt-info small { color: var(--gedaempft); }
.punkt-aktionen { display: flex; gap: 4px; }
.punkt-aktionen button { background: transparent; color: var(--gedaempft);
  border: 1px solid var(--rand); padding: 6px 9px; }
.punkt-dialog { border: 1px solid var(--rand); border-radius: 12px;
  background: var(--karte); color: var(--text); max-width: 340px; width: 92vw; }
.punkt-dialog form { display: flex; flex-direction: column; gap: 12px; }
.punkt-dialog label { display: flex; flex-direction: column; gap: 4px; font-size: .9rem; }
.wt-feld { display: flex; flex-wrap: wrap; gap: 8px; border: 1px solid var(--rand);
  border-radius: 8px; padding: 8px; }
.wt-feld label { flex-direction: row; align-items: center; gap: 4px; }
.punkt-dialog menu { display: flex; justify-content: flex-end; gap: 8px;
  margin: 0; padding: 0; }
.punkt-dialog menu button[value=abbrechen] { background: transparent;
  color: var(--gedaempft); border: 1px solid var(--rand); }
```

- [ ] **Schritt 3: Manueller Test**

- Neuer Punkt „Testwasser", Zeitplan „Mo/Do" → speichern → erscheint in der
  Liste, Zeitplan-Text „Mo, Do".
- Im „Heute"-Tab an einem Dienstag ist „Testwasser" **nicht** sichtbar, am
  Montag schon.
- Hoch/Runter ändert Reihenfolge dauerhaft (nach „⟳").
- Entfernen blendet den Punkt aus; in Supabase `aktiv = false` (per MCP
  `select label, aktiv from checklist_items where label = 'Testwasser'`).
- Danach „Testwasser" wieder entfernen/aufräumen: in Supabase löschen oder
  belassen (stört nicht).

- [ ] **Schritt 4: Commit**

```bash
git add js/module/ernaehrung/liste.js app.css
git commit -m "feat: Liste bearbeiten – anlegen/ändern/sortieren/entfernen"
```

**Deliverable:** Punkte voll konfigurierbar inkl. Zeitplan.

---

## Task 13: Gewicht-Ansicht

**Files:**
- Modify: `js/module/ernaehrung/gewicht.js`
- Modify: `app.css`

**Interfaces:**
- Consumes: `zustand.gewicht`, `zustand.settings`, `setzeGewicht`,
  `setzeSetting` (`daten.js`), `heute` (`berechnung.js`), Chart.js per
  ESM-CDN.
- Produces: `zeigeGewicht(container, zustand, aktualisieren)` – Eingabefeld
  „heutiges Gewicht" (vorbelegt mit letztem Wert), Feld „Körpergröße (cm)"
  (aus/nach `settings.koerpergroesse_cm`), BMI-Anzeige wenn Größe gesetzt,
  Chart.js-Liniendiagramm des Verlaufs mit gestrichelter Ziel-Linie
  (`settings.zielgewicht_kg`).

- [ ] **Schritt 1: Chart.js-Version festlegen**

Auf `https://www.jsdelivr.com/package/npm/chart.js` die aktuelle 4.x-Version
ansehen (Stand Planung: 4.4.x). Exakte Version notieren, im Import unten
einsetzen. Kein `@latest`.

- [ ] **Schritt 2: `gewicht.js` implementieren**

```js
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/auto/+esm';
import { heute } from './berechnung.js';
import { setzeGewicht, setzeSetting } from './daten.js';

export async function zeigeGewicht(container, zustand, aktualisieren) {
  const verlauf = [...zustand.gewicht].sort((a, b) => a.datum.localeCompare(b.datum));
  const letzter = verlauf.at(-1)?.gewicht_kg ?? '';
  const groesse = zustand.settings.koerpergroesse_cm ?? '';
  const ziel = zustand.settings.zielgewicht_kg ?? null;

  container.innerHTML = `
    <div class="gewicht-eingabe">
      <label>Heutiges Gewicht (kg)
        <input type="number" step="0.1" id="g-wert" value="${letzter}"></label>
      <button id="g-speichern">Speichern</button>
    </div>
    <div class="gewicht-eingabe">
      <label>Körpergröße (cm)
        <input type="number" step="1" id="g-groesse" value="${groesse}"></label>
      <button id="g-groesse-speichern">Merken</button>
    </div>
    <p id="g-bmi" class="g-bmi"></p>
    <canvas id="g-chart" height="220"></canvas>`;

  function bmiNeu() {
    const g = parseFloat(container.querySelector('#g-groesse').value);
    const w = parseFloat(container.querySelector('#g-wert').value);
    const el = container.querySelector('#g-bmi');
    if (g > 0 && w > 0) {
      const bmi = w / ((g / 100) ** 2);
      el.textContent = `BMI: ${bmi.toFixed(1)}`;
    } else { el.textContent = ''; }
  }
  bmiNeu();
  container.querySelector('#g-wert').addEventListener('input', bmiNeu);
  container.querySelector('#g-groesse').addEventListener('input', bmiNeu);

  container.querySelector('#g-speichern').addEventListener('click', async (e) => {
    const w = parseFloat(container.querySelector('#g-wert').value);
    if (!(w > 0)) return alert('Bitte gültiges Gewicht eingeben.');
    e.target.disabled = true;
    try { await setzeGewicht(heute(), w); await aktualisieren(); }
    catch (err) { alert(err.message); e.target.disabled = false; }
  });
  container.querySelector('#g-groesse-speichern').addEventListener('click', async (e) => {
    const g = parseFloat(container.querySelector('#g-groesse').value);
    if (!(g > 0)) return alert('Bitte gültige Größe eingeben.');
    e.target.disabled = true;
    try { await setzeSetting('koerpergroesse_cm', g); await aktualisieren(); }
    catch (err) { alert(err.message); e.target.disabled = false; }
  });

  const labels = verlauf.map((v) => v.datum);
  const daten = verlauf.map((v) => v.gewicht_kg);
  const datasets = [{ label: 'Gewicht (kg)', data: daten, tension: 0.2,
    borderColor: '#4f8cff', pointRadius: 3 }];
  if (ziel) {
    datasets.push({ label: 'Ziel', data: labels.map(() => ziel),
      borderColor: '#9aa4b2', borderDash: [6, 6], pointRadius: 0 });
  }
  new Chart(container.querySelector('#g-chart'), {
    type: 'line',
    data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: false } } },
  });
}
```

*(Falls die exakte Version abweicht: die `@4.4.6` in der Import-URL anpassen.)*

- [ ] **Schritt 3: `app.css` – Gewicht-Stile**

```css
.gewicht-eingabe { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 12px; }
.gewicht-eingabe label { flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: .9rem; }
.g-bmi { color: var(--gedaempft); margin: 4px 0 16px; }
#g-chart { max-width: 100%; }
```

- [ ] **Schritt 4: Manueller Test**

- „Körpergröße" 179 eintragen → „Merken" → BMI erscheint (~22.2 bei 71 kg).
- Gewicht auf 71.5 ändern → „Speichern" → Punkt in der Kurve, Seite lädt neu.
- Ziel-Linie (77) als gestrichelte Linie sichtbar.
- Prüfen in Supabase (per MCP): `select * from settings; select * from weight_log order by datum;`
- iPhone-Safari: Kurve skaliert, kein Horizontal-Scroll der Seite.

- [ ] **Schritt 5: Commit**

```bash
git add js/module/ernaehrung/gewicht.js app.css
git commit -m "feat: Gewicht-Ansicht mit Chart.js-Verlauf, Ziel-Linie, BMI"
```

**Deliverable:** Gewicht erfassbar, Verlauf + Ziel sichtbar, BMI bei gesetzter
Größe.

---

## Task 14: Statistik-Ansicht

**Files:**
- Modify: `js/module/ernaehrung/statistik.js`
- Modify: `app.css`

**Interfaces:**
- Consumes: `ladeLogSeit` (`daten.js`), alle `berechnung.js`-Funktionen,
  `zustand.items`.
- Produces: `zeigeStatistik(container, zustand, aktualisieren)` – lädt den
  **kompletten** Log nach (`ladeLogSeit` mit dem ältesten `erstellt_am`),
  zeigt: Streak-Karten (aktuell/längste), Prognose-Satz, Quote-Balken je Punkt
  (30-Tage-Fenster), Monats-Heatmap mit ‹/›-Navigation.

- [ ] **Schritt 1: `statistik.js` implementieren**

```js
import { ladeLogSeit } from './daten.js';
import {
  heute, streak, prognose, quoteProPunkt, heatmapDaten,
} from './berechnung.js';

const STATUS_FARBE = {
  erfuellt: 'var(--hm-gruen)', teilweise: 'var(--hm-gelb)',
  offen: 'var(--hm-rot)', keine: 'var(--rand)',
};
const MONATE = ['Januar','Februar','März','April','Mai','Juni','Juli','August',
  'September','Oktober','November','Dezember'];

export async function zeigeStatistik(container, zustand) {
  const d = heute();
  const start = zustand.items.length
    ? zustand.items.map((it) => it.erstellt_am.slice(0, 10)).reduce((a, b) => (a < b ? a : b))
    : d;
  const logs = await ladeLogSeit(start);
  const items = zustand.items;

  const s = streak(items, logs, d);
  const p = prognose(items, logs, d);
  const quoten = quoteProPunkt(items, logs, d, 30);

  container.innerHTML = `
    <div class="stat-karten">
      <div class="stat-karte"><span>${s.aktuell}</span><small>aktuelle Serie (Tage)</small></div>
      <div class="stat-karte"><span>${s.laengste}</span><small>längste Serie</small></div>
    </div>
    <p class="stat-prognose">Bei aktuellem Tempo (${Math.round(p.quote * 100)} %):
      <strong>≈ ${p.erwartet} von ${p.zielTage} Tagen</strong> mit erreichtem Tagesziel.</p>
    <h3>Quote je Punkt (letzte 30 Tage)</h3>
    <div class="quote-liste">
      ${quoten.map((q) => `
        <div class="quote-zeile">
          <span class="quote-label">${q.label}</span>
          <span class="quote-bar"><i style="width:${Math.round(q.quote * 100)}%"></i></span>
          <span class="quote-zahl">${q.faelligeTage ? Math.round(q.quote * 100) + ' %' : '—'}</span>
        </div>`).join('')}
    </div>
    <h3>Kalender</h3>
    <div class="hm-kopf">
      <button id="hm-zurueck">‹</button>
      <span id="hm-titel"></span>
      <button id="hm-vor">›</button>
    </div>
    <div id="hm-grid" class="hm-grid"></div>`;

  let jahr = +d.slice(0, 4);
  let monat = +d.slice(5, 7);

  function zeichneHeatmap() {
    container.querySelector('#hm-titel').textContent = `${MONATE[monat - 1]} ${jahr}`;
    const tage = heatmapDaten(jahr, monat, items, logs);
    const ersterWt = ((new Date(Date.UTC(jahr, monat - 1, 1)).getUTCDay() + 6) % 7);
    const grid = container.querySelector('#hm-grid');
    grid.innerHTML = '';
    for (let i = 0; i < ersterWt; i += 1) grid.appendChild(document.createElement('span'));
    for (const t of tage) {
      const zelle = document.createElement('span');
      zelle.className = 'hm-zelle';
      zelle.style.background = STATUS_FARBE[t.status];
      zelle.title = `${t.datum}: ${t.status}`;
      zelle.textContent = +t.datum.slice(8, 10);
      grid.appendChild(zelle);
    }
    const jetztJahr = +d.slice(0, 4);
    const jetztMonat = +d.slice(5, 7);
    container.querySelector('#hm-vor').disabled =
      (jahr === jetztJahr && monat === jetztMonat);
  }
  container.querySelector('#hm-zurueck').addEventListener('click', () => {
    monat -= 1; if (monat === 0) { monat = 12; jahr -= 1; } zeichneHeatmap();
  });
  container.querySelector('#hm-vor').addEventListener('click', () => {
    monat += 1; if (monat === 13) { monat = 1; jahr += 1; } zeichneHeatmap();
  });
  zeichneHeatmap();
}
```

- [ ] **Schritt 2: `app.css` – Statistik-Stile**

```css
:root { --hm-gruen: #3fae5a; --hm-gelb: #e0b73a; --hm-rot: #d1544a; }
.stat-karten { display: flex; gap: 12px; margin-bottom: 14px; }
.stat-karte { flex: 1; background: var(--karte); border: 1px solid var(--rand);
  border-radius: 12px; padding: 14px; text-align: center; }
.stat-karte span { display: block; font-size: 1.8rem; font-weight: 700; }
.stat-karte small { color: var(--gedaempft); }
.stat-prognose { background: var(--karte); border: 1px solid var(--rand);
  border-radius: 12px; padding: 12px; }
.quote-zeile { display: grid; grid-template-columns: 1fr 90px 46px; align-items: center;
  gap: 8px; padding: 6px 0; font-size: .9rem; }
.quote-bar { background: var(--rand); border-radius: 5px; height: 10px; overflow: hidden; }
.quote-bar i { display: block; height: 100%; background: var(--akzent); }
.quote-zahl { text-align: right; color: var(--gedaempft); }
.hm-kopf { display: flex; justify-content: space-between; align-items: center; margin: 8px 0; }
.hm-kopf button { background: transparent; border: 1px solid var(--rand);
  color: var(--text); padding: 6px 12px; }
.hm-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.hm-grid span { aspect-ratio: 1; }
.hm-zelle { border-radius: 6px; display: grid; place-content: center;
  font-size: .75rem; color: #0b0d10; }
```

- [ ] **Schritt 3: Testdaten anlegen + prüfen (per MCP)**

Damit die Statistik nicht leer ist, ein paar Tage `daily_log` rückwirkend füllen
(MCP `execute_sql`, `user_id` explizit). Beispiel: die letzten 10 Tage für alle
täglichen Ernährungs-Punkte „erledigt", 2 Tage bewusst auslassen:

```sql
insert into public.daily_log (user_id, datum, item_id, erledigt)
select 'df0b24a6-6a74-4830-995c-84015161dcc3', g.datum, ci.id, true
from generate_series(current_date - 9, current_date - 1, interval '1 day') as g(datum)
cross join public.checklist_items ci
where ci.user_id = 'df0b24a6-6a74-4830-995c-84015161dcc3'
  and ci.kategorie = 'ernaehrung' and ci.plan_typ = 'taeglich'
  and g.datum not in (current_date - 4, current_date - 6)
on conflict (user_id, datum, item_id) do nothing;
```

Danach im Statistik-Tab prüfen:
- Streak „aktuell" = 3 (die Tage nach der letzten Lücke), „längste" plausibel.
- Prognose-Satz zeigt eine Zahl.
- Quote-Balken: tägliche Ernährungs-Punkte ~80 %, Supplemente 0 %.
- Heatmap: grüne Tage, 2 rote/gelbe Lücken, „›" am aktuellen Monat deaktiviert,
  „‹" blättert in den Vormonat (grau).

Nach dem Test die Testzeilen wieder entfernen:
```sql
delete from public.daily_log
where user_id = 'df0b24a6-6a74-4830-995c-84015161dcc3'
  and datum < current_date - 1;
```
*(Alternativ mit Mark absprechen, ob die Testdaten bleiben dürfen. Standard:
löschen, damit die echte Historie sauber beginnt.)*

- [ ] **Schritt 4: Commit**

```bash
git add js/module/ernaehrung/statistik.js app.css
git commit -m "feat: Statistik – Streak, Prognose, Quote-Balken, Kalender-Heatmap"
```

**Deliverable:** Alle vier Statistiken sichtbar und mit Testdaten verifiziert.

---

## Task 15: Infos-Ansicht

**Files:**
- Modify: `js/module/ernaehrung/infos.js`
- Modify: `app.css`

**Interfaces:**
- Consumes: `zustand.settings.infos_markdown`.
- Produces: `zeigeInfos(container, zustand)` – rendert den Markdown-Text als
  HTML (nur `##`-Überschriften, `-`-Listen, `**fett**`, Absätze, blanke Links).
  Nur lesen.

- [ ] **Schritt 1: `infos.js` implementieren**

```js
// Sehr kleiner Markdown-Renderer – reicht für den Infos-Text.
function escape(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
function inline(s) {
  return escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
}
function mdZuHtml(md) {
  const zeilen = (md || '').split('\n');
  const out = [];
  let inListe = false;
  const listeZu = () => { if (inListe) { out.push('</ul>'); inListe = false; } };
  for (const z of zeilen) {
    if (/^##\s+/.test(z)) { listeZu(); out.push(`<h3>${inline(z.replace(/^##\s+/, ''))}</h3>`); }
    else if (/^-\s+/.test(z)) {
      if (!inListe) { out.push('<ul>'); inListe = true; }
      out.push(`<li>${inline(z.replace(/^-\s+/, ''))}</li>`);
    } else if (z.trim() === '') { listeZu(); }
    else { listeZu(); out.push(`<p>${inline(z)}</p>`); }
  }
  listeZu();
  return out.join('\n');
}

export async function zeigeInfos(container, zustand) {
  const md = zustand.settings.infos_markdown;
  container.innerHTML = md
    ? `<div class="infos-text">${mdZuHtml(md)}</div>`
    : '<p class="lade">Keine Infos hinterlegt.</p>';
}
```

- [ ] **Schritt 2: `app.css` – Infos-Stile**

```css
.infos-text h3 { font-size: 1rem; margin: 18px 0 6px; }
.infos-text ul { margin: 6px 0; padding-left: 20px; }
.infos-text a { color: var(--akzent); word-break: break-all; }
```

- [ ] **Schritt 3: Manueller Test**

Infos-Tab öffnen → vier Abschnitte (Bluttest, Bezugsquellen, Rotation,
Erkenntnisse), Links klickbar, keine rohen `**`/`##` sichtbar.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/ernaehrung/infos.js app.css
git commit -m "feat: Infos-Tab – Referenz-Text aus settings (read-only)"
```

**Deliverable:** Referenz-Infos in der App lesbar.

---

## Task 16: Abschluss – Doku, End-to-End-Test, Deploy

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:** keine.

- [ ] **Schritt 1: Volltest lokal**

`npm test` → alle Suiten grün (Etappe 0 + `router`, `zeitplan`, `berechnung`).
`python -m http.server 8000`, kompletter Durchlauf aus der Spec Abschnitt 8
(Punkte 1–7).

- [ ] **Schritt 2: Deployen**

```bash
git push origin main
```
Danach `https://mkunau-ctrl.github.io/mein-dashboard/` öffnen (nach ~1 Min
Pages-Build). Auf **iPhone-Safari** öffnen: Login, Modul, Heute abhaken,
Gewicht, Statistik, Infos. „Zum Home-Bildschirm" weiter ok.

- [ ] **Schritt 3: DoD-Test Claude ↔ Supabase**

Über MCP `execute_sql` einen heutigen Eintrag setzen (z. B. „4 Eier erledigt"):
```sql
insert into public.daily_log (user_id, datum, item_id, erledigt)
select 'df0b24a6-6a74-4830-995c-84015161dcc3', current_date, id, true
from public.checklist_items
where user_id = 'df0b24a6-6a74-4830-995c-84015161dcc3' and label = '4 Eier'
on conflict (user_id, datum, item_id) do update set erledigt = true;
```
In der App „⟳ Aktualisieren" → Häkchen bei „4 Eier" ist gesetzt, Ring steigt.

- [ ] **Schritt 4: Testdaten aufräumen**

Falls in Task 14 Testzeilen angelegt und noch da: löschen (SQL siehe Task 14),
oder mit Mark klären. Der DoD-Eintrag aus Schritt 3 darf bleiben.

- [ ] **Schritt 5: `docs/PROJEKT-LOG.md`** – neuer Abschnitt **oben**
  (unter der „Ideen für später"-Sektion, vor dem ersten `##`-Datumseintrag):
  Was (Modul Ernährung komplett: 4 Tabellen + RLS, Heute/Liste/Gewicht/
  Statistik/Infos, 14 Startpunkte aus dem PDF), Warum, Entscheidungen
  (Statistik im Browser, Heatmap als CSS-Grid, nur Haken-Typ, Zeitplan pro
  Punkt inkl. Intervall-seit-letztem-Abhaken), Stand danach (live, Tests grün,
  Claude-Insert getestet), Offene Punkte (echte PNG-Icons weiterhin offen;
  Auto-Weiter von Mark abgelehnt 2026-09-09; Realtime später; Etappe 2 To-dos
  als Nächstes).

- [ ] **Schritt 6: `CLAUDE.md`** aktualisieren:
  - „Aufbau": `js/module/ernaehrung/` mit den Dateien ergänzen.
  - „Starten/Testen": Testdateien-Liste erweitern, Tests-Zahl aktualisieren.
  - Neuer Abschnitt „Modul Ernährung": Tabellen + wichtigste Spalten, wie
    Claude einen Tageseintrag setzt (SQL-Schnipsel aus Schritt 3), Hinweis
    Wochentage 1=Mo…7=So, Intervall = Abstand seit letztem Abhaken.

- [ ] **Schritt 7: `README.md`** – Status auf „Etappe 1 (Ernährung) fertig und
  live. Etappe 2 (To-dos) als Nächstes."

- [ ] **Schritt 8: Commit + Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md README.md
git commit -m "docs: Etappe 1 (Modul Ernährung) abgeschlossen"
git push origin main
```

**Deliverable:** Modul live, Doku aktuell, DoD erfüllt.

---

## Selbst-Review (gegen die Spec)

**Spec-Abdeckung:**
- 4 Tabellen + RLS → Task 1. ✅
- Startbefüllung 14 Punkte + Gewicht + 3 Settings → Task 2. ✅
  *(Hinweis: 14 `checklist_items` – im PDF sind es 14 abhakbare Punkte
  [10 Ernährung inkl. Fleisch & Leber + 4 Supplemente]; die Spec sagt „15
  Punkte", das war eine Fehlzählung. 14 ist korrekt.)*
- „Fällig heute"-Logik (taeglich/wochentage/intervall-seit-letztem) → Task 4. ✅
- Tagesstatus + Streak + Quote + Prognose + Heatmap → Task 5–8. ✅
- Modulordner-Struktur → Task 9–10, 11–15. ✅
- Router `unterseite` → Task 3. ✅
- `app.js` Detail-Routing → Task 10. ✅
- `index.html` Container, Chart.js → Task 10 (Container), Task 13 (Chart.js-Import). ✅
- Heute/Liste/Gewicht/Statistik/Infos → Task 11/12/13/14/15. ✅
- BMI + Ziel-Linie → Task 13. ✅
- Infos read-only aus settings → Task 15. ✅
- Testen (TDD reine Funktionen + manueller Ablauf) → Task 3–8 (TDD), Task
  11–15 (manuell), Task 16 (E2E). ✅
- DoD Claude↔Supabase → Task 16 Schritt 3. ✅
- Doku + Deploy → Task 16. ✅

**Platzhalter-Scan:** kein „TBD"/„TODO". Chart.js-Version ist bewusst in
Task 13 Schritt 1 zu prüfen/pinnen (wie supabase-js in Etappe 0), kein
Code-Platzhalter. `@4.4.6` als konkreter, funktionierender Default.

**Typ-Konsistenz:**
- `parseHash` → `{ modul, unterseite }` in Task 3 definiert, in Task 10 so
  genutzt.
- `istFaellig(item, datumStr, kontext)` in Task 4 definiert, in Task 5/7/11
  identisch aufgerufen (Intervall stets mit `{ letzteErledigung }`).
- `zeigeHeute/zeigeListe/zeigeGewicht/zeigeStatistik/zeigeInfos(container,
  zustand, aktualisieren)` – einheitliche Signatur, in Task 10 per
  dynamischem Import erwartet, in Task 11–15 so exportiert.
- `daten.js`-Funktionsnamen (`ladeAlles`, `ladeLogSeit`, `setzeLogEintrag`,
  `speichereItem`, `deaktiviereItem`, `setzeGewicht`, `setzeSetting`) in Task 9
  definiert, in Task 10–15 identisch importiert.
- `berechnung.js`-Exporte (`heute`, `tageImZeitraum`, `letzteErledigungVor`,
  `tagesStatus`, `streak`, `quoteProPunkt`, `prognose`, `heatmapDaten`) in
  Task 5–8 definiert, in Task 11/13/14 identisch genutzt.

**Offene Abhängigkeit:** Task 1/2/14/16 nutzen den Supabase-MCP mit
Admin-Rechten (RLS wird dabei umgangen) – `user_id` immer explizit
`df0b24a6-6a74-4830-995c-84015161dcc3`. Falls der Classifier `apply_migration`
oder `execute_sql` blockt: SQL an Mark zum Ausführen im Supabase SQL Editor
geben.
