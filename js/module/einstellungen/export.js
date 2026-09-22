import { ladeAlles as ladeErnaehrung } from '../ernaehrung/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeBerichtsheft } from '../berichtsheft/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';

export async function sammleAlleDaten() {
  const [ernaehrung, todos, finanzen, berichtsheft, sendungen] = await Promise.all([
    ladeErnaehrung(), ladeTodos(), ladeFinanzen(), ladeBerichtsheft(), ladeSendungen(),
  ]);
  return { ernaehrung, todos, finanzen, berichtsheft, sendungen, exportiert_am: new Date().toISOString() };
}

export function ladeAlsDatei(daten) {
  const blob = new Blob([JSON.stringify(daten, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mein-dashboard-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
