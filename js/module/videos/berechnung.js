// Reine Hilfsfunktionen fuer die Video-Ablage (kein Netz/DOM, getestet).

// Komprimier-Profile. hoehe = maximale Hoehe (nie hochskalieren), bitrate in bit/s.
// Bildschirmaufnahmen/Praesentationen brauchen wenig Bilder pro Sekunde, aber lesbaren Text.
export const PROFILE = {
  lesbar: { label: 'Lesbar (720p, Text bleibt scharf)', hoehe: 720, fps: 15, videoBitrate: 900_000, audioBitrate: 48_000 },
  klein: { label: 'Klein (480p, schnellste Variante)', hoehe: 480, fps: 24, videoBitrate: 450_000, audioBitrate: 40_000 },
  hoch: { label: 'Hoch (1080p, groesser)', hoehe: 1080, fps: 24, videoBitrate: 2_500_000, audioBitrate: 64_000 },
};
export const STANDARD_PROFIL = 'lesbar';

// Ausgabegroesse: nie groesser als das Original, auf gerade Zahlen gerundet (Encoder verlangen das).
// hoeheOriginal/breiteOriginal = Anzeigegroesse (Drehung schon beruecksichtigt).
export function zielGroesse(breiteOriginal, hoeheOriginal, maxHoehe) {
  if (!(breiteOriginal > 0) || !(hoeheOriginal > 0)) return null;
  // Hochkant-Videos: die kuerzere Seite soll maxHoehe nicht ueberschreiten
  const kurz = Math.min(breiteOriginal, hoeheOriginal);
  const faktor = kurz > maxHoehe ? maxHoehe / kurz : 1;
  const gerade = (x) => Math.max(2, Math.round((x * faktor) / 2) * 2);
  return { breite: gerade(breiteOriginal), hoehe: gerade(hoeheOriginal), skaliert: faktor < 1 };
}

// Wie viele Bilder pro Sekunde: nie mehr als das Original (sonst erfindet der Encoder Bilder).
export function zielFps(profilFps, originalFps) {
  if (!(originalFps > 0)) return profilFps;
  return Math.min(profilFps, Math.round(originalFps));
}

export function formatiereGroesse(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  const einheiten = ['KB', 'MB', 'GB'];
  let wert = bytes / 1024;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) { wert /= 1024; i++; }
  return `${wert.toFixed(1).replace('.', ',')} ${einheiten[i]}`;
}

export function formatiereDauer(sekunden) {
  if (!Number.isFinite(sekunden) || sekunden < 0) return '–';
  const s = Math.round(sekunden);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const zwei = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${zwei(m)}:${zwei(r)}` : `${m}:${zwei(r)}`;
}

// "−92 %" bzw. "" wenn keine Ersparnis berechenbar
export function ersparnisText(originalBytes, neuBytes) {
  if (!(originalBytes > 0) || !(neuBytes >= 0)) return '';
  const prozent = Math.round((1 - neuBytes / originalBytes) * 100);
  return prozent > 0 ? `−${prozent} %` : 'nicht kleiner';
}

// Storage-Pfad: <user_id>/<uuid>-<bereinigter Name>.<endung>. Die volle UUID macht die
// oeffentliche URL nicht erratbar (Bucket ist lesbar, aber nicht auflistbar).
export function videoPfad(userId, dateiname, uuid, endung) {
  const name = String(dateiname ?? '').split(/[\\/]/).pop();
  const punkt = name.lastIndexOf('.');
  const stamm = punkt > 0 ? name.slice(0, punkt) : name;
  const sauber = stamm.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'video';
  const ext = String(endung ?? 'mp4').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  return `${userId}/${uuid}-${sauber}.${ext}`;
}

export function sortiereVideos(videos) {
  return [...videos].sort((a, b) => b.erstellt_am.localeCompare(a.erstellt_am));
}

// Supabase (Free) erlaubt max. 50 MB pro Datei. Ziel bewusst darunter, weil die Bitrate nur ein Richtwert ist.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ZIEL_BYTES = 44 * 1024 * 1024;
const MIN_VIDEO_BITRATE = 120_000;

export function schaetzeGroesse(dauerSekunden, bitrates) {
  if (!(dauerSekunden > 0)) return null;
  return Math.round(dauerSekunden * (bitrates.videoBitrate + bitrates.audioBitrate) / 8);
}

// Lange Videos: Video-Bitrate so weit senken, dass die Datei unter ZIEL_BYTES bleibt.
// Liefert die tatsaechlich zu nutzenden Bitraten und ob gedrosselt werden musste
// (zu_lang = selbst mit Mindest-Bitrate zu gross -> Nutzer kuerzen/anderes Profil empfehlen).
export function effektiveBitrates(dauerSekunden, profil) {
  const voll = { videoBitrate: profil.videoBitrate, audioBitrate: profil.audioBitrate };
  if (!(dauerSekunden > 0)) return { ...voll, gedrosselt: false, zu_lang: false };
  if (schaetzeGroesse(dauerSekunden, voll) <= ZIEL_BYTES) return { ...voll, gedrosselt: false, zu_lang: false };
  const gesamt = (ZIEL_BYTES * 8) / dauerSekunden;
  const video = Math.floor(gesamt - profil.audioBitrate);
  if (video < MIN_VIDEO_BITRATE) {
    return { videoBitrate: MIN_VIDEO_BITRATE, audioBitrate: profil.audioBitrate, gedrosselt: true, zu_lang: true };
  }
  return { videoBitrate: video, audioBitrate: profil.audioBitrate, gedrosselt: true, zu_lang: false };
}
