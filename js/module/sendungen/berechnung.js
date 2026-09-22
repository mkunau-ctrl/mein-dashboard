// Reine Berechnungen fuers Sendungen-Modul. Kein Netz, keine DOM.

export const STATUS_PRIORITAET = { unterwegs: 0, abholbereit: 1, unbekannt: 2, zugestellt: 3 };

export const STATUS_FORTSCHRITT = { unterwegs: 0, abholbereit: 1, zugestellt: 2 };

export function istStatusFortschritt(bestehenderStatus, neueKategorie) {
  if (!(neueKategorie in STATUS_FORTSCHRITT)) return false;
  const aktuellePrio = STATUS_FORTSCHRITT[bestehenderStatus] ?? -1;
  return STATUS_FORTSCHRITT[neueKategorie] >= aktuellePrio;
}

const STATUS_ZYKLUS = { unterwegs: 'abholbereit', abholbereit: 'zugestellt', zugestellt: 'unterwegs', unbekannt: 'unterwegs' };

export function sortiereSendungen(sendungen) {
  return [...sendungen].sort((a, b) => {
    const p = STATUS_PRIORITAET[a.status] - STATUS_PRIORITAET[b.status];
    if (p !== 0) return p;
    return a.haendler.localeCompare(b.haendler, 'de');
  });
}

export function offeneSendungen(sendungen) {
  return sendungen.filter((s) => s.status !== 'zugestellt').length;
}

export function sortiereTermine(termine) {
  return [...termine]
    .filter((t) => !t.erledigt)
    .sort((a, b) => a.faellig_am.localeCompare(b.faellig_am));
}

export function naechsterSendungStatus(status) {
  return STATUS_ZYKLUS[status];
}

const SENDUNG_ICON_SCHLUESSELWOERTER = [
  { typ: 'handy', muster: /iphone|handy|smartphone|galaxy|pixel/i },
  { typ: 'kopfhoerer', muster: /airpods|kopfhoerer|kopfhörer|earbuds/i },
  { typ: 'kleidung', muster: /shirt|hose|jacke|schuh|kleidung/i },
  { typ: 'elektronik', muster: /grafikkarte|ram|ssd|prozessor|monitor|tastatur/i },
];

export function kategorisiereSendungIcon(text) {
  if (!text) return 'box';
  for (const { typ, muster } of SENDUNG_ICON_SCHLUESSELWOERTER) {
    if (muster.test(text)) return typ;
  }
  return 'box';
}
