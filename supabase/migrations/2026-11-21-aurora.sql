-- AURORA im Dashboard (2026-11-21)
--
-- AURORA (läuft auf dem Laptop) schreibt ausgehend Status, Aufgaben und Ereignisse in diese Tabellen
-- und liest daraus Chatnachrichten und Aufträge des Nutzers. Keine offenen Ports am Laptop.
--
-- Sicherheit:
--  * RLS wie bei allen Tabellen: user_id = auth.uid().
--  * Der Nutzer darf nur LESEN sowie NEUE Chatnachrichten/Aufträge anlegen (Status 'neu'). Alles andere
--    (Status, Antworten, Aufgaben) schreibt ausschließlich die Datenbankrolle aurora_sync.
--  * aurora_sync sieht NUR die Tabellen aurora_* (kein Zugriff auf Finanzen, Notizen, ...).
-- Idempotent (mehrfach ausführbar).

-- ---------------------------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------------------------
create table if not exists aurora_agenten (
  user_id              uuid not null default auth.uid(),
  agent                text not null,
  titel                text not null default '',
  beschreibung         text not null default '',
  status               text not null default 'bereit' check (status in ('bereit', 'arbeitet', 'wartet', 'fehler', 'aus')),
  aufgabenklasse       text,
  aktuelle_aufgabe_id  uuid,
  aktuelle_aufgabe     text,
  offene_aufgaben      integer not null default 0,
  heute_aufrufe        integer not null default 0,
  heute_kosten_eur     numeric(10, 4) not null default 0,
  zuletzt_aktiv        timestamptz,
  aktualisiert_am      timestamptz not null default now(),
  primary key (user_id, agent)
);

create table if not exists aurora_aufgaben (
  user_id          uuid not null default auth.uid(),
  id               uuid not null,
  eltern_id        uuid,
  agent            text,
  status           text not null,
  quelle           text not null default 'api',
  eingabe          text not null default '',
  erfolgskriterium text not null default '',
  ergebnis         text,
  kosten_eur       numeric(10, 4) not null default 0,
  erstellt_am      timestamptz not null default now(),
  aktualisiert_am  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists aurora_aufgaben_aktuell on aurora_aufgaben (user_id, aktualisiert_am desc);
create index if not exists aurora_aufgaben_eltern on aurora_aufgaben (user_id, eltern_id);

create table if not exists aurora_ereignisse (
  user_id      uuid not null default auth.uid(),
  aurora_id    bigint not null,
  aufgabe_id   uuid,
  zeitpunkt    timestamptz not null,
  akteur       text not null default '',
  art          text not null default '',
  von_status   text,
  nach_status  text,
  detail       text not null default '',
  primary key (user_id, aurora_id)
);
create index if not exists aurora_ereignisse_zeit on aurora_ereignisse (user_id, zeitpunkt desc);
create index if not exists aurora_ereignisse_aufgabe on aurora_ereignisse (user_id, aufgabe_id);

create table if not exists aurora_status (
  user_id               uuid primary key default auth.uid(),
  budget_limit_eur      numeric(10, 2) not null default 25,
  budget_verbraucht_eur numeric(10, 4) not null default 0,
  budget_reserviert_eur numeric(10, 4) not null default 0,
  budget_stufe          text not null default 'OK',
  kill_switch           boolean not null default false,
  gesundheit            jsonb not null default '{}'::jsonb,
  agenten_aktiv         boolean not null default false,
  aktualisiert_am       timestamptz not null default now()
);

create table if not exists aurora_chat (
  user_id      uuid not null default auth.uid(),
  id           uuid not null default gen_random_uuid(),
  agent        text not null,
  rolle        text not null check (rolle in ('nutzer', 'agent', 'system')),
  text         text not null check (char_length(text) between 1 and 8000),
  status       text not null default 'neu' check (status in ('neu', 'angenommen', 'in_arbeit', 'fertig', 'fehler')),
  aufgabe_id   uuid,
  erstellt_am  timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists aurora_chat_verlauf on aurora_chat (user_id, agent, erstellt_am);
create index if not exists aurora_chat_neu on aurora_chat (user_id, status) where status = 'neu';

create table if not exists aurora_auftraege (
  user_id           uuid not null default auth.uid(),
  id                uuid not null default gen_random_uuid(),
  agent             text not null default 'orchestrator',
  ziel              text not null check (char_length(ziel) between 1 and 8000),
  erfolgskriterium  text not null default '' check (char_length(erfolgskriterium) <= 2000),
  status            text not null default 'neu' check (status in ('neu', 'angenommen', 'abgelehnt', 'fehler')),
  aufgabe_id        uuid,
  fehler            text,
  erstellt_am       timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists aurora_auftraege_neu on aurora_auftraege (user_id, status) where status = 'neu';

-- ---------------------------------------------------------------------------------------------
-- Zeilensicherheit (RLS): der Nutzer liest; legt nur NEUE Nachrichten/Aufträge an
-- ---------------------------------------------------------------------------------------------
alter table aurora_agenten    enable row level security;
alter table aurora_aufgaben   enable row level security;
alter table aurora_ereignisse enable row level security;
alter table aurora_status     enable row level security;
alter table aurora_chat       enable row level security;
alter table aurora_auftraege  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['aurora_agenten', 'aurora_aufgaben', 'aurora_ereignisse', 'aurora_status', 'aurora_chat', 'aurora_auftraege']
  loop
    execute format('drop policy if exists %I on %I', t || '_lesen', t);
    execute format('create policy %I on %I for select to authenticated using (user_id = auth.uid())', t || '_lesen', t);
  end loop;
end $$;

drop policy if exists aurora_chat_anlegen on aurora_chat;
create policy aurora_chat_anlegen on aurora_chat for insert to authenticated
  with check (
    user_id = auth.uid() and rolle = 'nutzer' and status = 'neu' and aufgabe_id is null
    and agent in ('ceo', 'orchestrator', 'research', 'developer', 'qa', 'visual', 'memory', 'security')
  );

drop policy if exists aurora_auftraege_anlegen on aurora_auftraege;
create policy aurora_auftraege_anlegen on aurora_auftraege for insert to authenticated
  with check (
    user_id = auth.uid() and status = 'neu' and aufgabe_id is null and fehler is null
    and agent in ('ceo', 'orchestrator', 'research', 'developer', 'qa', 'visual', 'memory', 'security')
  );

-- ---------------------------------------------------------------------------------------------
-- Datenbankrolle für AURORA (nur diese Tabellen). Passwort wird getrennt gesetzt, nie im Repo.
-- ---------------------------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'aurora_sync') then
    create role aurora_sync login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;

grant usage on schema public to aurora_sync;
grant select, insert, update, delete on
  aurora_agenten, aurora_aufgaben, aurora_ereignisse, aurora_status, aurora_chat, aurora_auftraege
  to aurora_sync;

do $$
declare t text;
begin
  foreach t in array array['aurora_agenten', 'aurora_aufgaben', 'aurora_ereignisse', 'aurora_status', 'aurora_chat', 'aurora_auftraege']
  loop
    execute format('drop policy if exists %I on %I', t || '_sync', t);
    execute format('create policy %I on %I for all to aurora_sync using (true) with check (true)', t || '_sync', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Realtime für sofortige Anzeige (RLS gilt auch hier)
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['aurora_agenten', 'aurora_aufgaben', 'aurora_ereignisse', 'aurora_status', 'aurora_chat']
  loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
