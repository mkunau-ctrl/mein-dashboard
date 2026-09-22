# Etappe 4, Sub-Etappe R: UI-Politur & Diktat-Korrekturen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Nutzer-Vorgabe (2026-09-22): immer nur 4 Tasks bauen, dann stoppen
> und auf Freigabe warten**, bevor der nächste 4er-Block startet. Grund:
> kein Einblick in Nutzungslimit-Verbrauch. Batches: **1-4**, dann
> stoppen; **5-8**, dann stoppen; **9** (Doku), dann stoppen (Ende).

**Goal:** Die sieben in `CLAUDE.md` unter Sub-Etappe R dokumentierten
UI-/Daten-Korrekturen umsetzen: doppelter Modul-Titel weg, redundanter
"‹ Dashboard"-Button weg, Home-Begrüßung statt "Home", Passkey-Button
raus aus dem globalen Header (ist in Einstellungen schon vorhanden),
Theme-Toggle unauffälliger, sanfter Tab-Übergang in Finanzen,
anklickbare Ausgaben-Kategorien mit Filter, Regelmäßige-Ausgaben-
Datenkorrektur.

**Architecture:** Reine Bestandsarbeit an bestehenden Screens, kein
neues Datenmodell außer der bereits vorhandenen `ausgaben_vorlagen`-
Tabelle (aus Sub-Etappe B), die nur befüllt wird. Neue Detail-Datei
`js/module/finanzen/kategorie-detail.js` folgt exakt dem Muster von
`js/module/finanzen/transaktion-detail.js` (Sub-Etappe C).

**Tech Stack:** Vanilla JS/ESM, `node:test`, kein Framework.

**Kontext/Herkunft:** `CLAUDE.md`, Abschnitt "Aktueller Stand", Bullet
R. `docs/PROJEKT-LOG.md`, Einträge 2026-09-22 ("Design-Nacharbeit",
"Weiteres Design-/Daten-Feedback gesammelt"). Bounded-Brainstorming
bereits im Chat gelaufen, kein separates Spec-Dokument (Nutzerpfad:
bounded).

**Wichtige Korrektur gegenüber der ursprünglichen Doku:** Die
"‹ Dashboard"-Zeile wurde dem Nutzer fälschlich als "Safaris eigene
Browser-Chrome, nicht änderbar" erklärt. Beim Vorbereiten dieses Plans
hat sich herausgestellt: `<button class="zurueck">‹ Dashboard</button>`
ist echter Code dieser App (`js/module/*/index.js`), kein
Browser-Element. Task 1 behebt das entsprechend direkt mit.

## Global Constraints

- Kein Framework, kein Build-Schritt, ESM überall, deutsche Texte/Commits.
- Nur `berechnung.js`/reine Logik-Dateien bekommen automatisierte Tests.
- Datumsspalten (`datum`, `erstellt_am` etc.) dürfen unescaped in
  innerHTML — etablierte Regel dieser Session. Freitext (`notiz`,
  `bezeichnung`) immer mit der lokalen `esc()`-Helper-Funktion escapen.
- Direkt auf `main`, kein Feature-Branch. Nach jeder Task
  `git push origin main`.
- CSV-Freitext-Felder (falls neue hinzukommen) immer mit dem
  `csvFeldSicher`-Muster aus `js/module/finanzen/berechnung.js` gegen
  Formel-Injection absichern (hier nicht relevant, kein neuer CSV-Export).

---

### Task 1: Modul-Kopf bereinigen — doppelten Titel + "‹ Dashboard"-Button entfernen

**Files:**
- Modify: `js/module/finanzen/index.js`
- Modify: `js/module/todos/index.js`
- Modify: `js/module/ernaehrung/index.js`
- Modify: `js/module/sendungen/index.js`
- Modify: `js/module/berichtsheft/index.js`
- Modify: `app.css`

**Interfaces:** keine (reine Markup-/Style-Änderung, keine neuen
Exporte, keine geänderten Funktionssignaturen).

Alle fünf Dateien haben aktuell identisch aufgebaute `baueRahmen`/
Render-Funktionen mit diesem Muster (Beispiel `finanzen/index.js`):

