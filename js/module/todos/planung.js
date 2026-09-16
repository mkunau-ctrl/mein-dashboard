// Reine Planungs-Logik fuer Todos/Vorlagen. Kein Netz, keine DOM.
// Datumsangaben als 'YYYY-MM-DD'.

const TAG_MS = 86_400_000;

function tagMs(datumStr) {
  return Date.parse(datumStr.slice(0, 10) + 'T00:00:00Z');
}

function datumStr(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

// 1 = Montag ... 7 = Sonntag
function wochentagVon(datumStr_) {
  const d = new Date(tagMs(datumStr_));
  return ((d.getUTCDay() + 6) % 7) + 1;
}

function letzterTagDesMonats(jahr, monatIndex0) {
  return new Date(Date.UTC(jahr, monatIndex0 + 1, 0)).getUTCDate();
}

export function naechsteFaelligkeit(vorlage, ausgehendVon) {
  if (vorlage.plan_typ === 'taeglich') {
    return datumStr(tagMs(ausgehendVon) + TAG_MS);
  }

  if (vorlage.plan_typ === 'wochentage') {
    const liste = [...(vorlage.plan_wochentage || [])].sort((a, b) => a - b);
    for (let i = 1; i <= 7; i += 1) {
      const kandidat = tagMs(ausgehendVon) + i * TAG_MS;
      if (liste.includes(wochentagVon(datumStr(kandidat)))) return datumStr(kandidat);
    }
    return null;
  }

  if (vorlage.plan_typ === 'monatlich') {
    const d = new Date(tagMs(ausgehendVon));
    let jahr = d.getUTCFullYear();
    let monat = d.getUTCMonth();
    const bauKandidat = (j, m) => {
      const tag = Math.min(vorlage.plan_tag_im_monat, letzterTagDesMonats(j, m));
      return datumStr(Date.UTC(j, m, tag));
    };
    let kandidat = bauKandidat(jahr, monat);
    if (tagMs(kandidat) <= tagMs(ausgehendVon)) {
      monat += 1;
      if (monat > 11) { monat = 0; jahr += 1; }
      kandidat = bauKandidat(jahr, monat);
    }
    return kandidat;
  }

  return null;
}

export function istUeberfaellig(todo, heute) {
  return !!todo.faellig && !todo.erledigt && tagMs(todo.faellig) < tagMs(heute);
}

export function sortiereOffeneTodos(todos, heute) {
  return [...todos].sort((a, b) => {
    const aOhne = !a.faellig;
    const bOhne = !b.faellig;
    if (aOhne !== bOhne) return aOhne ? 1 : -1;
    if (!aOhne && a.faellig !== b.faellig) return tagMs(a.faellig) - tagMs(b.faellig);
    return tagMs(a.erstellt_am) - tagMs(b.erstellt_am);
  });
}
