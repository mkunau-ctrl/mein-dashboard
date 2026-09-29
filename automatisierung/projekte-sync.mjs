#!/usr/bin/env node
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const HIER = dirname(fileURLToPath(import.meta.url));
config({ path: join(HIER, '.env') });

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
// Marks Auth-UID, siehe CLAUDE.md. Service-Role-Key umgeht RLS, deshalb
// hier explizit gesetzt (gleiches Muster wie postfach-scan.mjs).
const DASHBOARD_USER_ID = 'df0b24a6-6a74-4830-995c-84015161dcc3';
const PROJEKTE_ORDNER = 'C:\\Users\\PC\\Projekte';

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function findeProjekte() {
  const gefunden = [];
  for (const eintrag of readdirSync(PROJEKTE_ORDNER, { withFileTypes: true })) {
    if (!eintrag.isDirectory()) continue;
    const pfad = join(PROJEKTE_ORDNER, eintrag.name, 'CLAUDE.md');
    if (existsSync(pfad)) gefunden.push({ name: eintrag.name, inhalt: readFileSync(pfad, 'utf-8') });
  }
  return gefunden;
}

async function main() {
  const projekte = findeProjekte();

  if (projekte.length > 0) {
    const { error } = await supabase.from('claude_projekte').upsert(
      projekte.map((p) => ({
        user_id: DASHBOARD_USER_ID, name: p.name, inhalt: p.inhalt,
        sync_zeitstempel: new Date().toISOString(),
      })),
      { onConflict: 'user_id,name' },
    );
    if (error) throw new Error(`Projekte speichern: ${error.message}`);
  }

  // Projekte, die es lokal nicht mehr gibt, aus Supabase entfernen (erst nach erfolgreichem Upsert).
  const { data: vorhanden, error: leseFehler } = await supabase.from('claude_projekte')
    .select('name').eq('user_id', DASHBOARD_USER_ID);
  if (leseFehler) throw new Error(`Projekte lesen: ${leseFehler.message}`);
  const aktuell = new Set(projekte.map((p) => p.name));
  const weg = vorhanden.map((v) => v.name).filter((n) => !aktuell.has(n));
  if (weg.length > 0) {
    const { error } = await supabase.from('claude_projekte')
      .delete().eq('user_id', DASHBOARD_USER_ID).in('name', weg);
    if (error) throw new Error(`Veraltete Projekte löschen: ${error.message}`);
  }

  console.log(`Projekte-Sync fertig: ${projekte.length} Projekt(e) synchronisiert, ${weg.length} entfernt.`);
}

main().catch((fehler) => { console.error(fehler); process.exit(1); });
