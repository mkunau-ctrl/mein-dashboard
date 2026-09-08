# Etappe 0 – Grundgerüst: Implementierungsplan

> **Für agentische Worker:** ERFORDERLICHER SUB-SKILL: `superpowers:subagent-driven-development`
> (empfohlen) oder `superpowers:executing-plans`, um diesen Plan Aufgabe für
> Aufgabe umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Nachverfolgen.

**Ziel:** Mark kann sich per Magic-Link einloggen und sieht ein leeres
Kachel-Raster – live erreichbar über GitHub Pages.

**Architektur:** Reine statische Web-App ohne Build. `index.html` lädt ES-Module
aus `js/`. Reine Logik (Routing, Modul-Registry, View-Entscheidung) liegt in
kleinen, einzeln testbaren Modulen; Supabase-Aufrufe sind in dünnen Wrappern
gekapselt. Tests laufen mit Node (`node:test`, keine Abhängigkeiten).

**Tech-Stack:** HTML5, CSS, ES-Module (Browser-nativ), `@supabase/supabase-js@2`
per esm.sh-CDN, GitHub Pages, `node:test` für Unit-Tests.

**Spec:** `docs/specs/2026-09-08-dashboard-konzept.md`

## Global Constraints

- **Kein Build-Schritt, kein Bundler.** Nur Dateien, die der Browser direkt lädt.
- **Kein npm-Dependency im Auslieferungscode.** `package.json` nur für Test-Skript
  (`"test": "node --test"`), keine `dependencies`/`devDependencies`.
- **Externe Libs nur per CDN** mit fester Version: `@supabase/supabase-js@2`.
- **Anon-Key darf im Quelltext stehen.** Service-Role-Key / Secrets **niemals**.
- **Alle Supabase-Tabellen** (ab Etappe 1) haben `user_id uuid` mit RLS-Policy
  `user_id = auth.uid()`.
- **Sprache:** UI-Texte, Kommentare, Commits, Doku auf Deutsch.
- **Zielbrowser:** aktuelles Safari (iOS) + Desktop-Chrome/Firefox. Kein IE, kein
  Offline-Betrieb.
- **Deploy-URL:** `https://mkunau-ctrl.github.io/mein-dashboard/`
- Commits klein und häufig, deutsche Commit-Nachrichten.

---

## Dateistruktur nach Etappe 0

