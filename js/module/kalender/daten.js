import { ladeAlles as ladeSendungenUndTermine, legeTerminAn, entferneTermin } from '../sendungen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeRechnungen } from '../rechnungen/daten.js';

export { legeTerminAn, entferneTermin };

// Hinweis: ladeSendungenUndTermine loescht abgelaufene Termine (vor heute) – bestehendes Verhalten.
export async function ladeKalenderDaten() {
  const [s, t, r] = await Promise.all([ladeSendungenUndTermine(), ladeTodos(), ladeRechnungen()]);
  return { termine: s.termine, todos: t.offen, rechnungen: r.rechnungen };
}
