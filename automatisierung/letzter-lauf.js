import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export function leseLetztenLauf(pfad) {
  if (!existsSync(pfad)) return null;
  const inhalt = JSON.parse(readFileSync(pfad, 'utf-8'));
  return inhalt.letzterLauf ?? null;
}

export function schreibeLetztenLauf(pfad, isoZeitstempel) {
  writeFileSync(pfad, JSON.stringify({ letzterLauf: isoZeitstempel }, null, 2));
}