| Datei | Verantwortung |
|---|---|
| `index.html` | Einziges HTML. `<head>` (meta, manifest, CSS-Link), Login-Bereich, Dashboard-Bereich mit leerem `#kachel-raster`, `<script type="module" src="js/app.js">`. |
| `app.css` | Gesamtes Design: Farb-Tokens (hell/dunkel), Layout, Login-Formular, Kachel-Raster-Grid. |
| `js/supabase.js` | Erzeugt und exportiert den konfigurierten Supabase-Client (Projekt-URL + Anon-Key als Konstanten). Kein weiterer Code. |
| `js/router.js` | `parseHash(hash)` – reine Funktion, wandelt `#/ernaehrung` → `{ modul: 'ernaehrung' }`, leer/`#/` → `{ modul: null }`. |
| `js/registry.js` | Modul-Registry: `registriere(modul)`, `alleModule()`, `holeModul(id)`. Reine In-Memory-Verwaltung. |
| `js/view.js` | `entscheideAnsicht(session)` – reine Funktion: `null` → `'login'`, sonst `'dashboard'`. |
| `js/auth.js` | Dünne Wrapper um `supabase.auth`: `sendeMagicLink(email)`, `holeSession()`, `meldeAb()`, `beiAuthWechsel(callback)`. |
| `js/app.js` | Einstiegspunkt: verdrahtet `auth` + `view` + `router` + `registry`, zeigt Login oder Dashboard, rendert (in Etappe 0 leeres) Kachel-Raster. |
| `js/module/README.md` | Beschreibt die Modul-Schnittstelle für spätere Etappen (siehe Task 6). |
| `test/router.test.js` | Tests für `parseHash`. |
| `test/registry.test.js` | Tests für die Registry. |
| `test/view.test.js` | Tests für `entscheideAnsicht`. |
| `package.json` | Nur `"scripts": { "test": "node --test" }`. |
| `.nojekyll` | Leere Datei – verhindert Jekyll-Verarbeitung auf GitHub Pages (sonst werden `js/`-Ordner-Dateien teils ignoriert). |
| `manifest.webmanifest` | PWA: Name, Farben, Icon-Verweise, `display: standalone`. |
| `icon.svg` | Einfaches Logo/Favicon (farbiges Quadrat mit „D"). Apple-Touch-PNG folgt als Politur-Schritt in Etappe 1. |

---

## Task 1: Supabase-Projekt anlegen und Auth einrichten

**Dateien:**
- Modify: `CLAUDE.md` (Abschnitt „Konventionen": Projekt-Ref + Auth-URLs eintragen)

**Interfaces:**
- Produces: Projekt-URL `https://<ref>.supabase.co` und Anon-Key – werden in
  Task 3 in `js/supabase.js` fest eingetragen. `USER_ID` (Marks Auth-UID) –
  wird in `CLAUDE.md` hinterlegt, sobald Mark sich das erste Mal eingeloggt hat.

**Hinweis:** Free-Tier erlaubt 2 aktive Projekte; aktuell ist nur `tipptrainer`
aktiv. Ein neues Projekt `mein-dashboard` ist also möglich und bleibt aktiv,
weil es täglich genutzt wird.

- [ ] **Schritt 1: Projekt anlegen (mit Mark bestätigen)**

Mark bestätigen lassen: „Neues Supabase-Projekt `mein-dashboard` in deiner Org
anlegen (Free-Tier, Region `eu-central-1`)?" – dann über Supabase-MCP
`create_project` (Org `nwdaxvfnifwrbcivqcjw`, Name `mein-dashboard`,
Region `eu-central-1`). Falls Kostenbestätigung nötig: `get_cost` +
`confirm_cost` durchlaufen und Mark den Betrag nennen (Free-Tier: 0 $).

- [ ] **Schritt 2: Projekt-Referenz und Anon-Key notieren**

Nach dem Anlegen: `get_project_url` und `get_publishable_keys` (bzw.
`get_anon_key`) abrufen. Beide Werte in eine Notiz für Task 3 schreiben.

- [ ] **Schritt 3: E-Mail-Auth konfigurieren**

Im Supabase-Projekt (per MCP `execute_sql` gegen `auth`-Settings ist nicht
möglich – daher Dashboard-Weg dokumentieren, Mark klickt):
- Authentication → Providers → **Email**: aktiviert lassen, „Confirm email" an.
- Authentication → URL Configuration:
  - **Site URL:** `https://mkunau-ctrl.github.io/mein-dashboard/`
  - **Redirect URLs (Additional):** `http://localhost:8000/` und
    `http://localhost:8000/index.html`
- Authentication → Email Templates → „Magic Link": Standard reicht.

Falls Magic-Link-Mails im Free-Tier zu langsam/limitiert sind: als offenen
Punkt ins Log; SMTP-Anbindung ist ein späterer Schritt.

- [ ] **Schritt 4: `CLAUDE.md` aktualisieren**

Im Abschnitt „Konventionen / Fallstricke" eintragen:
```
- Supabase-Projekt: mein-dashboard, Ref `<ref>`, URL `https://<ref>.supabase.co`
- Anon-Key steht in js/supabase.js (öffentlich, ok).
- Auth: Magic-Link an m.kunau@gmx.de. Site-URL + Redirect-URLs siehe
  docs/superpowers/plans/2026-09-08-etappe-0-grundgeruest.md Task 1.
- USER_ID (Marks Auth-UID) = <noch offen, nach erstem Login eintragen>
```

- [ ] **Schritt 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: Supabase-Projekt mein-dashboard + Auth-Konfiguration dokumentiert"
```

**Deliverable:** Supabase-Projekt existiert, E-Mail-Auth konfiguriert, Zugangsdaten
in `CLAUDE.md`. Manuell prüfbar: Projekt im Supabase-Dashboard sichtbar, Status
„Active Healthy".

---

## Task 2: Test-Harness einrichten

**Dateien:**
- Create: `package.json`
- Create: `js/router.js`
- Create: `test/router.test.js`

**Interfaces:**
- Produces: `parseHash(hash: string) => { modul: string | null }` aus `js/router.js`.
  Konsumiert von `js/app.js` (Task 5).

- [ ] **Schritt 1: `package.json` anlegen**

```json
{
  "name": "mein-dashboard",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Schritt 2: Fehlschlagenden Test schreiben**

`test/router.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../js/router.js';

test('leerer Hash -> kein Modul', () => {
  assert.deepEqual(parseHash(''), { modul: null });
  assert.deepEqual(parseHash('#/'), { modul: null });
});

test('Modul-Hash wird erkannt', () => {
  assert.deepEqual(parseHash('#/ernaehrung'), { modul: 'ernaehrung' });
});

test('unbekannte Formen -> kein Modul', () => {
  assert.deepEqual(parseHash('#quatsch'), { modul: null });
  assert.deepEqual(parseHash('#/ernaehrung/extra'), { modul: 'ernaehrung' });
});
```

- [ ] **Schritt 3: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL – `Cannot find module '../js/router.js'`.

- [ ] **Schritt 4: Minimale Implementierung**

`js/router.js`:
```js
// Wandelt den URL-Hash in ein Routing-Ergebnis um.
// '#/ernaehrung' -> { modul: 'ernaehrung' }; alles andere -> { modul: null }.
export function parseHash(hash) {
  const m = /^#\/([a-z-]+)/.exec(hash || '');
  return { modul: m ? m[1] : null };
}
```

- [ ] **Schritt 5: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS (3 Tests).

- [ ] **Schritt 6: Commit**

```bash
git add package.json js/router.js test/router.test.js
git commit -m "test: Node-Test-Harness + Router (parseHash)"
```

**Deliverable:** `npm test` läuft grün, Router-Modul fertig.

---

## Task 3: Supabase-Client + Auth-Wrapper

**Dateien:**
- Create: `js/supabase.js`
- Create: `js/auth.js`
- Create: `js/view.js`
- Create: `test/view.test.js`

**Interfaces:**
- Consumes: Projekt-URL + Anon-Key aus Task 1.
- Produces:
  - `js/supabase.js`: `export const supabase` (Supabase-Client-Instanz).
  - `js/auth.js`:
    - `sendeMagicLink(email: string) => Promise<{ ok: boolean, fehler?: string }>`
    - `holeSession() => Promise<Session | null>`
    - `meldeAb() => Promise<void>`
    - `beiAuthWechsel(callback: (session: Session | null) => void) => void`
  - `js/view.js`: `entscheideAnsicht(session: Session | null) => 'login' | 'dashboard'`

- [ ] **Schritt 1: Fehlschlagenden Test für `entscheideAnsicht` schreiben**

`test/view.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entscheideAnsicht } from '../js/view.js';

test('ohne Session -> login', () => {
  assert.equal(entscheideAnsicht(null), 'login');
  assert.equal(entscheideAnsicht(undefined), 'login');
});

test('mit Session -> dashboard', () => {
  assert.equal(entscheideAnsicht({ user: { id: 'abc' } }), 'dashboard');
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL – `Cannot find module '../js/view.js'`.

- [ ] **Schritt 3: `js/view.js` implementieren**

```js
// Reine Entscheidung: welche Grundansicht zeigt die App?
export function entscheideAnsicht(session) {
  return session && session.user ? 'dashboard' : 'login';
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS.

- [ ] **Schritt 5: `js/supabase.js` schreiben**

Werte aus Task 1 einsetzen:
```js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://<ref>.supabase.co';        // Task 1
const SUPABASE_ANON_KEY = '<anon-key>';                   // Task 1, öffentlich ok

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
```

- [ ] **Schritt 6: `js/auth.js` schreiben**

```js
import { supabase } from './supabase.js';

const REDIRECT_URL = `${location.origin}${location.pathname}`;

export async function sendeMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: REDIRECT_URL },
  });
  if (error) return { ok: false, fehler: error.message };
  return { ok: true };
}

