// Reine Berechnungen fuers Sendungen-Modul. Kein Netz, keine DOM.

const STATUS_PRIORITAET = { unterwegs: 0, unbekannt: 1, zugestellt: 2 };
const STATUS_ZYKLUS = { unterwegs: 'zugestellt', zugestellt: 'unterwegs', unbekannt: 'unterwegs' };

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
