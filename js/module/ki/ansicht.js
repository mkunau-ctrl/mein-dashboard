// Reine Logik fuer die "Nur ansehen"-Ansicht des KI-Moduls (kein DOM, kein Netz).

export const NUR_ANSICHT_SCHLUESSEL = 'ki-nur-ansicht';

// Liest den gespeicherten Schalter. Fehlt der Speicher oder wirft er, gilt: aus.
export function leseNurAnsicht(speicher) {
  try {
    return speicher?.getItem(NUR_ANSICHT_SCHLUESSEL) === '1';
  } catch {
    return false;
  }
}

export function speichereNurAnsicht(speicher, wert) {
  try {
    if (wert) speicher?.setItem(NUR_ANSICHT_SCHLUESSEL, '1');
    else speicher?.removeItem(NUR_ANSICHT_SCHLUESSEL);
  } catch {
    // Speicher gesperrt (z. B. privates Fenster): Schalter gilt nur fuer diese Sitzung.
  }
}

// Letzte n Nachrichten eines (bereits sortierten) Verlaufs, ohne das Original zu aendern.
export function letzteNachrichten(verlauf, n = 2) {
  if (!Array.isArray(verlauf) || !(n > 0)) return [];
  return verlauf.slice(-n);
}

// Kurzfassung fuer die Nur-Ansicht: nichts zu kuerzen => ganzer Text, sonst Anfang plus Auslassung.
export function kurzfassung(text, maximal = 280) {
  const roh = typeof text === 'string' ? text.trim() : '';
  if (roh.length <= maximal) return { text: roh, gekuerzt: false };
  return { text: `${roh.slice(0, maximal).trimEnd()} …`, gekuerzt: true };
}