export async function holeSession() {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function meldeAb() {
  await supabase.auth.signOut();
}

export function beiAuthWechsel(callback) {
  supabase.auth.onAuthStateChange((_event, session) => callback(session ?? null));
}
```

- [ ] **Schritt 7: Alle Tests ausführen**

Run: `npm test`
Erwartet: PASS (Router + View). `auth.js`/`supabase.js` werden nicht von Tests
importiert (Netz/Browser-abhängig) – das ist gewollt.

- [ ] **Schritt 8: Commit**

```bash
git add js/supabase.js js/auth.js js/view.js test/view.test.js
git commit -m "feat: Supabase-Client, Auth-Wrapper, View-Entscheidung"
```

**Deliverable:** Auth-Bausteine vorhanden, `entscheideAnsicht` getestet.

---

## Task 4: Modul-Registry

**Dateien:**
- Create: `js/registry.js`
- Create: `test/registry.test.js`

**Interfaces:**
- Produces aus `js/registry.js`:
  - `registriere(modul: { id: string, titel: string, init?: Function, renderKachel?: Function })`
  - `alleModule() => Modul[]` (in Registrierungsreihenfolge)
  - `holeModul(id: string) => Modul | undefined`
  - `leereRegistry()` (nur für Tests)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/registry.test.js`:
```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registriere, alleModule, holeModul, leereRegistry } from '../js/registry.js';

beforeEach(() => leereRegistry());

test('registriertes Modul ist auffindbar', () => {
  registriere({ id: 'ernaehrung', titel: 'Ernährung' });
  assert.equal(holeModul('ernaehrung').titel, 'Ernährung');
  assert.equal(alleModule().length, 1);
});

test('Reihenfolge bleibt erhalten', () => {
  registriere({ id: 'a', titel: 'A' });
  registriere({ id: 'b', titel: 'B' });
  assert.deepEqual(alleModule().map((m) => m.id), ['a', 'b']);
});

test('doppelte id überschreibt nicht, sondern wirft', () => {
  registriere({ id: 'a', titel: 'A' });
  assert.throws(() => registriere({ id: 'a', titel: 'A2' }));
});
```

- [ ] **Schritt 2: Test ausführen, Fehlschlag prüfen**

Run: `npm test`
Erwartet: FAIL – Modul fehlt.

- [ ] **Schritt 3: Implementierung**

`js/registry.js`:
```js
const module = [];

export function registriere(modul) {
  if (!modul || !modul.id) throw new Error('Modul braucht eine id');
  if (module.some((m) => m.id === modul.id)) {
    throw new Error(`Modul "${modul.id}" ist bereits registriert`);
  }
  module.push(modul);
}

export function alleModule() {
  return [...module];
}

export function holeModul(id) {
  return module.find((m) => m.id === id);
}

export function leereRegistry() {
  module.length = 0;
}
```

- [ ] **Schritt 4: Test ausführen, Erfolg prüfen**

Run: `npm test`
Erwartet: PASS (alle Suiten).

- [ ] **Schritt 5: Commit**

```bash
git add js/registry.js test/registry.test.js
git commit -m "feat: Modul-Registry mit Tests"
```

**Deliverable:** Registry fertig und getestet.

---

## Task 5: HTML-Shell, Design und App-Verdrahtung

**Dateien:**
- Create: `index.html`
- Create: `app.css`
- Create: `js/app.js`
- Create: `.nojekyll`

**Interfaces:**
- Consumes: `parseHash` (Task 2), `entscheideAnsicht` (Task 3), `holeSession` /
  `sendeMagicLink` / `meldeAb` / `beiAuthWechsel` (Task 3), `alleModule` (Task 4).
- Produces: eine funktionierende Seite mit Login und leerem Dashboard.

- [ ] **Schritt 1: `index.html` schreiben**

```html
<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Mein Dashboard</title>
  <link rel="icon" href="icon.svg" />
  <link rel="manifest" href="manifest.webmanifest" />
  <meta name="theme-color" content="#111418" />
  <link rel="stylesheet" href="app.css" />
</head>
<body>
  <main id="app">
    <!-- Login -->
    <section id="login-ansicht" hidden>
      <h1>Mein Dashboard</h1>
      <p>Melde dich mit deiner E-Mail an. Du bekommst einen Login-Link geschickt.</p>
      <form id="login-form">
        <input type="email" id="email" required autocomplete="email"
               placeholder="m.kunau@gmx.de" />
        <button type="submit">Login-Link senden</button>
      </form>
      <p id="login-hinweis" role="status"></p>
    </section>

    <!-- Dashboard -->
    <section id="dashboard-ansicht" hidden>
      <header>
        <h1>Mein Dashboard</h1>
        <button id="logout">Abmelden</button>
      </header>
      <div id="kachel-raster"></div>
      <p id="dashboard-leer-hinweis">Noch keine Module. Kommt in den nächsten Etappen.</p>
    </section>
  </main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Schritt 2: `.nojekyll` anlegen**

```bash
touch .nojekyll
```

- [ ] **Schritt 3: `app.css` schreiben**

Dunkles, ruhiges Design mit Farb-Tokens und Hell-Fallback. Kachel-Raster als
responsives Grid (auch wenn in Etappe 0 leer).
```css
:root {
  color-scheme: light dark;
  --bg: #f4f5f7; --karte: #ffffff; --text: #1a1d21; --gedaempft: #5b6470;
  --akzent: #2f6feb; --rand: #e2e5ea;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0f1216; --karte: #171b21; --text: #e8eaed; --gedaempft: #9aa4b2;
          --akzent: #4f8cff; --rand: #262b33; }
}
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif;
       background: var(--bg); color: var(--text);
       padding: max(16px, env(safe-area-inset-top)) 16px 32px; }
