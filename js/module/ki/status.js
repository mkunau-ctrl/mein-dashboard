// Reine Status-/Zeit-Helfer fuer das KI-Modul.

export const AGENTEN = [
  'ceo', 'orchestrator', 'research', 'developer', 'qa',
  'visual', 'memory', 'security', 'monitor',
];

// Der monitor ist reiner Beobachter ohne Chat.
export const CHAT_AGENTEN = AGENTEN.filter((a) => a !== 'monitor');

export function istChatbar(agent) {
  return CHAT_AGENTEN.includes(agent);
}

const AGENTEN_STATUS = {
  bereit: { text: 'bereit', farbe: 'grau', symbol: '○' },
  arbeitet: { text: 'arbeitet', farbe: 'gruen', symbol: '●' },
  wartet: { text: 'wartet', farbe: 'gelb', symbol: '◐' },
  fehler: { text: 'Fehler', farbe: 'rot', symbol: '!' },
  aus: { text: 'aus', farbe: 'grau', symbol: '○' },
};

export function statusInfo(status) {
  if (AGENTEN_STATUS[status]) return { ...AGENTEN_STATUS[status] };
  return { text: status || 'unbekannt', farbe: 'grau', symbol: '·' };
}

const AUFGABEN_STATUS = {
  CREATED: { text: 'Erstellt', farbe: 'grau', symbol: '·' },
  QUEUED: { text: 'In Warteschlange', farbe: 'gelb', symbol: '◐' },
  ASSIGNED: { text: 'Zugewiesen', farbe: 'blau', symbol: '▸' },
  RUNNING: { text: 'Läuft', farbe: 'gruen', symbol: '●' },
  REVIEW: { text: 'Prüfung', farbe: 'blau', symbol: '?' },
  COMPLETED: { text: 'Fertig', farbe: 'gruen', symbol: '✓' },
  FAILED: { text: 'Fehlgeschlagen', farbe: 'rot', symbol: '!' },
  RETRY_PENDING: { text: 'Wiederholung', farbe: 'gelb', symbol: '↻' },
  BLOCKED: { text: 'Blockiert', farbe: 'rot', symbol: '■' },
  CANCELLED: { text: 'Abgebrochen', farbe: 'grau', symbol: '×' },
};

export function aufgabenStatusInfo(status) {
  if (AUFGABEN_STATUS[status]) return { ...AUFGABEN_STATUS[status] };
  return { text: status || 'unbekannt', farbe: 'grau', symbol: '·' };
}

// AURORA gilt als offline, wenn der letzte Lebenszeichen-Zeitpunkt mehr als 90 s zurueckliegt.
export function istOffline(aktualisiertAm, jetzt = Date.now()) {
  const zeit = Date.parse(aktualisiertAm);
  if (!Number.isFinite(zeit)) return true;
  return jetzt - zeit > 90_000;
}

// "gerade eben", "5 s", "3 min", "2 h", "2 Tage" - der Aufrufer stellt "vor " davor.
export function vorZeit(iso, jetzt = Date.now()) {
  const zeit = Date.parse(iso);
  if (!Number.isFinite(zeit)) return 'unbekannt';
  const diff = Math.max(0, jetzt - zeit);
  const sekunden = Math.floor(diff / 1000);
  if (sekunden < 2) return 'gerade eben';
  if (sekunden < 60) return `${sekunden} s`;
  const minuten = Math.floor(sekunden / 60);
  if (minuten < 60) return `${minuten} min`;
  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `${stunden} h`;
  const tage = Math.floor(stunden / 24);
  return tage === 1 ? '1 Tag' : `${tage} Tage`;
}

export function kuerze(text, n = 60) {
  if (text === null || text === undefined) return '';
  const sauber = String(text).replace(/\s+/g, ' ').trim();
  if (sauber.length <= n) return sauber;
  return `${sauber.slice(0, Math.max(0, n)).trimEnd()}…`;
}
