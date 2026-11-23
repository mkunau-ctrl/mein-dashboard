-- Armwrestling-Ranglisten (eigene Tabellen rl_*, strikt getrennt von Marks Dashboard-Daten).
-- Angewendet 2026-11-23 (ohne drop/revoke: die loesten beim Supabase-Connector eine
-- Rueckfrage aus; Schutz kommt allein ueber RLS, anon/fremde Nutzer sehen 0 Zeilen).
-- Lesen: jeder Benutzer mit einer Rolle in rl_rollen. Schreiben: nur ueber rl_match_eintragen
-- (Rollen chef/liste). Es gibt bewusst keine Insert/Update/Delete-Policies auf den Tabellen.

create table if not exists public.rl_rollen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  benutzer text not null unique,
  rolle text not null check (rolle in ('chef', 'liste', 'zuschauer'))
);

create table if not exists public.rl_listen (
  id text primary key,
  gruppe text not null,
  titel text not null,
  reihenfolge int not null
);

create table if not exists public.rl_personen (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  erstellt_am timestamptz not null default now()
);
create unique index if not exists rl_personen_name_idx on public.rl_personen (lower(name));

create table if not exists public.rl_plaetze (
  liste_id text not null references public.rl_listen(id) on delete cascade,
  person_id uuid not null references public.rl_personen(id) on delete cascade,
  platz int not null check (platz > 0),
  primary key (liste_id, person_id),
  constraint rl_plaetze_platz_eindeutig unique (liste_id, platz) deferrable initially deferred
);

create table if not exists public.rl_matches (
  id uuid primary key default gen_random_uuid(),
  liste_id text not null references public.rl_listen(id),
  a_id uuid not null references public.rl_personen(id),
  a_gewicht numeric(5,1),
  a_alter int,
  b_id uuid not null references public.rl_personen(id),
  b_gewicht numeric(5,1),
  b_alter int,
  runden int not null check (runden between 1 and 99),
  sieger_id uuid not null references public.rl_personen(id),
  sieger_platz_vorher int not null,
  verlierer_platz_vorher int not null,
  eingetragen_von uuid default auth.uid(),
  erstellt_am timestamptz not null default now()
);
create index if not exists rl_matches_liste_idx on public.rl_matches (liste_id, erstellt_am desc);

-- Rolle des angemeldeten Benutzers (null = keine Ranglisten-Rolle, z. B. Marks Dashboard-Konto).
create or replace function public.rl_rolle() returns text
language sql stable security definer set search_path = public as $$
  select rolle from public.rl_rollen where user_id = auth.uid();
$$;

alter table public.rl_rollen enable row level security;
alter table public.rl_listen enable row level security;
alter table public.rl_personen enable row level security;
alter table public.rl_plaetze enable row level security;
alter table public.rl_matches enable row level security;

create policy rl_rollen_lesen on public.rl_rollen for select to authenticated
  using (user_id = auth.uid() or public.rl_rolle() = 'chef');
create policy rl_listen_lesen on public.rl_listen for select to authenticated using (public.rl_rolle() is not null);
create policy rl_personen_lesen on public.rl_personen for select to authenticated using (public.rl_rolle() is not null);
create policy rl_plaetze_lesen on public.rl_plaetze for select to authenticated using (public.rl_rolle() is not null);
create policy rl_matches_lesen on public.rl_matches for select to authenticated using (public.rl_rolle() is not null);

grant select on public.rl_rollen, public.rl_listen, public.rl_personen, public.rl_plaetze, public.rl_matches to authenticated;