#app { max-width: 720px; margin: 0 auto; }
h1 { font-size: 1.4rem; }
#login-ansicht { margin-top: 15vh; text-align: center; }
#login-form { display: flex; flex-direction: column; gap: 12px; max-width: 320px; margin: 24px auto; }
input, button { font: inherit; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--rand); }
input { background: var(--karte); color: var(--text); }
button { background: var(--akzent); color: #fff; border: none; cursor: pointer; }
button:disabled { opacity: .6; cursor: default; }
#login-hinweis { min-height: 1.5em; color: var(--gedaempft); }
#dashboard-ansicht header { display: flex; justify-content: space-between; align-items: center; }
#dashboard-ansicht header button { background: transparent; color: var(--gedaempft);
       border: 1px solid var(--rand); }
#kachel-raster { display: grid; gap: 14px; margin-top: 20px;
       grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
#dashboard-leer-hinweis { color: var(--gedaempft); margin-top: 24px; }
#kachel-raster:not(:empty) + #dashboard-leer-hinweis { display: none; }
```

- [ ] **Schritt 4: `js/app.js` schreiben**

```js
import { parseHash } from './router.js';
import { entscheideAnsicht } from './view.js';
import { holeSession, sendeMagicLink, meldeAb, beiAuthWechsel } from './auth.js';
import { alleModule } from './registry.js';

