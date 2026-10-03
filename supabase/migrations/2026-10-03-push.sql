-- Push-Benachrichtigungen (Web-Push, iOS-PWA)
create table if not exists public.push_abos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  geraet text,
  kat_termine boolean not null default true,
  kat_rechnungen boolean not null default true,
  kat_sendungen boolean not null default true,
  kat_flipping boolean not null default true,
  ruhe_aktiv boolean not null default false,
  ruhe_von text not null default '22:00',
  ruhe_bis text not null default '07:00',
  erstellt_am timestamptz not null default now()
);
alter table public.push_abos enable row level security;
create policy push_abos_eigene on public.push_abos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Dedup: welche Meldungen wurden schon verschickt (nur Service-Role, keine Policy)
create table if not exists public.push_gesendet (
  user_id uuid not null,
  schluessel text not null,
  gesendet_am timestamptz not null default now(),
  primary key (user_id, schluessel)
);
alter table public.push_gesendet enable row level security;

-- Serverseitige Konfiguration (VAPID privat, Cron-Secret), nur Service-Role
create table if not exists public.push_konfig (
  key text primary key,
  wert text not null
);
alter table public.push_konfig enable row level security;
