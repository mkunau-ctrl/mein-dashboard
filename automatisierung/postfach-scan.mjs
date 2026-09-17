#!/usr/bin/env node
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { leseLetztenLauf, schreibeLetztenLauf } from './letzter-lauf.js';
import { baustePrompt, parseKlassifikation } from './klassifizieren.js';

const HIER = dirname(fileURLToPath(import.meta.url));
const ZUSTAND_PFAD = join(HIER, 'letzter-lauf.json');

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
// Marks Auth-UID, siehe CLAUDE.md. Service-Role-Key umgeht RLS, deshalb
// hier explizit statt ueber die Session gesetzt.
const DASHBOARD_USER_ID = 'df0b24a6-6a74-4830-995c-84015161dcc3';

const supabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function klassifiziereMail(text) {
  const rohtext = execFileSync('claude', ['-p', baustePrompt()], {
    input: text.slice(0, 8000),
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return parseKlassifikation(rohtext);
}

async function schreibeErgebnis(k) {
  if (k.typ === 'beleg') {
    const { error } = await supabase.from('expenses').insert({
      user_id: DASHBOARD_USER_ID, betrag: k.betrag, kategorie: k.kategorie || 'sonstiges',
      datum: k.datum, notiz: k.haendler, quelle: 'email',
    });
    if (error) throw new Error(`Beleg speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'sendung' || k.typ === 'amazon') {
    const { error } = await supabase.from('sendungen').insert({
      user_id: DASHBOARD_USER_ID,
      haendler: k.typ === 'amazon' ? 'Amazon' : k.haendler,
      trackingnummer: k.trackingnummer || null,
      beschreibung: k.beschreibung || null,
      quelle: 'email',
    });
    if (error) throw new Error(`Sendung speichern: ${error.message}`);
    return;
  }
  if (k.typ === 'termin') {
    const { error } = await supabase.from('termine').insert({
      user_id: DASHBOARD_USER_ID, titel: k.titel, faellig_am: k.faelligAm, quelle: 'email',
    });
    if (error) throw new Error(`Termin speichern: ${error.message}`);
  }
}

async function main() {
  const seit = leseLetztenLauf(ZUSTAND_PFAD) ?? new Date(Date.now() - 24 * 3_600_000).toISOString();
  const client = new ImapFlow({
    host: 'imap.gmx.net', port: 993, secure: true,
    auth: { user: process.env.GMX_IMAP_USER, pass: process.env.GMX_IMAP_APP_PASSWORT },
  });
  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  let verarbeitet = 0;
  try {
    for await (const nachricht of client.fetch({ since: new Date(seit) }, { source: true })) {
      const geparst = await simpleParser(nachricht.source);
      const text = geparst.text || geparst.html || '';
      if (!text.trim()) continue;
      try {
        const klassifikation = klassifiziereMail(text);
        if (klassifikation.typ !== 'sonstiges') {
          await schreibeErgebnis(klassifikation);
          verarbeitet += 1;
        }
      } catch (fehler) {
        console.error(`Mail "${geparst.subject}" übersprungen: ${fehler.message}`);
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
  schreibeLetztenLauf(ZUSTAND_PFAD, new Date().toISOString());
  console.log(`Postfach-Scan fertig: ${verarbeitet} Eintrag/Einträge übernommen.`);
}

main().catch((fehler) => { console.error(fehler); process.exit(1); });
