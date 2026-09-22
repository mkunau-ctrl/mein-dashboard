# Etappe 4, Sub-Etappe S: Design-/Performance-Verfeinerung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nutzer-Vorgabe (bestätigt für diese Session, siehe Sub-Etappe R):
> immer nur 4 Tasks bauen, dann stoppen und auf Freigabe warten**,
> bevor der nächste Block startet. Batches: **1-4**, dann stoppen;
> **5-8**, dann stoppen; **9-12**, dann stoppen; **13** (Doku), dann
> stoppen (Ende).

**Goal:** Die in der Spec beschriebene Design-/Performance-Runde
umsetzen: gefühlte Geschwindigkeit (Service Worker + Stale-while-
revalidate), sanfte Übergänge, neutrales Schwarz/Weiß-Farbschema,
struktureller Header-Fix, individuelle Icons/Status-Punkte, und die
Finanzen-Übersicht-Neustruktur.

**Architecture:** Reine Bestandsarbeit an bestehenden Dateien plus ein
neuer Service Worker (`sw.js`). Kein neues Datenmodell außer der
Erweiterung bestehender `berechnung.js`-Dateien um reine, testbare
Icon-Heuristik- und Kreisdiagramm-Funktionen.

**Tech Stack:** Vanilla JS/ESM, `node:test`, kein Framework, kein
Chart-Framework (Kreisdiagramm als handgebautes SVG).

**Spec:** `docs/superpowers/specs/2026-09-22-etappe-4-sub-s-design-perf-verfeinerung-design.md`

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`/reine Logik-Dateien bekommen `node:test`-Tests.
- Datumsspalten dürfen unescaped in innerHTML (etablierte Regel), Freitext
  immer mit der lokalen `esc()`-Funktion escapen.
- Direkt auf `main`, kein Feature-Branch. Nach jeder Task
  `git push origin main`.
- Explizit NICHT umsetzen: Wisch-Geste zum Zurücknavigieren (vom Nutzer
  verworfen).
- Bei Task 6.4 (Einstellungen) und Rechnungen: keine Struktur-Änderung,
  nur die allgemeine visuelle Politur aus Tasks 6/7 wirkt sich dort
  automatisch aus (gemeinsame CSS-Klassen).

---

### Task 1: Service Worker fürs App-Gerüst

**Files:**
- Create: `sw.js`
- Modify: `js/app.js`

**Interfaces:** keine (kein JS-Modul, Service Worker läuft in eigenem
Scope).

- [ ] **Schritt 1: `sw.js` im Repo-Wurzelverzeichnis erstellen**

`APP_SHELL` listet bewusst nur die wenigen kritischen Dateien fürs
allererste Laden explizit auf (`install`-Event) — die vielen
`js/module/**/*.js`-Dateien einzeln zu pflegen wäre fragil (neue
Dateien würden sonst vergessen). Stattdessen übernimmt der
`fetch`-Handler (Cache-first, danach Netz + Cache-Eintrag) das
Zwischenspeichern jeder JS-Datei automatisch beim ersten Aufruf —
nach dem ersten vollständigen App-Durchlauf sind dadurch alle
tatsächlich genutzten Module im Cache, ganz ohne manuelle Liste.

```js
const CACHE_NAME = 'mein-dashboard-v1';
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './manifest.webmanifest',
  './icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((namen) =>
      Promise.all(namen.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // Supabase/CDN unangetastet lassen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((treffer) => {
      if (treffer) return treffer;
      return fetch(event.request).then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, kopie));
        return antwort;
      });
    })
  );
});
```

- [ ] **Schritt 2: Registrierung in `js/app.js` ergänzen**

Ganz am Ende der Datei (nach `route();`) ergänzen:

```js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Registrierung fehlgeschlagen (z.B. alter Browser) - kein Blocker, App läuft ohne Cache weiter.
    });
  });
}
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check sw.js && node --check js/app.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (107, unverändert — reine
Infrastruktur, keine Logik-Datei betroffen).

- [ ] **Schritt 4: Manuell prüfen**

Lokalen Server starten (`python -m http.server 8000`), App im Browser
öffnen, DevTools → Application → Service Workers: Service Worker sollte
als "activated and running" erscheinen. Netzwerk-Tab bei einem
Seiten-Reload prüfen: `app.css`/`index.html` sollten (nach dem ersten
Laden) aus dem Service-Worker-Cache kommen ("(ServiceWorker)" als
Quelle statt Netzwerk-Zeit).

- [ ] **Schritt 5: Commit**

```bash
git add sw.js js/app.js
git commit -m "feat: Service Worker fuers App-Geruest (Cache-first fuer statische Dateien)"
git push origin main
```

---

### Task 2: Stale-while-revalidate für alle Module mit Datenladung

**Files:**
- Modify: `js/module/home/index.js`
- Modify: `js/module/finanzen/index.js`
- Modify: `js/module/todos/index.js`
- Modify: `js/module/ernaehrung/index.js`
- Modify: `js/module/sendungen/index.js`
- Modify: `js/module/berichtsheft/index.js`
- Modify: `js/module/suche/index.js`

**Interfaces:** keine neuen Exporte, nur `init()`-Verhalten pro Modul
geändert.

**Wichtiger Befund vor dem Umsetzen (Korrektur zur Spec-Beschreibung,
per Code-Lesen verifiziert):** Fünf der sieben Module
(`finanzen`, `todos`, `ernaehrung`, `sendungen`, `berichtsheft`) haben
bereits ein `if (!zustand) await ladeZustand();` — sie laden also nur
**einmal pro Session**, nicht bei jedem Wechsel neu. Das ist aber auch
nicht ideal: einmal geladene Daten werden dort nie mehr aktualisiert,
solange die Seite nicht neu geladen wird (Stale-Bug). Nur `home` und
`suche` laden tatsächlich bei **jedem** Besuch neu (das ist die
sichtbare Verzögerung). Diese Task behebt **beide** Probleme
gleichzeitig mit demselben Muster: alte Daten sofort anzeigen (falls
vorhanden), im Hintergrund immer neu laden, still aktualisieren.

- [ ] **Schritt 1: `js/module/home/index.js` — `init` anpassen**

Aktueller Code (Zeilen 147-152):
```js
  async init(container) {
    containerRef = container;
    await ladeZustand();
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuelleAnsicht();
  },
```
Neuer Code:
```js
  async init(container) {
    containerRef = container;
    window.addEventListener('hashchange', beiHashwechsel);
    if (zustand) await zeigeAktuelleAnsicht();
    await ladeZustand();
    if (containerRef === container && containerRef.isConnected) await zeigeAktuelleAnsicht();
  },
```

- [ ] **Schritt 2: `js/module/finanzen/index.js` — `init` anpassen**

Aktueller Code (in `registriere({...})`):
```js
  async init(container) {
    containerRef = container;
    if (!zustand) await ladeZustand();
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    await zeigeAktuellenTab();
  },
```
Neuer Code:
```js
  async init(container) {
    containerRef = container;
    baueRahmen(container);
    window.addEventListener('hashchange', beiHashwechsel);
    if (zustand) await zeigeAktuellenTab();
    await ladeZustand();
    if (containerRef === container && containerRef.isConnected) await zeigeAktuellenTab();
  },
```

- [ ] **Schritt 3: dieselbe Änderung in den übrigen vier Modulen**

