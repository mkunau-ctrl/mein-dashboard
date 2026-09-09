// Reine Fälligkeits-Logik für Checklisten-Punkte. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

const TAG_MS = 86_400_000;

// 'YYYY-MM-DD...' -> UTC-Mitternacht als Millisekunden
function tagMs(datumStr) {
  return Date.parse(datumStr.slice(0, 10) + 'T00:00:00Z');
}

// 1 = Montag ... 7 = Sonntag
export function wochentagVon(datumStr) {
  const d = new Date(tagMs(datumStr));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

export function istFaellig(item, datumStr, kontext = {}) {
  if (tagMs(datumStr) < tagMs(item.erstellt_am)) return false;

  if (item.plan_typ === 'taeglich') return true;

  if (item.plan_typ === 'wochentage') {
    const liste = item.plan_wochentage || [];
    return liste.includes(wochentagVon(datumStr));
  }

  if (item.plan_typ === 'intervall') {
    const letzte = kontext.letzteErledigung;
    if (!letzte) return true;
    const abstandTage = Math.round((tagMs(datumStr) - tagMs(letzte)) / TAG_MS);
    return abstandTage >= item.plan_intervall_tage;
  }

  return false;
}