```js
container.innerHTML = `
  <header class="modul-kopf">
    <button class="zurueck" type="button">‹ Dashboard</button>
    <h2>Finanzen</h2>
    <button class="neu-laden" type="button" title="Aktualisieren">⟳</button>
  </header>
  <nav class="tab-leiste">
    ...
  </nav>
  <div id="tab-inhalt"></div>`;
container.querySelector('.zurueck')
  .addEventListener('click', () => { location.hash = ''; });
container.querySelector('.neu-laden')
  .addEventListener('click', async () => { ... });
```

- [ ] **Schritt 1: In allen fünf Dateien den `<button class="zurueck">`
      und den `<h2>ModulName</h2>` aus dem `modul-kopf`-Block entfernen**

Neues Muster (Beispiel `finanzen/index.js`, analog für die anderen vier
— jeweils nur den `<h2>`-Text und die Kachel-Titel-Variable pro Datei
beibehalten wie bisher, nur aus dem Markup entfernen):

```js
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
```

Die Zeile `container.querySelector('.zurueck').addEventListener(...)`
komplett entfernen (kein `.zurueck`-Element mehr vorhanden).

Für `todos/index.js`, `ernaehrung/index.js`, `sendungen/index.js`,
`berichtsheft/index.js`: exakt dieselbe Änderung — `<button
class="zurueck">...</button>` und `<h2>...</h2>` aus dem
`modul-kopf`-Block streichen, die zugehörige
`container.querySelector('.zurueck').addEventListener(...)`-Zeile
entfernen, `.neu-laden`-Button und dessen Listener unverändert lassen.

- [ ] **Schritt 2: CSS anpassen, damit der Refresh-Button weiterhin
      rechtsbündig sitzt**

`.modul-kopf h2 { flex: 1; ... }` sorgte bisher dafür, dass der
`.neu-laden`-Button rechts sitzt. Ohne `<h2>` fehlt dieser Abstandhalter
— in `app.css`, direkt nach der bestehenden Regel
`.modul-kopf button { background: transparent; ... }` ergänzen:

```css
.modul-kopf .neu-laden { margin-left: auto; }
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/index.js && node --check js/module/todos/index.js && node --check js/module/ernaehrung/index.js && node --check js/module/sendungen/index.js && node --check js/module/berichtsheft/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün (reine UI-Datei, keine Tests
betroffen).

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/index.js js/module/todos/index.js js/module/ernaehrung/index.js js/module/sendungen/index.js js/module/berichtsheft/index.js app.css
git commit -m "fix: doppelten Modul-Titel und redundanten Dashboard-Button entfernen"
git push origin main
```

---

### Task 2: Doppelten Titel bei Profil und Suche entfernen

**Files:**
- Modify: `js/module/profil/index.js`
- Modify: `js/module/suche/index.js`

**Interfaces:** keine.

Beide Dateien haben aktuell `<header class="modul-kopf"><h2>Profil</h2></header>`
bzw. `<header class="modul-kopf"><h2>Suche</h2></header>` — nach
Entfernen des `<h2>` bleibt der Header leer, deshalb hier den ganzen
`<header class="modul-kopf">...</header>`-Block ersatzlos streichen
(nicht nur den Inhalt leeren).

- [ ] **Schritt 1: `js/module/profil/index.js` Zeile 35 —
      `<header class="modul-kopf"><h2>Profil</h2></header>` komplett
      entfernen.**

- [ ] **Schritt 2: `js/module/suche/index.js` Zeile 60 —
      `<header class="modul-kopf"><h2>Suche</h2></header>` komplett
      entfernen.**

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/profil/index.js && node --check js/module/suche/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/profil/index.js js/module/suche/index.js
git commit -m "fix: doppelten Modul-Titel bei Profil und Suche entfernen"
git push origin main
```

---

### Task 3: Doppelten Titel bei Einstellungen und Rechnungen entfernen

**Files:**
- Modify: `js/module/einstellungen/index.js`
- Modify: `js/module/rechnungen/index.js`

**Interfaces:** keine.

Diese beiden Module werden nicht über die Bottom-Nav erreicht, ihr
Zurück-Button ist deshalb kein redundantes "Dashboard" (wie bei Task 1),
sondern echte, sinnvolle Navigation — **nur den `<h2>`-Titel entfernen,
den Zurück-Button behalten.**

- [ ] **Schritt 1: `js/module/einstellungen/index.js` Zeile 16-19 ändern**

Von:
```js
container.innerHTML = `
  <div class="modul-kopf">
    <button id="ein-zurueck" type="button">‹ Profil</button>
    <h2>Einstellungen</h2>
  </div>`;