`js/module/todos/index.js`, `js/module/ernaehrung/index.js`,
`js/module/sendungen/index.js`, `js/module/berichtsheft/index.js`
haben alle exakt dieselbe `init`-Struktur wie Finanzen (Schritt 2) —
dieselbe Transformation anwenden: `if (!zustand) await ladeZustand();`
vor `baueRahmen(container)` entfernen, stattdessen nach dem
`hashchange`-Listener `if (zustand) await zeigeAktuellenTab();` und am
Ende `await ladeZustand();` + den
`if (containerRef === container && containerRef.isConnected) await zeigeAktuellenTab();`-Block
ergänzen — identisch zu Schritt 2, nur in der jeweiligen Datei.

- [ ] **Schritt 4: `js/module/suche/index.js` — größerer Umbau (kein
      `baueRahmen`, alles inline in `init`)**

Aktuell rendert `init()` direkt inline und blockiert auf
`await ladeZustand()`, bevor überhaupt die (größtenteils
zustandsunabhängige) Oberfläche erscheint. Datei komplett wie folgt
ersetzen (Zeilen 47-131, ab `let zustand = null;` bis zum Dateiende):

```js
let zustand = null;
let containerRef = null;

async function ladeZustand() {
  zustand = await ladeAlles();
}

function render(container) {
  container.innerHTML = `
    <div class="searchbar" style="margin:16px 0;">
      ${SUCHE_ICON}
      <input id="suche-eingabe" type="search" placeholder="Ausgaben, To-dos, Sendungen, Termine …">
    </div>
    <div id="suche-treffer" class="punkt-liste" hidden></div>
    <div id="suche-standard">
      <div class="section-head"><h2>Schnelleinstiege</h2></div>
      <div class="punkt-liste" id="suche-schnell"></div>
      <div class="section-head"><h2>Letzte Suchen</h2></div>
      <div class="punkt-liste" id="suche-letzte">
        ${ladeLetzteSuchen().length === 0 ? '<p class="lade">Noch keine Suchen.</p>' : ''}
      </div>
    </div>`;

  const schnellBox = container.querySelector('#suche-schnell');
  SCHNELLEINSTIEGE.forEach((item) => {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `<div class="icon-badge">${item.icon}</div>
      <div class="punkt-info"><strong>${esc(item.label)}</strong></div>
      <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>`;
    zeile.addEventListener('click', () => {
      if (item.ziel) location.hash = item.ziel;
      else alert('Noch nicht verfügbar.');
    });
    schnellBox.appendChild(zeile);
  });

  const letzteBox = container.querySelector('#suche-letzte');
  ladeLetzteSuchen().forEach((text) => {
    const zeile = document.createElement('div');
    zeile.className = 'punkt-zeile';
    zeile.style.cursor = 'pointer';
    zeile.innerHTML = `<div class="icon-badge">${SUCHE_ICON}</div><div class="punkt-info"><strong>${esc(text)}</strong></div>`;
    zeile.addEventListener('click', () => { eingabe.value = text; eingabe.dispatchEvent(new Event('input')); });
    letzteBox.appendChild(zeile);
  });

  const eingabe = container.querySelector('#suche-eingabe');
  const trefferListe = container.querySelector('#suche-treffer');
  const standardBox = container.querySelector('#suche-standard');
  let letzteSucheGespeichert = '';

  eingabe.addEventListener('input', () => {
    const wert = eingabe.value;
    if (!wert.trim()) {
      trefferListe.hidden = true;
      standardBox.hidden = false;
      return;
    }
    standardBox.hidden = true;
    trefferListe.hidden = false;
    const treffer = sucheAlles(zustand, wert);
    trefferListe.innerHTML = treffer.length === 0
      ? '<p class="lade">Keine Treffer.</p>'
      : treffer.map((t) => `
        <div class="punkt-zeile" data-ziel="${esc(t.ziel)}" style="cursor:pointer;">
          <div class="icon-badge">${TYP_ICON[t.typ] || SUCHE_ICON}</div>
          <div class="punkt-info"><strong>${esc(t.titel)}</strong><small>${esc(t.info)}</small></div>
          <span style="color:var(--gedaempft);">${CHEVRON_ICON}</span>
        </div>`).join('');
    trefferListe.querySelectorAll('[data-ziel]').forEach((zeile) => {
      zeile.addEventListener('click', () => { location.hash = zeile.dataset.ziel; });
    });
    if (wert !== letzteSucheGespeichert) {
      letzteSucheGespeichert = wert;
      speichereLetzteSuche(wert);
    }
  });
}

registriere({
  id: 'suche',
  titel: 'Suche',
  icon: SUCHE_ICON,
  async init(container) {
    containerRef = container;
    render(container); // sofort anzeigen, sucheAlles() liest zustand erst beim Tippen
    ladeZustand(); // bewusst nicht awaited: laeuft im Hintergrund, zustand ist spaetestens beim ersten Tastendruck da
  },
});
```

(Der `esc`/`ladeLetzteSuchen`/`speichereLetzteSuche`/Icon-Konstanten-
Teil am Dateianfang bleibt unverändert — nur der Abschnitt ab `let
zustand = null;` wird ersetzt.)

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/home/index.js && node --check js/module/finanzen/index.js && node --check js/module/todos/index.js && node --check js/module/ernaehrung/index.js && node --check js/module/sendungen/index.js && node --check js/module/berichtsheft/index.js && node --check js/module/suche/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Manuell prüfen**

Im Browser: Home öffnen, zu Finanzen wechseln, zurück zu Home —
Home sollte sofort mit den zuletzt gesehenen Zahlen erscheinen (kein
Leerzustand), nicht erst nach einem sichtbaren Ruckler. Suche öffnen:
Schnelleinstiege/Letzte-Suchen erscheinen sofort, eine Sucheingabe
kurz danach liefert trotzdem korrekte Treffer.

- [ ] **Schritt 7: Commit**

```bash
git add js/module/home/index.js js/module/finanzen/index.js js/module/todos/index.js js/module/ernaehrung/index.js js/module/sendungen/index.js js/module/berichtsheft/index.js js/module/suche/index.js
git commit -m "feat: Stale-while-revalidate beim Modul-Wechsel (alte Daten sofort, Aktualisierung im Hintergrund)"
git push origin main
```

---

### Task 3: Generalisierte Einblend-Animation

**Files:**
- Modify: `app.css`
- Modify: `js/app.js`
- Modify: `js/module/finanzen/index.js`

**Interfaces:** keine.

- [ ] **Schritt 1: `app.css` — `.tab-wechsel` durch generische
      `.einblenden`-Klasse ersetzen**

Aktuelle Regel (aus Sub-Etappe R):
```css
@keyframes tab-inhalt-einblenden { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
#tab-inhalt.tab-wechsel { animation: tab-inhalt-einblenden .18s ease; }
```
Ersetzen durch:
```css
@keyframes inhalt-einblenden { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.einblenden { animation: inhalt-einblenden .18s ease; }
```

- [ ] **Schritt 2: `js/module/finanzen/index.js` — Klassenname
      anpassen**

In `zeigeAktuellenTab()`:
```js
  inhalt.classList.remove('tab-wechsel');
```
zu
```js
  inhalt.classList.remove('einblenden');
```
und
```js
    void inhalt.offsetWidth;
    inhalt.classList.add('tab-wechsel');
```
zu
```js
    void inhalt.offsetWidth;
    inhalt.classList.add('einblenden');
```

