const SCHLUESSEL = 'theme';

function gespeicherteVorliebe() {
  try {
    const wert = localStorage.getItem(SCHLUESSEL);
    return wert === 'dark' || wert === 'light' ? wert : null;
  } catch {
    return null;
  }
}

export function aufgeloestesTheme() {
  const vorliebe = gespeicherteVorliebe();
  if (vorliebe) return vorliebe;
  return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function wendeThemeAn() {
  const vorliebe = gespeicherteVorliebe();
  if (vorliebe) document.documentElement.setAttribute('data-theme', vorliebe);
  else document.documentElement.removeAttribute('data-theme');
  return aufgeloestesTheme();
}

export function wechsleTheme() {
  const naechstes = aufgeloestesTheme() === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem(SCHLUESSEL, naechstes); } catch { /* Privatmodus o. Ä. */ }
  document.documentElement.setAttribute('data-theme', naechstes);
  return naechstes;
}
