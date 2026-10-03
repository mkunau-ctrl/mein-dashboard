// Reine Hilfsfunktionen fuer den Datei-Austausch (kein Netz/DOM).

export function formatiereGroesse(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const einheiten = ['KB', 'MB', 'GB'];
  let wert = bytes / 1024;
  let i = 0;
  while (wert >= 1024 && i < einheiten.length - 1) { wert /= 1024; i++; }
  return `${wert.toFixed(1).replace('.', ',')} ${einheiten[i]}`;
}

// Storage-Pfad: <user_id>/<eindeutig>-<bereinigter Name>, Endung bleibt erhalten
export function sichererPfad(userId, dateiname, eindeutig) {
  const name = String(dateiname ?? '').split(/[\/]/).pop();
  const punkt = name.lastIndexOf('.');
  const stamm = punkt > 0 ? name.slice(0, punkt) : name;
  const endung = punkt > 0 ? name.slice(punkt).replace(/[^A-Za-z0-9.]/g, '') : '';
  const sauber = stamm.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'datei';
  return `${userId}/${eindeutig}-${sauber}${endung}`;
}

export function sortiereDateien(dateien) {
  return [...dateien].sort((a, b) => b.erstellt_am.localeCompare(a.erstellt_am));
}