- [ ] **Schritt 3: `js/app.js` — Animation auf Modul-Wechsel anwenden**

In `oeffneModul()`:
```js
  if (aktivesModulId !== modul.id) {
    aktivesModulId = modul.id;
    modulDetail.innerHTML = '';
    try {
      await modul.init(modulDetail);
    } catch (e) {
      aktivesModulId = null;
      modulDetail.innerHTML = `<p class="lade">Fehler beim Laden: ${e.message}</p>`;
    }
  }
```
zu
```js
  if (aktivesModulId !== modul.id) {
    aktivesModulId = modul.id;
    modulDetail.innerHTML = '';
    try {
      await modul.init(modulDetail);
      modulDetail.classList.remove('einblenden');
      void modulDetail.offsetWidth;
      modulDetail.classList.add('einblenden');
    } catch (e) {
      aktivesModulId = null;
      modulDetail.innerHTML = `<p class="lade">Fehler beim Laden: ${e.message}</p>`;
    }
  }
```

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/app.js && node --check js/module/finanzen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 5: Manuell prüfen**

Zwischen Home/Finanzen/Ausbildung/Suche/Profil wechseln — jeder Wechsel
sollte sichtbar sanft einblenden statt abrupt zu erscheinen.

- [ ] **Schritt 6: Commit**

```bash
git add app.css js/app.js js/module/finanzen/index.js
git commit -m "feat: sanfte Einblend-Animation bei jedem Modul-Wechsel (nicht nur Finanzen-Tabs)"
git push origin main
```

---

### Task 4: Farbschema — weg von Blau

**Files:**
- Modify: `app.css`

**Interfaces:** keine.

- [ ] **Schritt 1: `--akzent`-Definition in allen drei Theme-Blöcken
      ändern**

In `:root` (Zeile 4, dunkles Theme als Default):
Von `--akzent: #0A84FF;` zu `--akzent: #ffffff;`

In `@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) {`
(Zeile 16):
Von `--akzent: #0A84FF;` zu `--akzent: #14161A;`

In `:root[data-theme="light"] {` (Zeile 28):
Von `--akzent: #0A84FF;` zu `--akzent: #14161A;`

- [ ] **Schritt 2: Basis-Button-Stil auf invertierte Pille umstellen**

In `app.css`, Zeile 50:
Von:
```css
button { background: var(--akzent); color: #fff; border: none; cursor: pointer; }
```
Zu:
```css
button { background: var(--akzent); color: var(--bg); border: none; cursor: pointer; }
```

(`color: #fff` war für Blau okay, funktioniert aber im hellen Theme
mit dunklem `--akzent` nicht mehr — `var(--bg)` ist im dunklen Theme
Schwarz-auf-Weiß, im hellen Theme automatisch Weiß-auf-Schwarz,
korrekt invertiert in beiden Fällen.)

- [ ] **Schritt 3: Statische Prüfung**

Run: `npm test`
Expected: weiterhin alle Tests grün (reine CSS-Änderung).

- [ ] **Schritt 4: Manuell prüfen**

Login-Screen: "Login-Link senden"-Button sollte jetzt schwarz (dunkles
Theme) bzw. dunkel (helles Theme) statt blau sein, Text gut lesbar.
Ausbildungsfortschritt-Ring (`.fortschritt-ring`, nutzt
`var(--akzent)` fürs `conic-gradient`) sollte ebenfalls nicht mehr
blau sein. Aktive Tab-Pillen (`.tab-leiste button.aktiv`,
`.range.aktiv`) waren schon vorher schwarz/weiß — unverändert.

- [ ] **Schritt 5: Commit**

```bash
git add app.css
git commit -m "feat: Akzentfarbe von Blau auf neutrales Schwarz/Weiss umgestellt"
git push origin main
```

**Nach diesem Commit: STOPPEN.** Tasks 5-8 erst nach expliziter
Nutzer-Freigabe für den nächsten 4er-Block beginnen.

---

### Task 5: Neuladen-Button wandert in den globalen Header

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `js/module/finanzen/index.js`
- Modify: `js/module/todos/index.js`
- Modify: `js/module/ernaehrung/index.js`
- Modify: `js/module/sendungen/index.js`
- Modify: `js/module/berichtsheft/index.js`
- Modify: `app.css`

**Interfaces:**
- Produziert: optionales `aktualisieren()`-Feld auf registrierten
  Modul-Objekten (kein Registry-Code-Änderung nötig — `registriere()`
  übernimmt beliebige zusätzliche Felder unverändert).

- [ ] **Schritt 1: `index.html` — Button ergänzen**

Von:
```html
        <div class="kopf-aktionen">
          <button id="theme-toggle-dashboard" type="button" class="theme-toggle" title="Hell/Dunkel wechseln"></button>
        </div>
```
Zu:
```html
        <div class="kopf-aktionen">
          <button id="neu-laden-global" type="button" title="Aktualisieren">⟳</button>
          <button id="theme-toggle-dashboard" type="button" class="theme-toggle" title="Hell/Dunkel wechseln"></button>
        </div>
```

- [ ] **Schritt 2: `js/app.js` — Klick-Handler ergänzen**

Nach der Zeile `let aktivesModulId = null;` bleibt unverändert, aber
nach dem bestehenden Theme-Knöpfe-Block (nach
`aktualisiereThemeUI(wendeThemeAn());`) ergänzen:

```js
document.getElementById('neu-laden-global').addEventListener('click', async (e) => {
  const knopf = e.currentTarget;
  const modul = aktivesModulId ? holeModul(aktivesModulId) : null;
  if (!modul || typeof modul.aktualisieren !== 'function') return;
  knopf.disabled = true;
  try { await modul.aktualisieren(); }
  finally { knopf.disabled = false; }
});
```

- [ ] **Schritt 3: `js/module/finanzen/index.js` — `.modul-kopf`-Zeile
      entfernen, `aktualisieren` ergänzen**

Von (aktueller Stand nach Sub-Etappe R):
```js
function baueRahmen(container) {
  container.innerHTML = `
    <header class="modul-kopf">
      <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
    </header>
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelector('.neu-laden')
    .addEventListener('click', async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    });
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/finanzen/${b.dataset.tab}`; });
  });
}
```
Zu:
```js
function baueRahmen(container) {
  container.innerHTML = `
    <nav class="tab-leiste">
      ${TABS.map(([id, txt]) => `<button data-tab="${id}" type="button">${txt}</button>`).join('')}
    </nav>
    <div id="tab-inhalt"></div>`;
  container.querySelectorAll('.tab-leiste button').forEach((b) => {
    b.addEventListener('click', () => { location.hash = `#/finanzen/${b.dataset.tab}`; });
  });
}
```
Im `registriere({...})`-Block, nach `async init(container) { ... },`
ergänzen:
```js
  async aktualisieren() {
    await ladeZustand();
    await zeigeAktuellenTab();
  },
```

- [ ] **Schritt 4: dieselbe Änderung in den übrigen vier Modulen**

`js/module/todos/index.js`, `js/module/ernaehrung/index.js`,
`js/module/sendungen/index.js`, `js/module/berichtsheft/index.js`
haben dieselbe `baueRahmen`-Struktur mit `.modul-kopf`/`.neu-laden` —
dieselbe Transformation wie Schritt 3 anwenden (Header-Zeile mit dem
Neuladen-Button raus, `aktualisieren()`-Methode im `registriere`-Block
ergänzen, die intern `ladeZustand()` + `zeigeAktuellenTab()` aufruft —
Funktionsnamen entsprechend der jeweiligen Datei, z. B.
`zeigeAktuellenTab` heißt überall gleich).

- [ ] **Schritt 5: `app.css` anpassen**

Zeile `.modul-kopf .neu-laden { margin-left: auto; }` entfernen (Button
existiert dort nicht mehr). `#dashboard-ansicht header .kopf-aktionen`
hat bereits `display:flex;gap:8px` — passt automatisch für zwei
Buttons.

