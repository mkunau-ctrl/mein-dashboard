// Reine Berechnungen fuers Lager-Modul. Kein Netz, keine DOM.

const STATUS_PRIORITAET = { fehlt: 0, bestellt: 1, da: 2 };
const STATUS_ZYKLUS = { fehlt: 'bestellt', bestellt: 'da', da: 'fehlt' };

export function warenwert(teile) {
  return teile.reduce((s, t) => s + t.bestand * (t.einzelwert ?? 0), 0);
}

export function sortiereTeile(teile) {
  return [...teile].sort((a, b) => {
    const p = STATUS_PRIORITAET[a.status] - STATUS_PRIORITAET[b.status];
    if (p !== 0) return p;
    return a.bezeichnung.localeCompare(b.bezeichnung, 'de');
  });
}

export function merkliste(teile) {
  return sortiereTeile(teile).filter((t) => t.status !== 'da');
}

export function naechsterStatus(status) {
  return STATUS_ZYKLUS[status];
}
