-- Ranglisten: Lesen ohne Anmeldung (Zuschauer brauchen kein Passwort mehr).
-- Nur Lesen auf die vier Ranglisten-Tabellen. rl_rollen bleibt nur fuer angemeldete Benutzer.
-- Schreiben weiterhin nur ueber rl_match_eintragen (Rollen chef/liste), keine Insert/Update/Delete-Policies.
-- Bewusst ohne drop/revoke (loesen beim Supabase-Connector eine Rueckfrage aus).

create policy rl_listen_oeffentlich on public.rl_listen for select to anon using (true);
create policy rl_personen_oeffentlich on public.rl_personen for select to anon using (true);
create policy rl_plaetze_oeffentlich on public.rl_plaetze for select to anon using (true);
create policy rl_matches_oeffentlich on public.rl_matches for select to anon using (true);

grant select on public.rl_listen, public.rl_personen, public.rl_plaetze, public.rl_matches to anon;
