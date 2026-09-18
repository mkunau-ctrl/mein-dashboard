// Reine Suchlogik. Kein Netz, keine DOM.

function treffer(text, suchtext) {
  return String(text ?? '').toLowerCase().includes(suchtext);
}

export function sucheAlles(zustand, suchtextRoh) {
  const suchtext = suchtextRoh.trim().toLowerCase();
  if (!suchtext) return [];

  const ergebnisse = [];

  for (const e of zustand.expenses) {
    if (treffer(e.notiz, suchtext)) {
      ergebnisse.push({ typ: 'expense', titel: e.notiz, info: `${e.betrag.toFixed(2)} €`, ziel: '#/finanzen/ausgaben' });
    }
  }
  for (const t of [...zustand.todosOffen, ...zustand.todosErledigt]) {
    if (treffer(t.text, suchtext)) {
      ergebnisse.push({ typ: 'todo', titel: t.text, info: '', ziel: '#/todos' });
    }
  }
  for (const s of zustand.sendungen) {
    if (treffer(s.haendler, suchtext) || treffer(s.beschreibung, suchtext)) {
      ergebnisse.push({ typ: 'sendung', titel: s.haendler, info: s.beschreibung ?? '', ziel: '#/sendungen/pakete' });
    }
  }
  for (const t of zustand.termine) {
    if (treffer(t.titel, suchtext)) {
      ergebnisse.push({ typ: 'termin', titel: t.titel, info: '', ziel: '#/sendungen/termine' });
    }
  }
  return ergebnisse;
}