```
Zu:
```js
container.innerHTML = `
  <div class="modul-kopf">
    <button id="ein-zurueck" type="button">‹ Profil</button>
  </div>`;
```

- [ ] **Schritt 2: `js/module/rechnungen/index.js` Zeile 98-101 ändern**

Von:
```js
<div class="modul-kopf">
  <button id="rn-zurueck" type="button">‹ Zurück</button>
  <h2>Rechnungen</h2>
</div>
```
Zu:
```js
<div class="modul-kopf">
  <button id="rn-zurueck" type="button">‹ Zurück</button>
</div>
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/einstellungen/index.js && node --check js/module/rechnungen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/einstellungen/index.js js/module/rechnungen/index.js
git commit -m "fix: doppelten Modul-Titel bei Einstellungen und Rechnungen entfernen"
git push origin main
```

---

### Task 4: Home-Begrüßung statt "Home"

**Files:**
- Modify: `js/module/home/index.js`

**Interfaces:** keine neuen Exporte.

Aktuell (Zeile 80): `<header class="modul-kopf"><h2>Home</h2></header>`.
Ersetzen durch eine zeitabhängige Begrüßung + Datum, wie im Prototyp
(`docs/superpowers/specs/2026-09-17-etappe-8-redesign-prototyp.html`).

- [ ] **Schritt 1: Begrüßungs-Helper ergänzen**

Direkt unter der bestehenden `heute()`-Funktion in
`js/module/home/index.js` ergänzen:

```js
function begruessung() {
  const stunde = new Date().getHours();
  if (stunde < 11) return 'Guten Morgen';
  if (stunde < 18) return 'Guten Tag';
  return 'Guten Abend';
}