- [ ] **Schritt 6: Statische Prüfung**

Run: `node --check index.html` — nicht anwendbar (kein JS), stattdessen
manuell auf Syntaxfehler im `<script>`-freien HTML achten (keine
Tags vergessen).

Run: `node --check js/app.js && node --check js/module/finanzen/index.js && node --check js/module/todos/index.js && node --check js/module/ernaehrung/index.js && node --check js/module/sendungen/index.js && node --check js/module/berichtsheft/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 7: Manuell prüfen**

Finanzen öffnen: kein Leerraum mehr zwischen globalem Header und
Tab-Leiste. Auf das neue ⟳ oben rechts klicken: Daten werden neu
geladen (z. B. nach Hinzufügen einer Ausgabe in einem anderen Tab
sichtbar). Auf Profil wechseln (kein `aktualisieren`): Klick auf ⟳
tut nichts, wirft aber keinen Fehler.

- [ ] **Schritt 8: Commit**

```bash
git add index.html js/app.js js/module/finanzen/index.js js/module/todos/index.js js/module/ernaehrung/index.js js/module/sendungen/index.js js/module/berichtsheft/index.js app.css
git commit -m "fix: Neuladen-Button in globalen Header verschoben, Leerraum in Modul-Koepfen entfernt"
git push origin main
```

---

### Task 6: Zurück-Buttons schlanker stylen

**Files:**
- Modify: `app.css`

**Interfaces:** keine.

- [ ] **Schritt 1: `.modul-kopf button`-Regel ersetzen**

Von:
```css
.modul-kopf button { background: transparent; color: var(--gedaempft);
  border: 1px solid var(--rand); padding: 8px 12px; }
```
Zu:
```css
.modul-kopf button { background: none; border: none; color: var(--gedaempft);
  padding: 4px 0; font-weight: 600; cursor: pointer; }
```

(Nach Task 5 gibt es in `.modul-kopf` nur noch echte Zurück-Buttons —
Einstellungen "‹ Profil", Rechnungen "‹ Zurück" — sowie alle
`*-detail.js`-Screens, die ebenfalls `.modul-kopf` nutzen. Diese eine
Regel deckt alle ab.)

- [ ] **Schritt 2: Statische Prüfung**

Run: `npm test`
Expected: weiterhin alle Tests grün (reine CSS-Änderung).

- [ ] **Schritt 3: Manuell prüfen**

Einstellungen öffnen ("‹ Profil"-Button), Rechnungen öffnen
("‹ Zurück"), eine beliebige Detailansicht öffnen (z. B. Sendung
anklicken) — alle Zurück-Buttons sollten jetzt als reiner Text ohne
Rahmen/Hintergrund erscheinen, weiterhin klickbar.

- [ ] **Schritt 4: Commit**

```bash
git add app.css
git commit -m "feat: Zurueck-Buttons schlanker gestylt (kein Rahmen mehr)"
git push origin main
```

---

### Task 7: Einheitlicher Tab-Pillen-Stil ohne grauen Kasten

**Files:**
- Modify: `app.css`

**Interfaces:** keine.

- [ ] **Schritt 1: `.tab-leiste`-Regel anpassen**

Von:
```css
.tab-leiste { display: flex; gap: 6px; overflow-x: auto; margin: 14px 0;
  background: var(--icon-bg); border: none; border-radius: 12px; padding: 4px; }
```
Zu:
```css
.tab-leiste { display: flex; gap: 6px; overflow-x: auto; margin: 14px 0; }
```

(`.tab-leiste button.aktiv` behält ihre bestehende Pillen-Optik
unverändert — `background: var(--pille-bg); box-shadow: var(--schatten);`
— nur der graue Container-Hintergrund um die ganze Leiste verschwindet.)

- [ ] **Schritt 2: Statische Prüfung**

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 3: Manuell prüfen**

Finanzen-Tab-Leiste (Übersicht/Transaktionen/Analyse/…) sollte jetzt
ohne grauen Kasten drumherum erscheinen, nur die aktive Pille selbst
hat noch einen Hintergrund. Gleiches bei Ernährung/Todos/Sendungen/
Ausbildung, die dieselbe `.tab-leiste`-Klasse nutzen.

- [ ] **Schritt 4: Commit**

```bash
git add app.css
git commit -m "feat: Tab-Leiste ohne grauen Container-Hintergrund (nur aktive Pille sichtbar)"
git push origin main
```

---

### Task 8: Sendungen — individuelle Icons + Status als Punkt

**Files:**
- Modify: `js/module/sendungen/berechnung.js`
- Modify: `js/module/sendungen/pakete.js`
- Modify: `js/module/sendungen/sendung-detail.js`
- Modify: `app.css`
- Test: `test/sendungen-berechnung.test.js`

**Interfaces:**
- Produziert: `kategorisiereSendungIcon(text: string): 'handy'|'kopfhoerer'|'kleidung'|'elektronik'|'box'`
  — konsumiert von `pakete.js` und `sendung-detail.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `test/sendungen-berechnung.test.js`, Import-Zeile ergänzen:
```js
import { sortiereSendungen, offeneSendungen, sortiereTermine, naechsterSendungStatus, STATUS_PRIORITAET, istStatusFortschritt, kategorisiereSendungIcon }
  from '../js/module/sendungen/berechnung.js';
```
Am Dateiende ergänzen:
```js
test('kategorisiereSendungIcon: erkennt Handy/Kopfhoerer/Kleidung/Elektronik, sonst Box', () => {
  assert.equal(kategorisiereSendungIcon('iPhone 15 Pro'), 'handy');
  assert.equal(kategorisiereSendungIcon('AirPods Pro'), 'kopfhoerer');
  assert.equal(kategorisiereSendungIcon('T-Shirt'), 'kleidung');
  assert.equal(kategorisiereSendungIcon('Grafikkarte'), 'elektronik');
  assert.equal(kategorisiereSendungIcon('Irgendwas Unbekanntes'), 'box');
  assert.equal(kategorisiereSendungIcon(''), 'box');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `kategorisiereSendungIcon` ist kein Export von
`js/module/sendungen/berechnung.js`.

- [ ] **Schritt 3: Implementieren**

In `js/module/sendungen/berechnung.js` ergänzen:
```js
const SENDUNG_ICON_SCHLUESSELWOERTER = [
  { typ: 'handy', muster: /iphone|handy|smartphone|galaxy|pixel/i },
  { typ: 'kopfhoerer', muster: /airpods|kopfhoerer|kopfhörer|earbuds/i },
  { typ: 'kleidung', muster: /shirt|hose|jacke|schuh|kleidung/i },
  { typ: 'elektronik', muster: /grafikkarte|ram|ssd|prozessor|monitor|tastatur/i },
];

