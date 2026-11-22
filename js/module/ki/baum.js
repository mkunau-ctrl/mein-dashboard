// Baut aus flachen AURORA-Aufgaben einen Baum (Wurzeln mit Kindern).
// Robust gegen verwaiste Kinder, fehlende ids und Zyklen.

const STATUS_PRIORITAET = {
  RUNNING: 0,
  ASSIGNED: 1,
  QUEUED: 2,
  CREATED: 3,
  REVIEW: 4,
  RETRY_PENDING: 5,
  BLOCKED: 6,
  FAILED: 7,
  COMPLETED: 8,
  CANCELLED: 9,
};

function zeitWert(aufgabe) {
  const zeit = Date.parse(aufgabe?.erstellt_am || aufgabe?.aktualisiert_am);
  return Number.isFinite(zeit) ? zeit : 0;
}

function sortiere(a, b) {
  const pa = STATUS_PRIORITAET[a.status] ?? 20;
  const pb = STATUS_PRIORITAET[b.status] ?? 20;
  if (pa !== pb) return pa - pb;
  const t = zeitWert(b) - zeitWert(a);
  if (t !== 0) return t;
  return String(a.id ?? '').localeCompare(String(b.id ?? ''));
}

function mitKindern(aufgabe) {
  return { ...aufgabe, kinder: [] };
}

export function baueBaeume(aufgaben) {
  const liste = Array.isArray(aufgaben) ? aufgaben.filter(Boolean) : [];
  const knoten = new Map();
  const ohneId = [];

  for (const aufgabe of liste) {
    if (aufgabe.id === null || aufgabe.id === undefined) {
      ohneId.push(mitKindern(aufgabe));
    } else if (!knoten.has(aufgabe.id)) {
      knoten.set(aufgabe.id, mitKindern(aufgabe));
    }
  }

  const elternVon = new Map();
  const wurzeln = [];

  // Zyklus-Pruefung ausschliesslich ueber bereits gesetzte Elternkanten:
  // so wird pro Zyklus genau eine Kante gekappt, alle Knoten bleiben einmalig.
  const wuerdeZyklusErzeugen = (kindId, elternId) => {
    const gesehen = new Set([kindId]);
    let aktuell = elternId;
    while (aktuell !== null && aktuell !== undefined) {
      if (gesehen.has(aktuell)) return true;
      gesehen.add(aktuell);
      aktuell = elternVon.get(aktuell) ?? null;
    }
    return false;
  };

  for (const aufgabe of knoten.values()) {
    const elternId = aufgabe.eltern_id;
    if (elternId !== null && elternId !== undefined && knoten.has(elternId)
        && elternId !== aufgabe.id && !wuerdeZyklusErzeugen(aufgabe.id, elternId)) {
      elternVon.set(aufgabe.id, elternId);
      knoten.get(elternId).kinder.push(aufgabe);
    } else {
      wurzeln.push(aufgabe);
    }
  }

  for (const wurzel of wurzeln) wurzel.kinder.sort(sortiere);
  for (const knotenEintrag of knoten.values()) knotenEintrag.kinder.sort(sortiere);
  wurzeln.sort(sortiere);
  ohneId.sort(sortiere);
  return [...wurzeln, ...ohneId];
}
