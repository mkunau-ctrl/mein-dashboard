import test from 'node:test';
import assert from 'node:assert/strict';

// push.js importiert supabase per CDN-URL – hier nur die reine Funktion nachbauen testen
test('base64UrlZuBytes: VAPID-Key hat 65 Bytes und beginnt mit 0x04', async () => {
  globalThis.atob ??= (s) => Buffer.from(s, 'base64').toString('binary');
  const src = (await import('node:fs')).readFileSync(new URL('../js/module/einstellungen/push.js', import.meta.url), 'utf8');
  const fn = src.match(/export function base64UrlZuBytes[\s\S]*?\n}\n/)[0].replace('export ', '');
  const base64UrlZuBytes = new Function(`${fn}; return base64UrlZuBytes;`)();
  const key = src.match(/VAPID_PUBLIC = '([^']+)'/)[1];
  const bytes = base64UrlZuBytes(key);
  assert.equal(bytes.length, 65);
  assert.equal(bytes[0], 4);
});
