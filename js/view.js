// Reine Entscheidung: welche Grundansicht zeigt die App?
export function entscheideAnsicht(session) {
  return session && session.user ? 'dashboard' : 'login';
}
