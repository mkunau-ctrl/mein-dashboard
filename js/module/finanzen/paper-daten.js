import { supabase } from '../../supabase.js';

// Nur Lesen: Claude schreibt die Zeilen (Snapshots/Aktivitaeten) per Supabase-MCP.
export async function ladePaperTrading() {
  const [snap, akt] = await Promise.all([
    supabase.from('paper_snapshots').select('*').order('erstellt_am', { ascending: false }).limit(200),
    supabase.from('paper_aktivitaet').select('*').order('erstellt_am', { ascending: false }).limit(60),
  ]);
  if (snap.error) throw snap.error;
  if (akt.error) throw akt.error;
  return { snapshots: snap.data, aktivitaeten: akt.data };
}
