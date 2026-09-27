import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';
import { ladeAlles as ladeHandyreparatur } from '../handyreparatur/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen, handyreparatur] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(), ladeHandyreparatur(),
  ]);
  return { finanzen, todos, sendungen, handyreparatur };
}
