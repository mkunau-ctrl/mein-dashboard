// Reine Logik zur Klassifikation von E-Mail-Text. Kein Netz, kein Dateisystem.

const ERLAUBTE_TYPEN = ['beleg', 'sendung', 'amazon', 'termin', 'sonstiges'];

const STATUS_SCHLUESSELWOERTER = [
  { kategorie: 'abholbereit', muster: /abholbereit|zur abholung|packstation.*bereit|packstation.*abgegeben|paketshop.*hinterlegt|paketshop.*abgegeben|abholung möglich/i },
  { kategorie: 'zugestellt', muster: /zugestellt|geliefert|ausgeliefert|abgegeben/i },
  { kategorie: 'unterwegs', muster: /unterwegs|zustellfahrzeug|sortierzentrum|im zielland|versandt|übergeben/i },
];

export function kategorisiereStatus(statusText) {
  if (!statusText) return 'unbekannt';
  for (const { kategorie, muster } of STATUS_SCHLUESSELWOERTER) {
    if (muster.test(statusText)) return kategorie;
  }
  return 'unbekannt';
}

export function baustePrompt() {
  return `Du bekommst den Text einer E-Mail über stdin. Klassifiziere sie in genau einen Typ:
- "beleg": Kassenbon/Rechnung für einen Kauf
- "sendung": Versandbestätigung eines Paketdienstes (DHL, Hermes, DPD, GLS, UPS)
- "amazon": Amazon-Bestellbestätigung oder -Versandbestätigung
- "termin": E-Mail mit einer konkreten Frist/einem Termin (z. B. Prüfungsanmeldung, Rechnungsfälligkeit)
- "sonstiges": alles andere, inkl. Werbung/Newsletter

Antworte NUR mit einem einzelnen JSON-Objekt, ohne Markdown-Codeblock, ohne Erklärtext:
- beleg: {"typ":"beleg","haendler":string,"betrag":number,"datum":"YYYY-MM-DD","kategorie":string}
- sendung: {"typ":"sendung","haendler":string,"trackingnummer":string|null,"beschreibung":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- amazon: {"typ":"amazon","beschreibung":string|null,"trackingnummer":string|null,"statusText":string|null,"ort":string|null,"abholcode":string|null,"abholadresse":string|null,"abholzeiten":string|null}
- termin: {"typ":"termin","titel":string,"faelligAm":"YYYY-MM-DD"}
- sonstiges: {"typ":"sonstiges"}

Wenn ein Pflichtfeld nicht sicher aus der Mail hervorgeht, antworte mit {"typ":"sonstiges"}.
Fülle "statusText"/"ort"/"abholcode"/"abholadresse"/"abholzeiten" NUR, wenn der Wert wörtlich oder eindeutig aus der E-Mail hervorgeht. Erfinde keine Werte - bei Unsicherheit null.`;
}

function entferneCodeblock(text) {
  const treffer = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (treffer ? treffer[1] : text).trim();
}

export function parseKlassifikation(rohtext) {
  let objekt;
  try {
    objekt = JSON.parse(entferneCodeblock(rohtext));
  } catch {
    throw new Error(`Antwort ist kein gültiges JSON: ${rohtext}`);
  }
  if (!ERLAUBTE_TYPEN.includes(objekt.typ)) {
    throw new Error(`Unbekannter Typ: ${objekt.typ}`);
  }
  if (objekt.typ === 'beleg' &&
      (!objekt.haendler || typeof objekt.betrag !== 'number' || !objekt.datum)) {
    throw new Error(`Beleg unvollständig: ${rohtext}`);
  }
  if (objekt.typ === 'sendung' && !objekt.haendler) {
    throw new Error(`Sendung unvollständig: ${rohtext}`);
  }
  if (objekt.typ === 'termin' && (!objekt.titel || !objekt.faelligAm)) {
    throw new Error(`Termin unvollständig: ${rohtext}`);
  }
  return objekt;
}
