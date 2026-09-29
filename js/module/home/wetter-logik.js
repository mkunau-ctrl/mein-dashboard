const CACHE_MINUTEN = 30;

export function wetterUrl(lat, lon, tage) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&daily=temperature_2m_max,temperature_2m_min,weathercode'
    + `&timezone=Europe/Berlin&forecast_days=${tage}`;
}

const CODES = [
  [[0], 'Klar', '☀'],
  [[1, 2], 'Heiter', '🌤'],
  [[3], 'Bewölkt', '☁'],
  [[45, 48], 'Nebel', '🌫'],
  [[51, 53, 55, 56, 57], 'Nieselregen', '🌦'],
  [[61, 63, 65, 66, 67, 80, 81, 82], 'Regen', '🌧'],
  [[71, 73, 75, 77, 85, 86], 'Schnee', '❄'],
  [[95, 96, 99], 'Gewitter', '⛈'],
];

export function wettercodeZuText(code) {
  for (const [codes, text, symbol] of CODES) {
    if (codes.includes(code)) return { text, symbol };
  }
  return { text: 'Sonstiges', symbol: '·' };
}

export function istCacheGueltig(zeitstempel, jetzt) {
  if (typeof zeitstempel !== 'number') return false;
  const diff = jetzt - zeitstempel;
  return diff >= 0 && diff < CACHE_MINUTEN * 60 * 1000;
}

export function tageAusAntwort(antwort) {
  const d = antwort?.daily;
  if (!d || !Array.isArray(d.time)) return null;
  return d.time.map((datum, i) => ({
    datum,
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
    code: d.weathercode[i],
  }));
}
