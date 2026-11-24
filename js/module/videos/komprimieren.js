// Video lokal im Browser komprimieren (WebCodecs ueber mediabunny, Hardware-Encoder wenn vorhanden).
// Nichts verlaesst das Geraet, bevor das kleine Ergebnis hochgeladen wird.
// Nur Browser (braucht VideoEncoder/Blob); die Rechenregeln stehen getestet in berechnung.js.
import { PROFILE, zielGroesse, zielFps, effektiveBitrates } from './berechnung.js';

let mediabunny = null;
async function ladeBibliothek() {
  // Lokal eingebunden (kein CDN), erst beim ersten Komprimieren geladen (~750 KB)
  mediabunny ??= await import('../../vendor/mediabunny.min.mjs');
  return mediabunny;
}

export function unterstuetzt() {
  return typeof VideoEncoder !== 'undefined' && typeof VideoDecoder !== 'undefined';
}

// Bevorzugt MP4/H.264 (spielt ueberall, Hardware-Encoder auf iPhone/Mac/Windows), sonst WebM/VP9/VP8.
async function waehleFormat(M, breite, hoehe, bitrates, fps) {
  const opt = { width: breite, height: hoehe, bitrate: bitrates.videoBitrate, frameRate: fps };
  const kandidaten = [
    { endung: 'mp4', mime: 'video/mp4', format: () => new M.Mp4OutputFormat({ fastStart: 'in-memory' }), video: ['avc'] },
    { endung: 'webm', mime: 'video/webm', format: () => new M.WebMOutputFormat(), video: ['vp9', 'vp8'] },
  ];
  for (const k of kandidaten) {
    const video = await M.getFirstEncodableVideoCodec(k.video, opt);
    if (!video) continue;
    const ausgabe = k.format();
    const audio = await M.getFirstEncodableAudioCodec(ausgabe.getSupportedAudioCodecs(), {
      numberOfChannels: 1, sampleRate: 24000, bitrate: bitrates.audioBitrate,
    });
    return { ...k, ausgabe, videoCodec: video, audioCodec: audio };
  }
  return null;
}

/**
 * @param {File|Blob} datei
 * @param {keyof typeof PROFILE} profilKey
 * @param {{onFortschritt?: (anteil:number)=>void, signal?: AbortSignal}} optionen
 * @returns {Promise<{blob:Blob, endung:string, mime:string, dauer:number, breite:number, hoehe:number,
 *   videoCodec:string, ohneTon:boolean, gedrosselt:boolean, zu_lang:boolean, sekunden:number}>}
 */
export async function komprimiere(datei, profilKey, { onFortschritt, signal } = {}) {
  if (!unterstuetzt()) throw new Error('Dieser Browser kann Videos nicht lokal komprimieren (WebCodecs fehlt). Bitte aktuelles Safari/Chrome nutzen.');
  const profil = PROFILE[profilKey];
  if (!profil) throw new Error(`Unbekanntes Profil: ${profilKey}`);
  const M = await ladeBibliothek();
  const start = performance.now();

  const input = new M.Input({ source: new M.BlobSource(datei), formats: M.ALL_FORMATS });
  try {
    const spur = await input.getPrimaryVideoTrack();
    if (!spur) throw new Error('In der Datei wurde keine Videospur gefunden.');
    const dauer = await input.computeDuration();
    const ziel = zielGroesse(spur.displayWidth, spur.displayHeight, profil.hoehe);
    if (!ziel) throw new Error('Die Videogröße konnte nicht gelesen werden.');
    let originalFps = 0;
    try { originalFps = (await spur.computePacketStats(120)).averagePacketRate; } catch { /* egal, Profil-FPS */ }
    const fps = zielFps(profil.fps, originalFps);
    const bitrates = effektiveBitrates(dauer, profil);

    const wahl = await waehleFormat(M, ziel.breite, ziel.hoehe, bitrates, fps);
    if (!wahl) throw new Error('Dieser Browser kann weder H.264 noch VP9/VP8 kodieren.');

    const output = new M.Output({ format: wahl.ausgabe, target: new M.BufferTarget() });
    const umwandlung = await M.Conversion.init({
      input,
      output,
      video: {
        width: ziel.breite, height: ziel.hoehe, fit: 'fill', frameRate: fps,
        codec: wahl.videoCodec, bitrate: bitrates.videoBitrate, keyFrameInterval: 4,
      },
      audio: wahl.audioCodec
        ? { codec: wahl.audioCodec, numberOfChannels: 1, sampleRate: 24000, bitrate: bitrates.audioBitrate }
        : { discard: true },
    });
    if (!umwandlung.isValid) {
      const gruende = umwandlung.discardedTracks.map((t) => t.reason).join(', ');
      throw new Error(`Umwandlung nicht möglich${gruende ? ` (${gruende})` : ''}.`);
    }
    if (onFortschritt) umwandlung.onProgress = (p) => onFortschritt(Math.min(1, p));
    if (signal) {
      if (signal.aborted) throw new DOMException('Abgebrochen', 'AbortError');
      signal.addEventListener('abort', () => { umwandlung.cancel(); }, { once: true });
    }
    try { await umwandlung.execute(); }
    catch (e) {
      if (e instanceof M.ConversionCanceledError) throw new DOMException('Abgebrochen', 'AbortError');
      throw e;
    }

    const buffer = output.target.buffer;
    if (!buffer || buffer.byteLength === 0) throw new Error('Die Umwandlung hat keine Daten geliefert.');
    return {
      blob: new Blob([buffer], { type: wahl.mime }),
      endung: wahl.endung,
      mime: wahl.mime,
      dauer,
      breite: ziel.breite,
      hoehe: ziel.hoehe,
      videoCodec: wahl.videoCodec,
      ohneTon: !wahl.audioCodec || umwandlung.discardedTracks.some((t) => t.track?.type === 'audio'),
      gedrosselt: bitrates.gedrosselt,
      zu_lang: bitrates.zu_lang,
      sekunden: Math.round(((performance.now() - start) / 1000) * 10) / 10,
    };
  } finally {
    input.dispose?.();
  }
}
