function ics(text) {
  return String(text ?? '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n');
}

function falte(zeile) {
  const teile = [];
  let rest = zeile;
  while (rest.length > 73) {
    teile.push(rest.slice(0, 73));
    rest = ` ${rest.slice(73)}`;
  }
  teile.push(rest);
  return teile;
}

function stabileId(text) {
  let h = 5381;
  for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

function ohneStriche(datum) {
  return datum.replaceAll('-', '');
}

function naechsterTag(datum) {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function zeitTeile(uhrzeit) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(uhrzeit ?? '').trim());
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return { h: Number(m[1]), min: Number(m[2]) };
}

function zeitstempel(datum, h, min) {
  return `${ohneStriche(datum)}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
}

export function zuIcsDatei(eintraege, jetzt = new Date()) {
  const stempel = jetzt.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Mein Dashboard//DE', 'CALSCALE:GREGORIAN'];
  for (const e of eintraege) {
    const zeit = zeitTeile(e.uhrzeit);
    zeilen.push('BEGIN:VEVENT');
    zeilen.push(`UID:${stabileId(`${e.titel}|${e.datum}|${e.uhrzeit ?? ''}`)}@mein-dashboard`);
    zeilen.push(`DTSTAMP:${stempel}`);
    if (zeit) {
      zeilen.push(`DTSTART:${zeitstempel(e.datum, zeit.h, zeit.min)}`);
      const endeStunde = zeit.h + 1;
      zeilen.push(endeStunde > 23
        ? `DTEND:${zeitstempel(e.datum, 23, 59)}`
        : `DTEND:${zeitstempel(e.datum, endeStunde, zeit.min)}`);
    } else {
      zeilen.push(`DTSTART;VALUE=DATE:${ohneStriche(e.datum)}`);
      zeilen.push(`DTEND;VALUE=DATE:${ohneStriche(naechsterTag(e.datum))}`);
    }
    zeilen.push(`SUMMARY:${ics(e.titel)}`);
    if (e.ort) zeilen.push(`LOCATION:${ics(e.ort)}`);
    if (e.notiz) zeilen.push(`DESCRIPTION:${ics(e.notiz)}`);
    zeilen.push('END:VEVENT');
  }
  zeilen.push('END:VCALENDAR');
  return `${zeilen.flatMap(falte).join('\r\n')}\r\n`;
}
