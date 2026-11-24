#!/usr/bin/env node
// Gleicht den Obsidian-Vault mit agent_wissen ab (läuft auf Marks PC).
//   node automatisierung/obsidian-sync.mjs            # abgleichen
//   node automatisierung/obsidian-sync.mjs --trocken  # nur anzeigen, nichts schreiben
// Braucht in automatisierung/.env: SUPABASE_SERVICE_ROLE_KEY und OBSIDIAN_VAULT (Pfad zum Vault-Ordner).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { fuehreSyncAus } from './obsidian-sync-lauf.js';

const HIER = dirname(fileURLToPath(import.meta.url));
config({ path: join(HIER, '.env') });

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
const DASHBOARD_USER_ID = 'df0b24a6-6a74-4830-995c-84015161dcc3';

const vault = process.env.OBSIDIAN_VAULT;
if (!vault) { console.error('OBSIDIAN_VAULT fehlt in automatisierung/.env (Pfad zum Vault-Ordner).'); process.exit(2); }
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) { console.error('SUPABASE_SERVICE_ROLE_KEY fehlt in automatisierung/.env.'); process.exit(2); }

const client = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const trocken = process.argv.includes('--trocken');

try {
  const b = await fuehreSyncAus({ vault, client, userId: DASHBOARD_USER_ID, trocken });
  console.log(`${trocken ? '[Trockenlauf] ' : ''}Abgleich fertig: ${b.hochgeladen.length} hochgeladen, ${b.aktualisiertRemote.length} im Dashboard aktualisiert, `
    + `${b.heruntergeladen.length} heruntergeladen, ${b.aktualisiertLokal.length} im Vault aktualisiert, ${b.unveraendert} unverändert.`);
  for (const k of b.konflikte) console.warn(`KONFLIKT ${k}`);
  for (const f of b.fehler) console.error(`FEHLER ${f}`);
  for (const u of b.ungueltig) console.warn(`UNGÜLTIG ${u}`);
  for (const h of b.hinweise) console.log(`HINWEIS ${h}`);
  process.exit(b.fehler.length > 0 ? 1 : 0);
} catch (e) {
  console.error(e);
  process.exit(1);
}
