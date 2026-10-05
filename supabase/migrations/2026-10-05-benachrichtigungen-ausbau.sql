-- Benachrichtigungen Ausbau (2026-10-05): Glocke (meldungen) + Schalter je Ausloeser

-- Meldungsliste fuer die Glocke in der App; auch Eingang fuer externe Quellen (art='email')
create table if not exists public.meldungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schluessel text not null,
  art text not null,
  titel text not null,
  text text not null default '',
  url text not null default '#/home',
  gelesen boolean not null default false,
  erstellt_am timestamptz not null default now(),
  unique (user_id, schluessel)
);
create index if not exists meldungen_user_zeit on public.meldungen (user_id, erstellt_am desc);
alter table public.meldungen enable row level security;
create policy meldungen_eigene on public.meldungen
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Ein Schalter je Ausloeser (jsonb {art: bool}); fehlender Eintrag = an
create table if not exists public.benachrichtigung_einst (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  schalter jsonb not null default '{}'::jsonb,
  aktualisiert_am timestamptz not null default now()
);
alter table public.benachrichtigung_einst enable row level security;
create policy benachrichtigung_einst_eigene on public.benachrichtigung_einst
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Alte grobe Kategorie-Schalter entfallen (ersetzt durch benachrichtigung_einst)
alter table public.push_abos
  drop column if exists kat_termine,
  drop column if exists kat_rechnungen,
  drop column if exists kat_sendungen,
  drop column if exists kat_flipping;
