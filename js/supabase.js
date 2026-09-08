import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://vogztxoaqbnuciboughd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zTN1v_De9oUhYNCstYf9nA_0dEaD8Y-';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