-- Leiter-Regel: Neue Person unten. Gewinnt der tiefer Platzierte, nimmt er den Platz des
-- Verlierers; alle dazwischen (inkl. Verlierer) rutschen einen Platz runter. Gewinnt der
-- hoeher Platzierte, aendert sich nichts.
create or replace function public.rl_match_eintragen(
  p_liste text,
  p_a_name text, p_a_gewicht numeric, p_a_alter int,
  p_b_name text, p_b_gewicht numeric, p_b_alter int,
  p_runden int, p_sieger text
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_a text := btrim(coalesce(p_a_name, ''));
  v_b text := btrim(coalesce(p_b_name, ''));
  v_a_id uuid; v_b_id uuid; v_sieger uuid; v_verlierer uuid;
  v_ps int; v_pv int; v_max int;
begin
  if coalesce(public.rl_rolle(), '') not in ('chef', 'liste') then
    raise exception 'Keine Berechtigung zum Eintragen.';
  end if;
  if not exists (select 1 from public.rl_listen where id = p_liste) then
    raise exception 'Unbekannte Liste.';
  end if;
  if char_length(v_a) not between 1 and 60 or char_length(v_b) not between 1 and 60 then
    raise exception 'Namen muessen 1 bis 60 Zeichen haben.';
  end if;
  if lower(v_a) = lower(v_b) then
    raise exception 'Eine Person kann nicht gegen sich selbst antreten.';
  end if;
  if p_sieger not in ('a', 'b') then
    raise exception 'Sieger muss a oder b sein.';
  end if;
  if p_runden is null or p_runden not between 1 and 99 then
    raise exception 'Runden muessen zwischen 1 und 99 liegen.';
  end if;

  perform pg_advisory_xact_lock(hashtext('rl:' || p_liste));

  insert into public.rl_personen (name) values (v_a) on conflict (lower(name)) do nothing;
  insert into public.rl_personen (name) values (v_b) on conflict (lower(name)) do nothing;
  select id into v_a_id from public.rl_personen where lower(name) = lower(v_a);
  select id into v_b_id from public.rl_personen where lower(name) = lower(v_b);

  -- Neue Personen kommen ans Ende der Liste (erst A, dann B).
  if not exists (select 1 from public.rl_plaetze where liste_id = p_liste and person_id = v_a_id) then
    select coalesce(max(platz), 0) into v_max from public.rl_plaetze where liste_id = p_liste;
    insert into public.rl_plaetze (liste_id, person_id, platz) values (p_liste, v_a_id, v_max + 1);
  end if;
  if not exists (select 1 from public.rl_plaetze where liste_id = p_liste and person_id = v_b_id) then
    select coalesce(max(platz), 0) into v_max from public.rl_plaetze where liste_id = p_liste;
    insert into public.rl_plaetze (liste_id, person_id, platz) values (p_liste, v_b_id, v_max + 1);
  end if;

  if p_sieger = 'a' then v_sieger := v_a_id; v_verlierer := v_b_id;
  else v_sieger := v_b_id; v_verlierer := v_a_id; end if;

  select platz into v_ps from public.rl_plaetze where liste_id = p_liste and person_id = v_sieger;
  select platz into v_pv from public.rl_plaetze where liste_id = p_liste and person_id = v_verlierer;

  if v_ps > v_pv then
    update public.rl_plaetze set platz = platz + 1
      where liste_id = p_liste and platz >= v_pv and platz < v_ps;
    update public.rl_plaetze set platz = v_pv
      where liste_id = p_liste and person_id = v_sieger;
  end if;

  insert into public.rl_matches (liste_id, a_id, a_gewicht, a_alter, b_id, b_gewicht, b_alter,
    runden, sieger_id, sieger_platz_vorher, verlierer_platz_vorher)
  values (p_liste, v_a_id, p_a_gewicht, p_a_alter, v_b_id, p_b_gewicht, p_b_alter,
    p_runden, v_sieger, v_ps, v_pv);

  return json_build_object('sieger_platz_vorher', v_ps, 'verlierer_platz_vorher', v_pv,
    'sieger_platz_neu', least(v_ps, v_pv));
end;
$$;

grant execute on function public.rl_match_eintragen(text, text, numeric, int, text, numeric, int, int, text) to authenticated;
grant execute on function public.rl_rolle() to authenticated;

-- 24 Maenner-Listen (6 Klassen x U16/Ue16 x rechts/links) + offene Frauenliste rechts/links.
insert into public.rl_listen (id, gruppe, titel, reihenfolge)
select 'm-' || k.id || '-' || a.id || '-' || s.id, 'Männer',
       k.titel || ' · ' || a.titel || ' · ' || s.titel,
       k.n * 100 + a.n * 10 + s.n
from (values ('u70','U70',1),('u80','U80',2),('u90','U90',3),('u100','U100',4),('u115','U115',5),('ue115','Ü115',6)) k(id, titel, n)
cross join (values ('u16','U16',1),('ue16','Ü16',2)) a(id, titel, n)
cross join (values ('r','Rechts',1),('l','Links',2)) s(id, titel, n)
on conflict (id) do nothing;
insert into public.rl_listen (id, gruppe, titel, reihenfolge) values
  ('f-offen-r', 'Frauen', 'Offen · Rechts', 901),
  ('f-offen-l', 'Frauen', 'Offen · Links', 902)
on conflict (id) do nothing;
