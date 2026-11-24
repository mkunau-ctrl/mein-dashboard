import { registriere } from '../../registry.js';
import { ladeVideos, ladeHoch, loesche, oeffentlicheUrl } from './daten.js';
import { komprimiere, unterstuetzt } from './komprimieren.js';
import {
  PROFILE, STANDARD_PROFIL, MAX_UPLOAD_BYTES, formatiereGroesse, formatiereDauer, ersparnisText,
  sortiereVideos,
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
        <input id="vid-notiz" type="text" placeholder="Worum geht es im Video? (hilft Claude)" maxlength="300" style="width:100%;margin-bottom:10px;">
        <label class="knopf-neutral" style="display:block;text-align:center;cursor:pointer;">
          Video auswählen
          <input id="vid-auswahl" type="file" accept="video/*" hidden>
        </label>
      </div>
      <div id="vid-lauf" class="stat-karte" hidden>
        <p id="vid-lauf-text" style="margin:0 0 8px;"></p>
        <progress id="vid-fortschritt" max="100" value="0" style="width:100%;"></progress>
        <button id="vid-abbrechen" type="button" class="knopf-neutral" style="margin-top:8px;">Abbrechen</button>
      </div>
      <p id="vid-status" class="lade" hidden></p>
      <div class="punkt-liste" id="vid-liste"></div>`;
    container.querySelector('#vid-zurueck').addEventListener('click', () => { history.back(); });
    const status = container.querySelector('#vid-status');
    const liste = container.querySelector('#vid-liste');
    const lauf = container.querySelector('#vid-lauf');
    const laufText = container.querySelector('#vid-lauf-text');
    const fortschritt = container.querySelector('#vid-fortschritt');
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

    auswahl.addEventListener('change', async (e) => {
      const datei = e.target.files[0];
      e.target.value = '';
      if (!datei) return;
      const profilKey = container.querySelector('#vid-profil').value;
      const notiz = container.querySelector('#vid-notiz').value.trim();
      abbruch = new AbortController();
      zeigeStatus(null);
      auswahl.disabled = true;
      lauf.hidden = false;
      fortschritt.value = 0;
      laufText.textContent = `Komprimiere „${datei.name}“ (${formatiereGroesse(datei.size)}) …`;
      try {
        const ergebnis = await komprimiere(datei, profilKey, {
          signal: abbruch.signal,
          onFortschritt: (p) => {
            fortschritt.value = Math.round(p * 100);
            laufText.textContent = `Komprimiere „${datei.name}“ … ${Math.round(p * 100)} %`;
          },
        });
        if (ergebnis.blob.size > MAX_UPLOAD_BYTES) {
          throw new Error(`Auch komprimiert zu groß (${formatiereGroesse(ergebnis.blob.size)}, Limit ${formatiereGroesse(MAX_UPLOAD_BYTES)}). Bitte kürzen oder Qualität „Klein“ wählen.`);
        }
        laufText.textContent = `Lade ${formatiereGroesse(ergebnis.blob.size)} hoch …`;
        fortschritt.removeAttribute('value'); // unbestimmt
        await ladeHoch(ergebnis, datei, { profil: profilKey, notiz });
        const hinweise = [];
        if (ergebnis.ohneTon) hinweise.push('Ohne Ton (dieser Browser kann den Ton nicht kodieren).');
        if (ergebnis.gedrosselt) hinweise.push('Wegen der Länge wurde die Qualität gesenkt, damit die Datei unter 50 MB bleibt.');
        zeigeStatus(`Fertig in ${ergebnis.sekunden} s: ${formatiereGroesse(datei.size)} → ${formatiereGroesse(ergebnis.blob.size)} ${ersparnisText(datei.size, ergebnis.blob.size)}. ${hinweise.join(' ')}`.trim());
        container.querySelector('#vid-notiz').value = '';
      } catch (err) {
        zeigeStatus(err.name === 'AbortError' ? 'Abgebrochen.' : err.message);
      } finally {
        lauf.hidden = true;
        auswahl.disabled = !unterstuetzt();
        abbruch = null;
      }
      await rendere();
    });

    await rendere();
  },
});