export function kategorisiereSendungIcon(text) {
  if (!text) return 'box';
  for (const { typ, muster } of SENDUNG_ICON_SCHLUESSELWOERTER) {
    if (muster.test(text)) return typ;
  }
  return 'box';
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS (108).

- [ ] **Schritt 5: `pakete.js` — Icons + Status-Punkt umbauen**

Von:
```js
import { setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
```
Zu:
```js
import { setzeSendungStatus, entferneSendung } from './daten.js';
import { sortiereSendungen, naechsterSendungStatus, kategorisiereSendungIcon } from './berechnung.js';

const STATUS_TEXT = { unterwegs: 'unterwegs', abholbereit: 'abholbereit', zugestellt: 'zugestellt', unbekannt: 'unbekannt' };
const STATUS_PUNKT_FARBE = { unterwegs: 'akzent', abholbereit: 'gelb', zugestellt: 'gruen', unbekannt: 'grau' };
const ICON = {
  handy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  kopfhoerer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="2" y="14" width="5" height="7" rx="1.5"/><rect x="17" y="14" width="5" height="7" rx="1.5"/></svg>',
  kleidung: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7l4-4Z"/></svg>',
  elektronik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
};
```
Innerhalb von `zeigePakete`, die Zeilen-Erzeugung von:
```js
    zeile.innerHTML = `
      <div class="icon-badge">${BOX_ICON}</div>
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small>${s.beschreibung ? esc(s.beschreibung) : ''}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <button data-a="status" class="status-badge status-${s.status}">${STATUS_TEXT[s.status]}</button>
      <div class="punkt-aktionen">
        <button data-a="weg">✕</button>
      </div>`;
```
zu:
```js
    zeile.innerHTML = `
      <div class="icon-badge">${ICON[kategorisiereSendungIcon(`${s.haendler} ${s.beschreibung || ''}`)]}</div>
      <div class="punkt-info">
        <strong>${esc(s.haendler)}</strong>
        <small><span class="dot ${STATUS_PUNKT_FARBE[s.status]}"></span> ${STATUS_TEXT[s.status]}${s.trackingnummer ? ` · ${esc(s.trackingnummer)}` : ''}</small>
      </div>
      <div class="punkt-aktionen">
        <button data-a="status" title="Status weiterschalten">${STATUS_TEXT[s.status] === 'zugestellt' ? '' : '›'}</button>
        <button data-a="weg">✕</button>
      </div>`;
```

- [ ] **Schritt 6: `sendung-detail.js` — dieselbe Optik**

Von:
```js
const BOX_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>';
```
Zu (Import statt lokaler Konstante):
```js
import { kategorisiereSendungIcon } from './berechnung.js';

const ICON = {
  handy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  kopfhoerer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="2" y="14" width="5" height="7" rx="1.5"/><rect x="17" y="14" width="5" height="7" rx="1.5"/></svg>',
  kleidung: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7l4-4Z"/></svg>',
  elektronik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>',
};
const STATUS_PUNKT_FARBE = { unterwegs: 'akzent', abholbereit: 'gelb', zugestellt: 'gruen', unbekannt: 'grau' };
```
Und die Zeile
```js
        <span class="status-badge status-${sendung.status}">${esc(sendung.status)}</span></div>
```
zu
```js
        <span class="punkt-info-status"><span class="dot ${STATUS_PUNKT_FARBE[sendung.status]}"></span> ${esc(sendung.status)}</span></div>
```
sowie `${BOX_ICON}` zu
`${ICON[kategorisiereSendungIcon(`${sendung.haendler} ${sendung.beschreibung || ''}`)]}`.

- [ ] **Schritt 7: `app.css` — Farb-Modifikatoren für `.dot` ergänzen**

Nach der bestehenden `.dot { ... }`-Regel (aus Sub-Etappe R) ergänzen:
```css
.dot.akzent { background: var(--akzent); }
.dot.gelb { background: var(--hm-gelb); }
.dot.gruen { background: var(--hm-gruen); }
.dot.grau { background: var(--gedaempft); }
```

- [ ] **Schritt 8: Statische Prüfung**

Run: `node --check js/module/sendungen/pakete.js && node --check js/module/sendungen/sendung-detail.js && node --check js/module/sendungen/berechnung.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (108).

- [ ] **Schritt 9: Manuell prüfen**

Sendungen-Tab öffnen: jede Zeile zeigt jetzt ein zur Bezeichnung
passendes Icon (falls keins passt, weiterhin die Box) und den Status
als kleinen farbigen Punkt statt grauer Pille. Klick auf `›` schaltet
den Status weiter (bisherige Funktion erhalten), Klick auf eine Zeile
öffnet weiterhin die Detailansicht.

- [ ] **Schritt 10: Commit**

```bash
git add js/module/sendungen/berechnung.js js/module/sendungen/pakete.js js/module/sendungen/sendung-detail.js app.css test/sendungen-berechnung.test.js
git commit -m "feat: individuelle Icons und Status-Punkt statt Pille bei Sendungen"
git push origin main
```

**Nach diesem Commit: STOPPEN.** Tasks 9-12 erst nach expliziter
Nutzer-Freigabe für den nächsten 4er-Block beginnen.

---

### Task 9: Transaktionen — individuelle Icons je Händler/Kategorie

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Modify: `js/module/finanzen/transaktionen.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `kategorisiereTransaktionIcon(text: string): 'tanken'|'streaming'|'miete'|'kleidung'|'handy'|'einkauf'|'gehalt'|'sonstiges'`
  — konsumiert von `transaktionen.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `test/finanzen-berechnung.test.js`, Import-Zeile um
`kategorisiereTransaktionIcon` ergänzen, am Dateiende:
```js
test('kategorisiereTransaktionIcon: erkennt Haendler-Schluesselwoerter, sonst sonstiges', () => {
  assert.equal(kategorisiereTransaktionIcon('Tankstelle'), 'tanken');
  assert.equal(kategorisiereTransaktionIcon('Netflix'), 'streaming');
  assert.equal(kategorisiereTransaktionIcon('Miete'), 'miete');
  assert.equal(kategorisiereTransaktionIcon('Kleidung'), 'kleidung');
  assert.equal(kategorisiereTransaktionIcon('Handyvertrag'), 'handy');
  assert.equal(kategorisiereTransaktionIcon('REWE'), 'einkauf');
  assert.equal(kategorisiereTransaktionIcon('Gehaltseingang'), 'gehalt');
  assert.equal(kategorisiereTransaktionIcon('Irgendwas'), 'sonstiges');
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `kategorisiereTransaktionIcon` ist kein Export.

- [ ] **Schritt 3: Implementieren**

In `js/module/finanzen/berechnung.js` ergänzen:
```js
const TRANSAKTION_ICON_SCHLUESSELWOERTER = [
  { typ: 'tanken', muster: /tank|sprit|benzin/i },
  { typ: 'streaming', muster: /netflix|spotify|disney|prime|streaming/i },
  { typ: 'miete', muster: /miete|wohnung/i },
  { typ: 'kleidung', muster: /kleidung|shirt|hose|schuh|zalando/i },
  { typ: 'handy', muster: /handy|mobilfunk|telekom|vodafone|o2/i },
  { typ: 'einkauf', muster: /rewe|edeka|lidl|aldi|supermarkt|einkauf/i },
  { typ: 'gehalt', muster: /gehalt|lohn|nebenjob/i },
];

export function kategorisiereTransaktionIcon(text) {
  if (!text) return 'sonstiges';
  for (const { typ, muster } of TRANSAKTION_ICON_SCHLUESSELWOERTER) {
    if (muster.test(text)) return typ;
  }
  return 'sonstiges';
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `transaktionen.js` — Icon-Zuordnung nutzen**

Von:
```js
import { zeitraumVon, zuCsvZeilen, kategorisiereIconTyp } from './berechnung.js';

const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
```
Zu:
```js
import { zeitraumVon, zuCsvZeilen, kategorisiereIconTyp, kategorisiereTransaktionIcon } from './berechnung.js';

const EINNAHME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
const AUSGABE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M8 8h8M8 12h8"/></svg>';
const TRANSAKTION_ICON = {
  tanken: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V8l6-4h4l6 6v12"/><path d="M3 22h16"/></svg>',
  streaming: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M9 20h6"/></svg>',
  miete: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></svg>',
  kleidung: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7l4-4Z"/></svg>',
  handy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  einkauf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-2 9H8L6 2H2"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>',
  gehalt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
};
```
In `zeichneListe()`, die Zeile
```js
        <div class="icon-badge">${t.typ === 'einnahme' ? EINNAHME_ICON : AUSGABE_ICON}</div>
```
zu:
```js
        <div class="icon-badge">${t.typ === 'einnahme' ? EINNAHME_ICON : (TRANSAKTION_ICON[kategorisiereTransaktionIcon(t.bezeichnung)] || AUSGABE_ICON)}</div>
```

- [ ] **Schritt 6: Statische Prüfung**

Run: `node --check js/module/finanzen/berechnung.js && node --check js/module/finanzen/transaktionen.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 7: Manuell prüfen**

Transaktionen-Tab öffnen: Ausgaben mit erkennbaren Notizen (z. B.
"Tankstelle", "Netflix") zeigen jetzt ein spezifisches Icon,
Einnahmen weiterhin den Einnahme-Pfeil, unbekannte Ausgaben weiterhin
den generischen Beleg.

- [ ] **Schritt 8: Commit**

```bash
git add js/module/finanzen/berechnung.js js/module/finanzen/transaktionen.js test/finanzen-berechnung.test.js
git commit -m "feat: individuelle Icons je Haendler/Kategorie bei Transaktionen"
git push origin main
```

---

### Task 10: Finanzen-Tabs reduzieren, Kontostand/Warenwert getrennt, 7T-Bugfix

**Files:**
- Modify: `js/module/finanzen/index.js`
- Modify: `js/module/finanzen/uebersicht.js`

**Interfaces:**
- Konsumiert: `warenwert` (bereits vorhanden in `berechnung.js`).
- Produziert: keine neuen Exporte.

- [ ] **Schritt 1: `js/module/finanzen/index.js` — `TABS`/`LADER` kürzen**

Von:
```js
const TABS = [
  ['uebersicht', 'Übersicht'], ['transaktionen', 'Transaktionen'], ['analyse', 'Analyse'],
  ['ausgaben', 'Ausgaben'], ['einnahmen', 'Einnahmen'], ['kontostand', 'Kontostand'],
  ['konten', 'Konten'], ['schulden', 'Schulden'],
  ['regelmaessige-ausgaben', 'Regelmäßige Ausgaben'],
  ['teile', 'Teile'], ['bestellen', 'Bestellen'],
];
```
Zu:
```js
const TABS = [
  ['uebersicht', 'Übersicht'], ['transaktionen', 'Transaktionen'], ['analyse', 'Analyse'],
  ['regelmaessige-ausgaben', 'Regelmäßige Ausgaben'],
  ['teile', 'Teile'], ['bestellen', 'Bestellen'],
];
```
Im `LADER`-Objekt die Einträge `ausgaben`, `einnahmen`, `kontostand`,
`konten`, `schulden` entfernen (die Dateien `ausgaben.js`,
`einnahmen.js`, `kontostand.js`, `konten.js`, `schulden.js` bleiben
bestehen — sie werden in Task 12 über Detail-Routen aus der neuen
Übersicht heraus weiter genutzt, nicht gelöscht).

- [ ] **Schritt 2: `js/module/finanzen/uebersicht.js` —
      Kontostand-Karte umbauen**

Von:
```js
  container.innerHTML = `
    <div class="stat-karte gross" id="uebersicht-kontostand" style="cursor:pointer;">
      <small>Kontostand</small>
      <span>${stand.toFixed(2)} €</span>
      <div class="range-row">
        ${RANGES.map(([id, txt]) => `<button type="button" data-range="${id}" class="range${id === zeitraum ? ' aktiv' : ''}">${txt}</button>`).join('')}
      </div>
    </div>
```
Zu:
```js
  const warenwertBetrag = warenwert(zustand.teile);
  container.innerHTML = `
    <div class="stat-karte gross" id="uebersicht-kontostand">
      <div class="kontostand-zweispaltig">
        <div><small>Kontostand</small><span>${stand.toFixed(2)} €</span></div>
        <div><small>Warenwert</small><span>${warenwertBetrag.toFixed(2)} €</span></div>
      </div>
      <div class="range-row">
        ${RANGES.map(([id, txt]) => `<button type="button" data-range="${id}" class="range${id === zeitraum ? ' aktiv' : ''}">${txt}</button>`).join('')}
      </div>
    </div>
```
Import-Zeile am Dateianfang von
```js
import { gesamtKontostand, zeitraumVon, summenProKategorieZeitraum, kategorisiereIconTyp } from './berechnung.js';
```
zu
```js
import { gesamtKontostand, zeitraumVon, summenProKategorieZeitraum, kategorisiereIconTyp, warenwert } from './berechnung.js';
```

- [ ] **Schritt 3: Bugfix — Klick auf Range-Button navigiert nicht
      mehr versehentlich**

Der bestehende Klick-Handler
```js
  container.querySelector('#uebersicht-kontostand').addEventListener('click', () => {
    location.hash = '#/home/kontostand';
  });
```
entfernen (die Karte selbst ist nach dem Umbau nicht mehr komplett
klickbar — Kontostand-Detail bleibt über die neue Konten-Kachel aus
Task 12 erreichbar). Die Range-Buttons behalten ihren bestehenden
Listener:
```js
  container.querySelectorAll('[data-range]').forEach((btn) => {
    btn.addEventListener('click', () => setZeitraum(btn.dataset.range));
  });
```
(unverändert stehen lassen — der Bug war ausschließlich die
Kombination aus klickbarer Elternkarte + fehlendem
`stopPropagation()`; da die Elternkarte jetzt nicht mehr klickbar ist,
ist der Bug behoben, ohne den Range-Handler selbst anfassen zu
müssen.)

- [ ] **Schritt 4: CSS für die zweispaltige Kontostand-Karte**

In `app.css`, nach der `.stat-karte`-Regelgruppe ergänzen:
```css
.kontostand-zweispaltig { display: flex; gap: 24px; }
.kontostand-zweispaltig small { display: block; color: var(--gedaempft); font-size: .8rem; }
.kontostand-zweispaltig span { display: block; font-size: 1.6rem; font-weight: 700; margin-top: 2px; }
```

- [ ] **Schritt 5: Statische Prüfung**

Run: `node --check js/module/finanzen/index.js && node --check js/module/finanzen/uebersicht.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 6: Manuell prüfen**

Finanzen öffnen: nur noch 6 Tabs sichtbar. Übersicht zeigt "Kontostand"
und "Warenwert" als zwei getrennte Zahlen. Klick auf "7T"/"30T"/etc.
ändert den Zeitraum, **ohne** zu Home zu springen (der Bug ist weg).

- [ ] **Schritt 7: Commit**

```bash
git add js/module/finanzen/index.js js/module/finanzen/uebersicht.js app.css
git commit -m "feat: Finanzen-Tabs auf 6 reduziert, Kontostand/Warenwert getrennt, 7T-Navigations-Bug behoben"
git push origin main
```

---

### Task 11: Kreisdiagramm für Ausgaben nach Kategorie

**Files:**
- Modify: `js/module/finanzen/berechnung.js`
- Modify: `js/module/finanzen/uebersicht.js`
- Test: `test/finanzen-berechnung.test.js`

**Interfaces:**
- Produziert: `kreisdiagrammSegmente(kategorien: {kategorie,summe,prozent}[]): {kategorie,prozent,farbe,dashOffset}[]`
  — konsumiert von `uebersicht.js`.

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

In `test/finanzen-berechnung.test.js`, Import um
`kreisdiagrammSegmente` ergänzen, am Dateiende:
```js
test('kreisdiagrammSegmente: weist Farben zu und berechnet kumulierten dashOffset', () => {
  const segmente = kreisdiagrammSegmente([
    { kategorie: 'lebensmittel', summe: 50, prozent: 50 },
    { kategorie: 'tanken', summe: 30, prozent: 30 },
    { kategorie: 'freizeit', summe: 20, prozent: 20 },
  ]);
  assert.equal(segmente.length, 3);
  assert.equal(segmente[0].dashOffset, 0);
  assert.equal(segmente[1].dashOffset, 50);
  assert.equal(segmente[2].dashOffset, 80);
  assert.ok(segmente.every((s) => typeof s.farbe === 'string' && s.farbe.startsWith('var(--')));
});

test('kreisdiagrammSegmente: leere Liste ergibt leeres Array', () => {
  assert.deepEqual(kreisdiagrammSegmente([]), []);
});
```

- [ ] **Schritt 2: Test laufen lassen, Fehlschlag bestätigen**

Run: `npm test`
Expected: FAIL — `kreisdiagrammSegmente` ist kein Export.

- [ ] **Schritt 3: Implementieren**

In `js/module/finanzen/berechnung.js` ergänzen:
```js
const KREISDIAGRAMM_FARBEN = ['var(--hm-rot)', 'var(--hm-gelb)', 'var(--hm-gruen)', 'var(--akzent)', 'var(--gedaempft)'];

export function kreisdiagrammSegmente(kategorien) {
  let kumuliert = 0;
  return kategorien.map((k, i) => {
    const segment = { kategorie: k.kategorie, prozent: k.prozent, farbe: KREISDIAGRAMM_FARBEN[i % KREISDIAGRAMM_FARBEN.length], dashOffset: kumuliert };
    kumuliert += k.prozent;
    return segment;
  });
}
```

- [ ] **Schritt 4: Test laufen lassen, Erfolg bestätigen**

Run: `npm test`
Expected: alle Tests PASS.

- [ ] **Schritt 5: `uebersicht.js` — Kreisdiagramm rendern**

Import-Zeile um `kreisdiagrammSegmente` ergänzen. Nach der
Kontostand-Karte (vor dem bestehenden `<div class="punkt-liste">`-Block
mit Einnahmen/Ausgaben/Differenz) ein neues SVG-Kreisdiagramm
einfügen. In der `container.innerHTML`-Vorlage, direkt nach dem
schließenden `</div>` der Kontostand-Karte, ergänzen:

```js
  const segmente = kreisdiagrammSegmente(kategorien);
```
(vor dem `container.innerHTML =`-Aufruf platzieren, `kategorien` ist
bereits vorhanden aus der bestehenden Zeile
`const kategorien = summenProKategorieZeitraum(...).slice(0, 4);`).

Im Template, nach der Kontostand-Karte einfügen:
```html
    <div class="kreisdiagramm-box">
      <svg viewBox="0 0 36 36" class="kreisdiagramm">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--icon-bg)" stroke-width="4"/>
        ${segmente.map((s) => `<circle cx="18" cy="18" r="15.9" fill="none" stroke="${s.farbe}" stroke-width="4"
          stroke-dasharray="${s.prozent} ${100 - s.prozent}" stroke-dashoffset="${100 - s.dashOffset + 25}"/>`).join('')}
      </svg>
      <div class="kreisdiagramm-legende">
        ${segmente.map((s) => `<div class="kreisdiagramm-legende-zeile"><span class="dot" style="background:${s.farbe};"></span>${esc(s.kategorie)} · ${s.prozent}%</div>`).join('')}
      </div>
    </div>
```

- [ ] **Schritt 6: CSS für das Kreisdiagramm ergänzen**

In `app.css` ergänzen:
```css
.kreisdiagramm-box { display: flex; align-items: center; gap: 20px; margin: 18px 0; }
.kreisdiagramm { width: 96px; height: 96px; flex: none; transform: rotate(-90deg); }
.kreisdiagramm-legende { flex: 1; display: flex; flex-direction: column; gap: 6px; font-size: .82rem; }
.kreisdiagramm-legende-zeile { display: flex; align-items: center; gap: 8px; }
```

- [ ] **Schritt 7: Statische Prüfung**

Run: `node --check js/module/finanzen/berechnung.js && node --check js/module/finanzen/uebersicht.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 8: Manuell prüfen**

Übersicht öffnen: Kreisdiagramm mit farbigen Segmenten + Legende
erscheint zwischen Kontostand-Karte und den folgenden Elementen,
Segmentgrößen entsprechen den Prozentwerten der Kategorien.

- [ ] **Schritt 9: Commit**

```bash
git add js/module/finanzen/berechnung.js js/module/finanzen/uebersicht.js app.css test/finanzen-berechnung.test.js
git commit -m "feat: Kreisdiagramm fuer Ausgaben nach Kategorie in der Finanzen-Uebersicht"
git push origin main
```

---

### Task 12: Drei Kacheln (Einnahmen+Ausgaben/Konten/Schulden) mit Detail-Routen

**Files:**
- Modify: `js/module/finanzen/uebersicht.js`
- Modify: `js/module/finanzen/einnahmen.js`
- Modify: `js/module/finanzen/konten.js`
- Modify: `js/module/finanzen/schulden.js`

**Interfaces:**
- Konsumiert: bestehende `zeigeEinnahmen`/`zeigeKonten`/`zeigeSchulden`
  (Signaturen bleiben, werden nur zusätzlich mit einem `zurueck`-Callback
  versehen, s. u.).

- [ ] **Schritt 1: `uebersicht.js` — drei Kacheln ergänzen + Detail-Weiche**

Signatur ändern von
`export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum) {`
zu
`export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum, detail) {`

Direkt nach der Signaturzeile ergänzen:
```js
  if (detail === 'einnahmen-ausgaben') {
    const { zeigeEinnahmen } = await import('./einnahmen.js');
    container.innerHTML = '<div class="modul-kopf"><button id="ua-zurueck" type="button">‹ Übersicht</button></div>';
    container.querySelector('#ua-zurueck').addEventListener('click', () => { location.hash = '#/finanzen/uebersicht'; });
    const inhalt = document.createElement('div');
    container.appendChild(inhalt);
    await zeigeEinnahmen(inhalt, zustand, aktualisieren);
    return;
  }
  if (detail === 'konten') {
    const { zeigeKonten } = await import('./konten.js');
    container.innerHTML = '<div class="modul-kopf"><button id="ua-zurueck" type="button">‹ Übersicht</button></div>';
    container.querySelector('#ua-zurueck').addEventListener('click', () => { location.hash = '#/finanzen/uebersicht'; });
    const inhalt = document.createElement('div');
    container.appendChild(inhalt);
    await zeigeKonten(inhalt, zustand, aktualisieren);
    return;
  }
  if (detail === 'schulden') {
    const { zeigeSchulden } = await import('./schulden.js');
    container.innerHTML = '<div class="modul-kopf"><button id="ua-zurueck" type="button">‹ Übersicht</button></div>';
    container.querySelector('#ua-zurueck').addEventListener('click', () => { location.hash = '#/finanzen/uebersicht'; });
    const inhalt = document.createElement('div');
    container.appendChild(inhalt);
    await zeigeSchulden(inhalt, zustand, aktualisieren);
    return;
  }
```

Am Ende des Templates (nach dem Kreisdiagramm-Block aus Task 11, vor
dem bestehenden `Einnahmen/Ausgaben/Differenz`-`punkt-liste`-Block,
der unverändert stehen bleibt) die drei Kacheln ergänzen:
```html
    <div class="kachel-grid">
      <div class="kachel" data-ziel="einnahmen-ausgaben">
        <small>Einnahmen &amp; Ausgaben</small>
        <span class="betrag-plus">+${einnahmenSumme.toFixed(2)} €</span>
        <span class="betrag-minus">-${ausgabenSumme.toFixed(2)} €</span>
      </div>
      <div class="kachel" data-ziel="konten">
        <small>Konten</small>
        <span>${zustand.konten.length} Konto${zustand.konten.length === 1 ? '' : 'en'}</span>
      </div>
      <div class="kachel" data-ziel="schulden">
        <small>Schulden</small>
        <span>${offeneSchulden(zustand.schulden, zustand.zahlungen).toFixed(2)} €</span>
      </div>
    </div>
```
(`einnahmenSumme`/`ausgabenSumme` sind bereits im Funktionskörper
verfügbar. `zustand.zahlungen` ist der verifizierte Feldname aus
`js/module/finanzen/daten.js`s `ladeAlles()` — **nicht**
`zustand.schuldenZahlungen`. `offeneSchulden` per Import ergänzen:
Import-Zeile um `offeneSchulden` erweitern.)

Nach dem `container.innerHTML = ...`-Aufruf, bei den bestehenden
Event-Listenern ergänzen:
```js
  container.querySelectorAll('.kachel[data-ziel]').forEach((el) => {
    el.addEventListener('click', () => {
      location.hash = `#/finanzen/uebersicht/${el.dataset.ziel}`;
    });
  });