function heutigesDatum() {
  return new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
```

- [ ] **Schritt 2: Render-Block ersetzen**

Von:
```js
container.innerHTML = `
  <header class="modul-kopf"><h2>Home</h2></header>
  <div class="stat-karte gross" id="home-kontostand" style="cursor:pointer;">
```
Zu:
```js
container.innerHTML = `
  <div class="home-begruessung">
    <p class="greeting">${begruessung()},</p>
    <h1>Mark</h1>
    <p class="date">${heutigesDatum()}</p>
  </div>
  <div class="stat-karte gross" id="home-kontostand" style="cursor:pointer;">
```

- [ ] **Schritt 3: CSS ergänzen**

In `app.css`, nach der `.punkt-formular`-Regelgruppe ergänzen:

```css
.home-begruessung { margin-bottom: 16px; }
.home-begruessung .greeting { margin: 0; color: var(--gedaempft); font-size: .92rem; }
.home-begruessung h1 { margin: 2px 0 4px; font-size: 1.7rem; }
.home-begruessung .date { margin: 0; color: var(--gedaempft); font-size: .82rem; }
```

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/module/home/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 5: Commit — Ende Batch 1, hier stoppen und auf Freigabe warten**

```bash
git add js/module/home/index.js app.css
git commit -m "feat: Home-Begruessung statt statischer 'Home'-Ueberschrift"
git push origin main
```

**Nach diesem Commit: STOPPEN.** Tasks 5-8 erst nach expliziter
Nutzer-Freigabe für den nächsten 4er-Block beginnen.

---

### Task 5: Passkey-Button aus globalem Header entfernen, Theme-Toggle unauffälliger

**Files:**
- Modify: `index.html`
- Modify: `js/app.js`
- Modify: `app.css`

**Interfaces:** keine.

Der globale Passkey-Button (`#passkey-registrieren`) ist redundant —
`js/module/einstellungen/index.js` hat bereits einen voll
funktionsfähigen "Passkey Einrichten"-Button unter "Sicherheit"
(`#ein-passkey`, ruft dieselbe `registrierePasskey()`-Funktion auf).
Einfach den globalen entfernen, nichts Neues bauen.

- [ ] **Schritt 1: `index.html` — Passkey-Button und Hinweis-Zeile entfernen**

Von:
```html
<header>
  <h1 id="modul-titel">Mein Dashboard</h1>
  <div class="kopf-aktionen">
    <button id="theme-toggle-dashboard" type="button" class="theme-toggle" title="Hell/Dunkel wechseln"></button>
    <button id="passkey-registrieren" title="Passkey auf diesem Gerät einrichten">Passkey</button>
  </div>
</header>
<p id="passkey-hinweis" role="status"></p>
```
Zu:
```html
<header>
  <h1 id="modul-titel">Mein Dashboard</h1>
  <div class="kopf-aktionen">
    <button id="theme-toggle-dashboard" type="button" class="theme-toggle" title="Hell/Dunkel wechseln"></button>
  </div>
</header>
```

- [ ] **Schritt 2: `js/app.js` — zugehörigen Code entfernen**

Zeile 27 (`const passkeyHinweis = document.getElementById('passkey-hinweis');`)
entfernen. Den kompletten Block
```js
document.getElementById('passkey-registrieren').addEventListener('click', async (e) => {
  const knopf = e.currentTarget;
  knopf.disabled = true;
  passkeyHinweis.textContent = 'Passkey wird angelegt …';
  const { ok, fehler } = await registrierePasskey();
  passkeyHinweis.textContent = ok ? 'Passkey gespeichert.' : `Fehler: ${fehler}`;
  knopf.disabled = false;
});
```
entfernen. Prüfen, ob `registrierePasskey` danach in `js/app.js` noch
irgendwo importiert/genutzt wird (Login-Screen nutzt nur
`meldeAnMitPasskey`, nicht `registrierePasskey`) — falls der Import
jetzt ungenutzt ist, ihn aus dem `import { ... } from './auth.js'`
entfernen.

- [ ] **Schritt 3: `app.css` — Theme-Toggle unauffälliger machen**

Die Card-Optik/Schatten, die die Design-Nacharbeit vom selben Tag
gerade erst ergänzt hat, für `.theme-toggle` wieder zurücknehmen —
diesmal bewusst dezent statt gefüllt:

Von:
```css
.theme-toggle { width: 40px; height: 40px; padding: 0; border-radius: 999px;
       background: var(--karte); color: var(--text); border: 1px solid var(--rand);
       box-shadow: var(--schatten); display: grid; place-items: center; }
```
Zu:
```css
.theme-toggle { width: 34px; height: 34px; padding: 0; border-radius: 999px;
       background: transparent; color: var(--gedaempft); border: none;
       display: grid; place-items: center; }
```

(`#dashboard-ansicht header button` mit dem Card-Schatten aus der
Design-Nacharbeit bleibt unverändert bestehen, betrifft aber nach
Schritt 1 keinen Button mehr, da der Passkey-Button der einzige war,
der diese Regel traf — `.theme-toggle` hat seine eigene, spezifischere
Regel und gewinnt.)

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/app.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 5: Manuell im Browser prüfen**

Lokalen Server starten (`python -m http.server 8000`), einloggen,
prüfen: kein Passkey-Button mehr im Header, Theme-Toggle kleiner/ohne
Rahmen/Schatten, Passkey-Einrichtung funktioniert weiterhin über
Profil → Einstellungen.

- [ ] **Schritt 6: Commit**

```bash
git add index.html js/app.js app.css
git commit -m "fix: globalen Passkey-Button entfernen (bereits in Einstellungen), Theme-Toggle unauffaelliger"
git push origin main
```

---

### Task 6: Sanfter Tab-Übergang in Finanzen

**Files:**
- Modify: `js/module/finanzen/index.js`
- Modify: `app.css`

**Interfaces:** keine.

- [ ] **Schritt 1: CSS-Animation ergänzen**

In `app.css`, nach den `.tabs`/`.tab`-Regeln (Bereich um `.tab-leiste`)
ergänzen:

```css
@keyframes tab-inhalt-einblenden { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
#tab-inhalt.tab-wechsel { animation: tab-inhalt-einblenden .18s ease; }
```

- [ ] **Schritt 2: `zeigeAktuellenTab` in `js/module/finanzen/index.js`
      anpassen**

Von:
```js
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  const setZeitraum = (neu) => { zeitraum = neu; zeigeAktuellenTab(); };

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    }, zeitraum, setZeitraum, detail);
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
```
Zu:
```js
  inhalt.classList.remove('tab-wechsel');
  inhalt.innerHTML = '<p class="lade">Lädt …</p>';

  const setZeitraum = (neu) => { zeitraum = neu; zeigeAktuellenTab(); };

  try {
    const zeigeFn = await LADER[tab]();
    inhalt.innerHTML = '';
    await zeigeFn(inhalt, zustand, async () => {
      await ladeZustand();
      zeigeAktuellenTab();
    }, zeitraum, setZeitraum, detail);
    void inhalt.offsetWidth; // Reflow erzwingen, damit die Animation bei jedem Wechsel neu startet
    inhalt.classList.add('tab-wechsel');
  } catch (e) {
    inhalt.innerHTML = `<p class="lade">Fehler: ${e.message}</p>`;
  }
```

- [ ] **Schritt 3: Statische Prüfung**

Run: `node --check js/module/finanzen/index.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 4: Commit**

```bash
git add js/module/finanzen/index.js app.css
git commit -m "feat: sanfter Tab-Uebergang in Finanzen"
git push origin main
```

---

### Task 7: Ausgaben-Kategorien anklickbar → Detailliste mit Filter

**Files:**
- Create: `js/module/finanzen/kategorie-detail.js`
- Modify: `js/module/finanzen/uebersicht.js`
- Modify: `js/module/finanzen/analyse.js`

**Interfaces:**
- Produziert: `zeigeKategorieDetail(container, zustand, kategorie, zurueck): void`
  — konsumiert von `uebersicht.js` und `analyse.js`.

Route-Muster wie bei Sendungen/Termine/Todos/Transaktionen (Sub-Etappen
E+F/C): drittes Hash-Segment `detail`, hier mit Präfix `kategorie-`
gefolgt vom Kategorienamen, z. B. `#/finanzen/uebersicht/kategorie-lebensmittel`.

- [ ] **Schritt 1: `js/module/finanzen/kategorie-detail.js` erstellen**

```js
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

export function zeigeKategorieDetail(container, zustand, kategorie, zurueck) {
  const ausgaben = zustand.expenses
    .filter((e) => e.kategorie === kategorie)
    .sort((a, b) => (a.datum < b.datum ? 1 : -1));
  const summe = ausgaben.reduce((s, e) => s + e.betrag, 0);
  let suchtext = '';

  container.innerHTML = `
    <div class="modul-kopf">
      <button id="kd-zurueck" type="button">‹ Zurück</button>
      <h2>${esc(kategorie)}</h2>
    </div>
    <div class="stat-karte gross">
      <small>Gesamt</small>
      <span>${summe.toFixed(2)} €</span>
      <small>${ausgaben.length} Ausgabe${ausgaben.length === 1 ? '' : 'n'}</small>
    </div>
    <div class="searchbar"><input id="kd-suche" placeholder="In ${esc(kategorie)} suchen …"></div>
    <div class="punkt-liste" id="kd-liste"></div>`;

  container.querySelector('#kd-zurueck').addEventListener('click', zurueck);

  function zeichneListe() {
    const gefiltert = suchtext
      ? ausgaben.filter((e) => (e.notiz || '').toLowerCase().includes(suchtext.toLowerCase()))
      : ausgaben;
    const liste = container.querySelector('#kd-liste');
    liste.innerHTML = gefiltert.length === 0 ? '<p class="lade">Keine Treffer.</p>' : gefiltert.map((e) => `
      <div class="punkt-zeile">
        <div class="icon-badge">${KATEGORIE_ICON[kategorie] || KATEGORIE_ICON.sonstiges}</div>
        <div class="punkt-info"><strong>${esc(e.notiz || kategorie)}</strong><small>${e.datum}${e.quelle === 'foto' ? ' · Kassenbon' : ''}</small></div>
        <strong class="betrag-minus">-${e.betrag.toFixed(2)} €</strong>
      </div>`).join('');
  }

  container.querySelector('#kd-suche').addEventListener('input', (e) => {
    suchtext = e.target.value;
    zeichneListe();
  });
  zeichneListe();
}
```

- [ ] **Schritt 2: `js/module/finanzen/uebersicht.js` — Signatur und
      Kategorie-Zeilen anpassen**

Signatur ändern von
`export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum) {`
zu
`export async function zeigeUebersicht(container, zustand, aktualisieren, zeitraum, setZeitraum, detail) {`

Direkt nach der Signaturzeile (vor dem restlichen Funktionskörper)
ergänzen:

```js
  if (detail && detail.startsWith('kategorie-')) {
    const { zeigeKategorieDetail } = await import('./kategorie-detail.js');
    zeigeKategorieDetail(container, zustand, detail.slice('kategorie-'.length), () => {
      location.hash = '#/finanzen/uebersicht';
    });
    return;
  }
```

Die Kategorie-Zeile (aus der Design-Nacharbeit desselben Tages) von
einem reinen `<div>` in ein klickbares Element ändern — die
`.kategorie-zeile`-`<div>`s in ein `<a>`- oder `<div style="cursor:pointer">`-Element
mit Klick-Handler verpacken. Konkret: das `.map((k) => ...)` Template
um `data-kategorie="${esc(k.kategorie)}"` und `style="cursor:pointer;"`
auf dem äußeren `.kategorie-zeile`-Div ergänzen, danach nach dem
bestehenden `container.querySelector('#uebersicht-kontostand')`-Listener
ergänzen:

```js
  container.querySelectorAll('[data-kategorie]').forEach((el) => {
    el.addEventListener('click', () => {
      location.hash = `#/finanzen/uebersicht/kategorie-${el.dataset.kategorie}`;
    });
  });
