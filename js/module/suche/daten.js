import { ladeAlles as ladeFinanzen } from '../finanzen/daten.js';
import { ladeAlles as ladeTodos } from '../todos/daten.js';
import { ladeAlles as ladeSendungen } from '../sendungen/daten.js';
import { ladeNotizen } from '../notizen/daten.js';

export async function ladeAlles() {
  const [finanzen, todos, sendungen, notizen] = await Promise.all([
    ladeFinanzen(), ladeTodos(), ladeSendungen(), ladeNotizen(),
  ]);
  return {
    expenses: finanzen.expenses,
    todosOffen: todos.offen,
    todosErledigt: todos.erledigt,
    sendungen: sendungen.sendungen,
    termine: sendungen.termine,
    notizen,
  };
}