```

- [ ] **Schritt 2: `einnahmen.js`/`konten.js`/`schulden.js` — verifiziert
      keine Änderung nötig**

Verifiziert (per Codesuche, `grep -n "modul-kopf\|<h2>"` auf allen drei
Dateien lieferte keinen Treffer): keine der drei Dateien hat einen
eigenen `modul-kopf`/`<h2>`-Header — sie rendern direkt ihre Liste/ihr
Formular. Der neue gemeinsame Zurück-Button aus Schritt 1 ist damit die
einzige Kopfzeile, kein doppelter Header zu entfernen. Dieser Schritt
entfällt inhaltlich, nur zur Doku hier vermerkt.

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/uebersicht.js && node --check js/module/finanzen/einnahmen.js && node --check js/module/finanzen/konten.js && node --check js/module/finanzen/schulden.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: CSS für die Kachel-Grid ergänzen**

```css
.kachel-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
.kachel { background: var(--karte); border: 1px solid var(--rand); border-radius: var(--radius);
  padding: 12px; text-align: left; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
.kachel small { color: var(--gedaempft); font-size: .72rem; }
.kachel span { font-weight: 700; font-size: .92rem; }
```

- [ ] **Schritt 5: Manuell prüfen**

Übersicht öffnen: 3 Kacheln unter dem Kreisdiagramm. Klick auf jede
Kachel öffnet die jeweilige Detailansicht mit funktionierendem
"‹ Übersicht"-Zurück-Button; Formulare/Listen (Einnahme anlegen, Konto
anlegen, Schuld/Teilzahlung erfassen) funktionieren weiterhin wie vor
dem Umbau.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/finanzen/uebersicht.js js/module/finanzen/einnahmen.js js/module/finanzen/konten.js js/module/finanzen/schulden.js app.css
git commit -m "feat: drei Kacheln (Einnahmen+Ausgaben/Konten/Schulden) in der Finanzen-Uebersicht statt eigener Tabs"
git push origin main
```

**Nach diesem Commit: STOPPEN.** Task 13 (Dokumentation) erst nach
expliziter Nutzer-Freigabe beginnen.

---

### Task 13: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Was/Entscheidungen/Stand-danach-Muster. Inhalt: alle 13 Tasks
zusammenfassen (Service Worker, Stale-while-revalidate inkl. der
Korrektur zur ursprünglichen Spec-Fehleinschätzung — nur `home`/`suche`
hatten das Blockier-Problem, die anderen fünf Module hatten stattdessen
ein Nie-mehr-Aktualisieren-Problem —, generalisierte Einblend-
Animation, Farbschema-Wechsel, Header-Fix, Zurück-Button-Politur,
Tab-Leisten-Stil, individuelle Icons + Status-Punkte bei Sendungen/
Transaktionen, Finanzen-Übersicht-Neustruktur mit Kreisdiagramm und
drei Kacheln. Explizit vermerken: Wisch-Geste war Teil der Spec-
Diskussion, wurde vom Nutzer verworfen, nicht umgesetzt.

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe S als fertig markieren,
"Reihenfolge ab jetzt" auf "als Nächstes N" umstellen (S war vor N
eingeschoben). `npm test`-Ausgabe tatsächlich ausführen, echte
Testanzahl übernehmen. Im "Aufbau"-Abschnitt (`js/module/finanzen/`)
die neue Übersicht-Struktur (Kreisdiagramm, 3 Kacheln, reduzierte
Tab-Anzahl) sowie den neuen `sw.js` im Wurzelverzeichnis dokumentieren.

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe S (Design-/Performance-Verfeinerung) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Alle 13 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Service Worker registriert, statische Dateien werden aus dem
      Cache geladen.
- [ ] Modul-Wechsel zeigt sofort die zuletzt bekannten Daten, aktualisiert
      danach still im Hintergrund.
- [ ] Modul- und Tab-Wechsel blenden sanft ein, kein Ladebalken.
- [ ] Keine blaue Akzentfarbe mehr, Buttons/aktive Zustände einheitlich
      Schwarz/Weiß.
- [ ] Kein Leerraum mehr über der Tab-Leiste bei Finanzen/Todos/
      Ernährung/Sendungen/Ausbildung, Neuladen-Button sitzt oben im
      globalen Header.
- [ ] Zurück-Buttons ohne Rahmen/Hintergrund.
- [ ] Tab-Leiste ohne grauen Container-Hintergrund.
- [ ] Sendungen und Transaktionen zeigen individuelle Icons, Sendungen
      Status als Punkt statt Pille.
- [ ] Finanzen hat 6 statt 11 Tabs, Übersicht zeigt Kontostand/Warenwert
      getrennt, Kreisdiagramm und drei Kacheln; 7T-Klick löst keine
      Navigation mehr aus.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
