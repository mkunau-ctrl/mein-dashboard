export function teileKaufinteresse(nachrichten) {
  const kaufinteresse = nachrichten.filter((n) => n.kaufinteresse || n.status === 'kaufinteresse');
  const rest = nachrichten.filter((n) => !kaufinteresse.includes(n));
  return { kaufinteresse, rest };
}

export function gruppenNachKategorie(nachrichten) {
  const kategorien = [...new Set(nachrichten.map((n) => n.anzeige_kategorie))];
  return kategorien
    .map((kat) => [kat, nachrichten.filter((n) => n.anzeige_kategorie === kat)])
    .filter(([, eintraege]) => eintraege.length > 0);
}