const loginAnsicht = document.getElementById('login-ansicht');
const dashboardAnsicht = document.getElementById('dashboard-ansicht');
const loginForm = document.getElementById('login-form');
const emailFeld = document.getElementById('email');
const loginHinweis = document.getElementById('login-hinweis');
const kachelRaster = document.getElementById('kachel-raster');

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

async function aktualisiere() {
  const session = await holeSession();
  zeige(entscheideAnsicht(session));
  if (session) rendereKacheln();
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
  aktualisiere();
});

beiAuthWechsel(() => aktualisiere());
window.addEventListener('hashchange', () => { void parseHash(location.hash); });

aktualisiere();
```

*(Der `hashchange`-Handler nutzt `parseHash` in Etappe 0 nur, um es zu verdrahten;
Modul-Routing folgt in Etappe 1.)*

- [ ] **Schritt 5: Lokal testen**

Run: `python -m http.server 8000` im Repo-Wurzel, dann
`http://localhost:8000` öffnen.
Erwartet:
- Login-Formular sichtbar.
- E-Mail eingeben, „Login-Link senden" → Hinweis „Link ist unterwegs".
- Magic-Link aus der Mail öffnen → zurück auf die Seite, jetzt leeres Dashboard
  mit „Abmelden" und Hinweis „Noch keine Module".
