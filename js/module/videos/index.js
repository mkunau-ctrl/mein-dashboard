import { registriere } from '../../registry.js';
import { ladeVideos, ladeHoch, loesche, oeffentlicheUrl } from './daten.js';
import { komprimiere, unterstuetzt } from './komprimieren.js';
import {
  PROFILE, STANDARD_PROFIL, MAX_UPLOAD_BYTES, formatiereGroesse, formatiereDauer, ersparnisText,
  sortiereVideos, fasseZusammen, verarbeiteMitLimit,
} from './berechnung.js';

const VIDEO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>';

function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

registriere({
  id: 'videos',
  titel: 'Videos',
  async init(container) {
    const profilOptionen = Object.entries(PROFILE)
      .map(([k, p]) => `<option value="${k}"${k === STANDARD_PROFIL ? ' selected' : ''}>${esc(p.label)}</option>`).join('');
    container.innerHTML = `
      <div class="modul-kopf">
        <button id="vid-zurueck" type="button">‹ Zurück</button>
      </div>
      <div class="stat-karte">
        <p class="lade" style="margin:0 0 10px;">Das Video wird hier auf deinem Gerät komprimiert. Hochgeladen wird nur das kleine Ergebnis, danach kann Claude es ansehen.</p>
        <label for="vid-profil" class="lade" style="display:block;margin-bottom:4px;">Qualität</label>
        <select id="vid-profil" style="width:100%;margin-bottom:8px;">${profilOptionen}</select>
        <label for="vid-parallel" class="lade" style="display:block;margin-bottom:4px;">Gleichzeitig komprimieren</label>
        <select id="vid-parallel" style="width:100%;margin-bottom:8px;">
          <option value="1">1 (nacheinander, am schonendsten)</option>
          <option value="2">2</option>
          <option value="3" selected>3 (empfohlen)</option>
          <option value="5">5</option>
          <option value="10">10 (maximal, braucht viel Speicher)</option>
        </select>
        <input id="vid-notiz" type="text" placeholder="Worum geht es im Video? (hilft Claude)" maxlength="300" style="width:100%;margin-bottom:10px;">
        <label class="knopf-neutral" style="display:block;text-align:center;cursor:pointer;">
          Videos auswählen (auch mehrere)
          <input id="vid-auswahl" type="file" accept="video/*" multiple hidden>
        </label>
      </div>
      <div id="vid-lauf" class="stat-karte" hidden>
        <p id="vid-lauf-text" style="margin:0 0 8px;font-weight:600;"></p>
        <div id="vid-lauf-zeilen"></div>
        <button id="vid-abbrechen" type="button" class="knopf-neutral" style="margin-top:8px;">Abbrechen</button>
      </div>
      <p id="vid-status" class="lade" style="white-space:pre-line;" hidden></p>
      <div class="punkt-liste" id="vid-liste"></div>`;
    container.querySelector('#vid-zurueck').addEventListener('click', () => { history.back(); });
    const status = container.querySelector('#vid-status');
    const liste = container.querySelector('#vid-liste');
    const lauf = container.querySelector('#vid-lauf');
    const laufText = container.querySelector('#vid-lauf-text');
    const laufZeilen = container.querySelector('#vid-lauf-zeilen');
    const auswahl = container.querySelector('#vid-auswahl');
    let abbruch = null;

    const zeigeStatus = (text) => { status.hidden = !text; status.textContent = text ?? ''; };

    if (!unterstuetzt()) {
      zeigeStatus('Dieser Browser kann Videos nicht lokal komprimieren (WebCodecs fehlt). Bitte aktuelles Safari oder Chrome nutzen.');
      auswahl.disabled = true;
    }

    const rendere = async () => {
      let videos;
      try { videos = sortiereVideos(await ladeVideos()); }
      catch (e) { zeigeStatus(e.message); return; }
      liste.replaceChildren();
      if (videos.length === 0) {
        liste.innerHTML = '<p class="lade">Noch keine Videos. Wähle oben eins aus, es wird lokal komprimiert und abgelegt.</p>';
        return;
      }
      for (const v of videos) {
        const url = oeffentlicheUrl(v.pfad);
        const zeile = document.createElement('div');
        zeile.className = 'punkt-zeile';
        zeile.style.flexWrap = 'wrap';
        const ersparnis = ersparnisText(v.original_bytes, v.groesse);
        const angesehen = v.angesehen_am
          ? `Claude hat es angesehen · ${esc(v.angesehen_am.slice(0, 16).replace('T', ' '))}`
          : 'Noch nicht von Claude angesehen';
        zeile.innerHTML = `<div class="icon-badge">${VIDEO_ICON}</div>
          <div class="punkt-info"><strong>${esc(v.name)}</strong>
          <small>${esc(formatiereDauer(Number(v.dauer_s)))} · ${v.breite ?? '?'}×${v.hoehe ?? '?'} ·
          ${esc(formatiereGroesse(v.original_bytes))} → ${esc(formatiereGroesse(v.groesse))} ${esc(ersparnis)}</small>
          <small>${angesehen}</small>
          ${v.notiz ? `<small>Notiz: ${esc(v.notiz)}</small>` : ''}</div>
          <button type="button" data-aktion="abspielen" class="knopf-neutral" style="width:auto;">Abspielen</button>
          <button type="button" data-aktion="loeschen" class="knopf-neutral" style="width:auto;">Löschen</button>
          ${v.claude_notiz ? `<div style="flex-basis:100%;margin-top:8px;"><small style="white-space:pre-wrap;"><strong>Claude:</strong> ${esc(v.claude_notiz)}</small></div>` : ''}
          <div data-spieler style="flex-basis:100%;margin-top:8px;" hidden></div>`;
        zeile.querySelector('[data-aktion="abspielen"]').addEventListener('click', () => {
          const platz = zeile.querySelector('[data-spieler]');
          if (!platz.hidden) { platz.hidden = true; platz.replaceChildren(); return; }
          const video = document.createElement('video');
          video.src = url; video.controls = true; video.playsInline = true; video.preload = 'metadata';
          video.style.cssText = 'width:100%;border-radius:12px;background:#000;';
          platz.replaceChildren(video);
          platz.hidden = false;
        });
        zeile.querySelector('[data-aktion="loeschen"]').addEventListener('click', async () => {
          if (!confirm(`„${v.name}“ endgültig löschen?`)) return;
          try { await loesche(v); await rendere(); }
          catch (e) { zeigeStatus(e.message); }
        });
        liste.appendChild(zeile);
      }
    };

    container.querySelector('#vid-abbrechen').addEventListener('click', () => { abbruch?.abort(); });

    // Mehrere Videos: bis zu `parallel` gleichzeitig (Auswahl 1-10). Ein Fehler bei einem Video stoppt die anderen
    // nicht; nur "Abbrechen" beendet alles. Fehlgeschlagene Videos bekommen am Ende einen zweiten Versuch EINZELN
    // (haeufigste Ursache bei vielen gleichzeitigen: Encoder oder Speicher des Geraets ausgelastet).
    auswahl.addEventListener('change', async (e) => {
      const dateien = [...e.target.files];
      e.target.value = '';
      if (dateien.length === 0) return;
      const profilKey = container.querySelector('#vid-profil').value;
      const parallel = Number(container.querySelector('#vid-parallel').value) || 1;
      const notiz = container.querySelector('#vid-notiz').value.trim();
      abbruch = new AbortController();
      zeigeStatus(null);
      auswahl.disabled = true;
      lauf.hidden = false;
      laufZeilen.replaceChildren();
      const zeilen = dateien.map((d) => {
        const z = document.createElement('div');
        z.style.cssText = 'margin-bottom:10px;';
        z.innerHTML = '<small data-t style="display:block;"></small><progress max="100" value="0" style="width:100%;"></progress>';
        laufZeilen.appendChild(z);
        return { text: (t) => { z.querySelector('[data-t]').textContent = `${d.name}: ${t}`; }, wert: (v) => { const pr = z.querySelector('progress'); if (v == null) pr.removeAttribute('value'); else pr.value = v; } };
      });
      let fertig = 0;
      const kopf = () => { laufText.textContent = `${fertig} von ${dateien.length} fertig${parallel > 1 && dateien.length > 1 ? ` · bis zu ${Math.min(parallel, dateien.length)} gleichzeitig` : ''}`; };
      kopf();

      const job = async (datei, i) => {
        const z = zeilen[i];
        z.text(`wartet … (${formatiereGroesse(datei.size)})`);
        try {
          const ergebnis = await komprimiere(datei, profilKey, {
            signal: abbruch.signal,
            onFortschritt: (p) => { z.wert(Math.round(p * 100)); z.text(`komprimiere ${Math.round(p * 100)} %`); },
          });
          if (ergebnis.blob.size > MAX_UPLOAD_BYTES) {
            const fehler = `Auch komprimiert zu groß (${formatiereGroesse(ergebnis.blob.size)}, Limit ${formatiereGroesse(MAX_UPLOAD_BYTES)}). Bitte kürzen oder Qualität „Klein“ wählen.`;
            z.text(`✗ ${fehler}`);
            return { name: datei.name, ok: false, fehler, wiederholbar: false };
          }
          z.text(`lade ${formatiereGroesse(ergebnis.blob.size)} hoch …`); z.wert(null);
          await ladeHoch(ergebnis, datei, { profil: profilKey, notiz });
          const hinweise = [];
          if (ergebnis.ohneTon) hinweise.push('ohne Ton (dieser Browser kann den Ton nicht kodieren)');
          if (ergebnis.gedrosselt) hinweise.push('Qualität wegen der Länge gesenkt (unter 50 MB)');
          z.text(`✓ fertig (${formatiereGroesse(datei.size)} → ${formatiereGroesse(ergebnis.blob.size)})`); z.wert(100);
          fertig++; kopf();
          rendere(); // Liste wächst schon, während die anderen laufen
          return { name: datei.name, ok: true, vorher: datei.size, nachher: ergebnis.blob.size, sekunden: ergebnis.sekunden, hinweise };
        } catch (err) {
          if (err.name === 'AbortError') { z.text('abgebrochen'); return { name: datei.name, ok: false, fehler: 'abgebrochen', abgebrochen: true }; }
          const kein = /unsupported or unrecognizable/i.test(err.message);
          const fehler = kein ? 'Das ist kein lesbares Video (Format nicht erkannt).' : err.message;
          z.text(`✗ ${fehler}`);
          return { name: datei.name, ok: false, fehler, wiederholbar: !kein };
        }
      };

      const gestoppt = () => abbruch.signal.aborted;
      let ergebnisse = await verarbeiteMitLimit(dateien, parallel, job, { gestoppt });
      if (parallel > 1 && !gestoppt()) {
        for (let i = 0; i < dateien.length && !gestoppt(); i++) {
          if (ergebnisse[i] && !ergebnisse[i].ok && ergebnisse[i].wiederholbar) {
            zeilen[i].text('zweiter Versuch, jetzt einzeln …'); zeilen[i].wert(0);
            ergebnisse[i] = await job(dateien[i], i);
          }
        }
      }
      const abgebrochen = gestoppt();
      ergebnisse = ergebnisse.filter((r) => r && !r.abgebrochen);
      container.querySelector('#vid-notiz').value = '';
      lauf.hidden = true;
      auswahl.disabled = !unterstuetzt();
      abbruch = null;
      zeigeStatus(fasseZusammen(ergebnisse, dateien.length, abgebrochen));
      await rendere();
    });

    await rendere();
  },
});
