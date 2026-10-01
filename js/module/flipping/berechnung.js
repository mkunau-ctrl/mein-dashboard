export const FUND_STATUS = ['neu', 'angeschrieben', 'gekauft', 'verworfen'];

export function naechsterFundStatus(status) {
  const i = FUND_STATUS.indexOf(status);
  return FUND_STATUS[(i + 1) % FUND_STATUS.length];
}

export function sortiereFunde(funde) {
  const rang = { neu: 0, angeschrieben: 1, gekauft: 2, verworfen: 3 };
  return [...funde].sort((a, b) =>
    (rang[a.status] - rang[b.status]) || String(b.erstellt_am).localeCompare(String(a.erstellt_am)));
}

export function neueFunde(funde) {
  return funde.filter((f) => f.status === 'neu').length;
}

export function sicherHttp(url) {
  return /^https?:\/\//i.test(url) ? url : '#';
}