```

- [ ] **Schritt 3: `js/module/finanzen/analyse.js` — Signatur und
      Kategorie-Zeilen anpassen**

Signatur ändern von
`export async function zeigeAnalyse(container, zustand, aktualisieren) {`
zu
`export async function zeigeAnalyse(container, zustand, aktualisieren, zeitraum, setZeitraum, detail) {`

Direkt danach dieselbe Detail-Weiche wie in Schritt 2 ergänzen
(Rücksprungziel hier `#/finanzen/analyse`). Genauso die
`kategorieZeile()`-Funktion um `data-kategorie` + `cursor:pointer`
ergänzen und am Ende der Funktion denselben
`querySelectorAll('[data-kategorie]')`-Listener-Block wie in Schritt 2
ergänzen (Ziel-Hash hier `#/finanzen/analyse/kategorie-...`).

- [ ] **Schritt 4: Statische Prüfung**

Run: `node --check js/module/finanzen/kategorie-detail.js && node --check js/module/finanzen/uebersicht.js && node --check js/module/finanzen/analyse.js`
Expected: keine Syntaxfehler.

Run: `npm test`
Expected: weiterhin alle Tests grün.

- [ ] **Schritt 5: Manuell im Browser prüfen**

Übersicht- und Analyse-Tab öffnen, auf eine Kategorie klicken, prüfen:
Detailliste zeigt alle Ausgaben dieser Kategorie inkl. per Kassenbon-
Foto erfasster (`quelle: 'foto'`, erkennbar am "· Kassenbon"-Zusatz),
Suchfeld filtert nach Notiz-Text, "‹ Zurück" springt zum jeweils
richtigen Tab zurück.

- [ ] **Schritt 6: Commit**

```bash
git add js/module/finanzen/kategorie-detail.js js/module/finanzen/uebersicht.js js/module/finanzen/analyse.js
git commit -m "feat: Ausgaben-Kategorien anklickbar mit Detailliste und Suche"
git push origin main
```

---

### Task 8: Regelmäßige-Ausgaben-Datenkorrektur

**Files:** keine Code-Dateien — reine Chat-Diktat-Aktion per
Supabase-MCP.

**Interfaces:** keine.

- [ ] **Schritt 1: Bestehende Fehlbuchung korrigieren**

Die `expenses`-Zeile mit `notiz = 'Friseur'`, Datum `2026-09-19`,
aktuell `betrag = 18`, auf `betrag = 10` korrigieren (per
`execute_sql`/Supabase-MCP, `user_id = df0b24a6-6a74-4830-995c-84015161dcc3`
beachten, sofern nicht per RLS ohnehin auf den eingeloggten Nutzer
beschränkt).

- [ ] **Schritt 2: Drei `ausgaben_vorlagen`-Zeilen anlegen**

Für jede der drei: `bezeichnung`, `betrag`, `plan_tag_im_monat` = 19
(Tag der bereits gebuchten Einzel-Ausgabe, 2026-09-19), `konto_id` =
Hauptkonto-ID (aus `konten`-Tabelle ermitteln), `naechste_faelligkeit`
= `2026-10-19` (ein Monat nach der letzten Buchung), `aktiv = true`:

1. Claude Abo — 22,00 €
2. Wispr Flow — 15,00 €
3. Friseur — 10,00 €

- [ ] **Schritt 3: Verifizieren**

`select * from ausgaben_vorlagen order by betrag desc;` — drei Zeilen
mit den korrekten Beträgen erwartet. In der App (Finanzen →
Regelmäßige Ausgaben) prüfen, dass alle drei erscheinen.

Kein Commit nötig (keine Code-Änderung) — trotzdem in Task 9
dokumentieren.

---

### Task 9: Dokumentation

**Files:**
- Modify: `docs/PROJEKT-LOG.md`
- Modify: `CLAUDE.md`

**Interfaces:** keine.

- [ ] **Schritt 1: `docs/PROJEKT-LOG.md` — neuen Abschnitt oben einfügen**

Was/Entscheidungen/Stand-danach-Muster. Inhalt: alle neun Tasks kurz
zusammenfassen (Modul-Kopf bereinigt, Home-Begrüßung, Passkey-Button
entfernt, Theme-Toggle unauffälliger, Tab-Übergang, Kategorien-Klick,
Regelmäßige-Ausgaben-Korrektur). Explizit die Korrektur zur
"‹ Dashboard"-Fehleinschätzung vom selben Tag vermerken (Doku-Rigor-
Regel: auch Fehler dokumentieren).

- [ ] **Schritt 2: `CLAUDE.md` aktualisieren**

Abschnitt "Aktueller Stand": Sub-Etappe R als fertig markieren,
"Reihenfolge ab jetzt" auf "als Nächstes N" umstellen. Bullet R selbst
um "fertig (2026-09-22)" ergänzen. `npm test`-Ausgabe tatsächlich
ausführen, echte Testanzahl übernehmen (sollte unverändert bleiben,
Task 1-8 ändern keine `berechnung.js`-Dateien).

- [ ] **Schritt 3: Commit und Push**

```bash
git add docs/PROJEKT-LOG.md CLAUDE.md
git commit -m "docs: Sub-Etappe R (UI-Politur & Diktat-Korrekturen) dokumentiert"
git push origin main
```

## Definition of Done

- [ ] Alle 9 Tasks abgeschlossen, `npm test` durchgehend grün.
- [ ] Kein Modul zeigt seinen Titel mehr doppelt.
- [ ] Kein redundanter "‹ Dashboard"-Button mehr in Finanzen/Todos/
      Ernährung/Sendungen/Ausbildung.
- [ ] Home zeigt eine zeitabhängige Begrüßung + Datum statt "Home".
- [ ] Kein Passkey-Button mehr im globalen Header, Passkey-Einrichtung
      funktioniert weiterhin über Einstellungen.
- [ ] Theme-Toggle wirkt unauffälliger als vorher.
- [ ] Finanzen-Tab-Wechsel hat eine sichtbare, sanfte Übergangs-Animation.
- [ ] Ausgaben-Kategorien in Übersicht und Analyse sind anklickbar,
      führen zu einer durchsuchbaren Detailliste inkl. Kassenbon-Foto-
      Ausgaben.
- [ ] `ausgaben_vorlagen` enthält Claude Abo (22 €), Wispr Flow (15 €),
      Friseur (10 €); die einmalige Friseur-Fehlbuchung ist korrigiert.
- [ ] `docs/PROJEKT-LOG.md` + `CLAUDE.md` aktualisiert, gepusht.