- „Abmelden" → zurück zum Login.

- [ ] **Schritt 6: `USER_ID` in `CLAUDE.md` eintragen**

Nach dem ersten erfolgreichen Login: in der Browser-Konsole
`(await window).` – einfacher: über Supabase-MCP `execute_sql`
`select id, email from auth.users;` → Marks UID in `CLAUDE.md` (Task 1, Schritt 4)
beim Platzhalter `USER_ID` eintragen.

- [ ] **Schritt 7: Commit**

```bash
git add index.html app.css js/app.js .nojekyll CLAUDE.md
git commit -m "feat: HTML-Shell, Design, Login-Flow und leeres Kachel-Raster"
```

**Deliverable:** Lokal lauffähige App: Login per Magic-Link, leeres Dashboard,
Logout.

---

## Task 6: PWA-Manifest, Modul-Doku, GitHub-Pages-Deploy

**Dateien:**
- Create: `manifest.webmanifest`
- Create: `icon.svg`
- Create: `js/module/README.md`
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:** keine (Abschluss-Task).

- [ ] **Schritt 1: `icon.svg` anlegen**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2f6feb"/>
  <text x="32" y="44" font-family="system-ui, sans-serif" font-size="38"
        font-weight="700" text-anchor="middle" fill="#fff">D</text>
