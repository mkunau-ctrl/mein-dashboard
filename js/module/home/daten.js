import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(),
  ]);
  return { finanzen, todos, sendungen };
}
