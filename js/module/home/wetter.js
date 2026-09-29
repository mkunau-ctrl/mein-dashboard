import { wetterUrl, wettercodeZuText, istCacheGueltig, tageAusAntwort } from './wetter-logik.js';

const LEMGO = { lat: 52.0333, lon: 8.9 };
const CACHE_SCHLUESSEL = 'wetter-lemgo';

function leseCache() {
  try {
    const roh = localStorage.getItem(CACHE_SCHLUESSEL);
    return roh ? JSON.parse(roh) : null;
  } catch { return null; }
}

function schreibeCache(tage) {
  try {
    localStorage.setItem(CACHE_SCHLUESSEL, JSON.stringify({ zeitstempel: Date.now(), tage }));
  } catch { /* Storage evtl. blockiert, Wetter dann bei jedem Besuch neu */ }
}

async function holeTage() {
  const cache = leseCache();
  if (cache && istCacheGueltig(cache.zeitstempel, Date.now()) && Array.isArray(cache.tage)) return cache.tage;
  const antwort = await fetch(wetterUrl(LEMGO.lat, LEMGO.lon, 3));
  if (!antwort.ok) throw new Error(`Wetter HTTP ${antwort.status}`);
  const tage = tageAusAntwort(await antwort.json());
  if (!tage) throw new Error('Wetter: unerwartete Antwort');
  schreibeCache(tage);
  return tage;
}

function wochentag(datum, index) {
  if (index === 0) return 'Heute';
  return new Date(`${datum}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short' });
}

export async function zeigeWetter(container) {
  try {
    const tage = await holeTage();
    if (!container.isConnected) return;
    container.innerHTML = `<div class="stat-grid">${tage.map((t, i) => {
      const w = wettercodeZuText(t.code);
      return `<div class="stat"><div class="stat-lbl">${wochentag(t.datum, i)}</div>
        <div class="stat-val">${w.symbol} ${t.max}°</div>
        <div class="stat-lbl">${w.text} · ${t.min}°</div></div>`;
    }).join('')}</div>`;
  } catch {
    if (container.isConnected) container.innerHTML = '<p class="lade">Wetter gerade nicht verfügbar.</p>';
  }
}