</svg>
```

- [ ] **Schritt 2: `manifest.webmanifest` anlegen**

```json
{
  "name": "Mein Dashboard",
  "short_name": "Dashboard",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#0f1216",
  "theme_color": "#111418",
  "icons": [
    { "src": "icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

*(Offener Punkt fürs Log: echte PNG-Icons 192/512 + `apple-touch-icon` in
Etappe 1 nachliefern – iOS nutzt für den Home-Bildschirm sonst einen Screenshot.)*

- [ ] **Schritt 3: `js/module/README.md` schreiben**

```markdown
# Modul-Schnittstelle

Jedes Modul ist eine ES-Modul-Datei in `js/module/` und registriert sich beim
Import über `registriere({...})` aus `../registry.js`.

Ein Modul-Objekt:
- `id` (string, eindeutig, kleinbuchstaben, z. B. `"ernaehrung"`)
- `titel` (string, Anzeigename der Kachel)
- `renderKachel(kachelEl)` – optional: befüllt die Kachel mit dem Tagesstand
- `init(containerEl, supabase)` – optional: rendert die Detailansicht des Moduls

Aktivierung: Import-Zeile in `js/app.js` ergänzen (z. B.
`import './module/ernaehrung.js';`). Der Rest der App bleibt unangetastet.
```

- [ ] **Schritt 4: GitHub Pages aktivieren**

```bash
gh api -X POST repos/mkunau-ctrl/mein-dashboard/pages \
  -f 'source[branch]=main' -f 'source[path]=/' 2>&1 || \
gh api -X PUT repos/mkunau-ctrl/mein-dashboard/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```
Falls der Classifier den Befehl blockt: Mark führt ihn mit `!` aus, oder
aktiviert Pages im Repo unter Settings → Pages → Source „Deploy from a branch",
Branch `main` / `/root`.

- [ ] **Schritt 5: Committen und pushen**

```bash
git add manifest.webmanifest icon.svg js/module/README.md
git commit -m "feat: PWA-Manifest, Icon, Modul-Schnittstellen-Doku"
git push
```
(Push ggf. durch Mark mit `!git push`.)

- [ ] **Schritt 6: Deploy prüfen**

`https://mkunau-ctrl.github.io/mein-dashboard/` im Browser (Desktop + iPhone)
öffnen. Erwartet: Login-Screen lädt, Magic-Link-Login funktioniert end-to-end,
danach leeres Dashboard. Auf dem iPhone „Zum Home-Bildschirm" testen.

- [ ] **Schritt 7: Doku abschließen**

- `docs/PROJEKT-LOG.md`: neuer Abschnitt oben – Was (Etappe 0 fertig), Warum,
  Entscheidungen (node:test statt Framework, esm.sh-CDN, GitHub Pages),
  Stand danach (URL live, Login geht), Offene Punkte (PNG-Icons, evtl. SMTP,
  Realtime, die 3 noch nicht verschobenen Projektordner betreffen dieses
  Projekt nicht).
- `CLAUDE.md`: Abschnitt „Aufbau" mit den jetzt existierenden Dateien füllen,
  „Starten/Testen" bestätigen (`npm test`, `python -m http.server 8000`),
  Deploy-URL eintragen.
- `README.md`: Status auf „Etappe 0 fertig, Etappe 1 (Ernährung) als Nächstes".

- [ ] **Schritt 8: Commit**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md README.md
git commit -m "docs: Etappe 0 abgeschlossen – Stand, Aufbau, offene Punkte"
git push
```

**Deliverable:** `https://mkunau-ctrl.github.io/mein-dashboard/` ist live,
Login funktioniert end-to-end, Doku aktuell.

---

## Selbst-Review (gegen die Spec)

**Spec-Abdeckung:**
- Kachel-Raster-Startseite → Task 5 (leeres Raster) + Task 4 (Registry, die es füllt). ✅
- Hosting GitHub Pages, öffentliches Repo → Task 6. ✅
- Supabase als Datenspeicher, eine DB → Task 1 (Projekt); Tabellen erst Etappe 1 (bewusst). ✅
- Magic-Link-Login → Task 1 (Konfig) + Task 3 (Wrapper) + Task 5 (UI). ✅
- RLS `user_id = auth.uid()` → Global Constraints notiert; greift ab Etappe 1 mit den ersten Tabellen. ✅
- Kein Framework, kein Build → Global Constraints + Task 2 (nur Test-Skript). ✅
- `supabase-js` + Chart.js per CDN → supabase-js in Task 3; Chart.js erst Etappe 1 (dort gebraucht). ✅
- PWA-Manifest + Icon → Task 6. ✅
- Modul-Schnittstelle `init` / `renderKachel` → Task 4 (Objektform) + Task 6 (README). ✅
- Claude ↔ Supabase getestet → Task 5 Schritt 6 (UID per MCP-`execute_sql` auslesen = erster MCP-Schreib-/Lesezugriff auf das Projekt); voller Insert-Test folgt mit echten Tabellen in Etappe 1.

**Platzhalter-Scan:** Keine „TBD"/„TODO" in Schritten. `<ref>` / `<anon-key>` /
`<noch offen>` sind bewusste, in Task 1 zu befüllende Werte, kein Code-Platzhalter.

**Typ-Konsistenz:** `parseHash` → `{ modul }` überall gleich. `entscheideAnsicht`
→ `'login'|'dashboard'` in Task 3 definiert, in Task 5 (`js/app.js`) so genutzt.
Registry-Funktionsnamen (`registriere`, `alleModule`, `holeModul`, `leereRegistry`)
in Task 4 definiert und in Task 5 (`alleModule`) identisch verwendet.
Auth-Funktionsnamen in Task 3 definiert, in Task 5 identisch importiert.

**Offene Abhängigkeit:** Task 1 Schritt 3 (Auth-URL-Konfiguration) braucht einen
manuellen Klick von Mark im Supabase-Dashboard – im Plan als solcher markiert.
