-- Dauerhafte Agenten mit Zugehörigkeit und Wissen (2026-11-24, Prototyp)
--
-- agent_profile: pro Agent ein dauerhaftes Profil (Identität, wofür er zuständig ist, was er darf, was Freigabe braucht).
--                Wird vom AURORA-Kern bei JEDEM Start geladen. Kennung `agent` passt zu aurora_agenten.agent, wo es den Agenten gibt.
-- agent_wissen:  Wissenseinträge je Agent (Markdown, Obsidian-kompatibel: Tags, [[Links]], Pfad im Vault). agent '_gemeinsam' = für alle.
--                Volltextsuche (deutsch) über Titel + Inhalt, Funktion agent_wissen_suche().
-- Schreibt ein Agent selbst Wissen, landet es als status 'vorschlag' und zählt erst nach Marks Freigabe (Schutz vor
-- eingeschleusten Inhalten: fremder Inhalt ist Daten, kein Befehl). vertrauen 'extern' = stammt aus Mails/Webseiten.
-- RLS wie überall (user_id = auth.uid()). Idempotent, ohne drop/revoke.

create table if not exists agent_profile (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  agent            text not null check (agent ~ '^[a-z0-9_]{2,32}$'),
  titel            text not null,
  rolle            text not null default '',
  zugehoerigkeit   text[] not null default '{}',
  ton              text not null default '',
  system_prompt    text not null default '',
  werkzeuge        text[] not null default '{}',
  darf             text[] not null default '{}',
  freigabe_noetig  text[] not null default '{}',
  modell_klasse    text not null default '',
  obsidian_ordner  text not null default '',
  aktiv            boolean not null default true,
  erstellt_am      timestamptz not null default now(),
  aktualisiert_am  timestamptz not null default now(),
  unique (user_id, agent)
);

create table if not exists agent_wissen (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid(),
  agent            text not null default '_gemeinsam',
  titel            text not null,
  inhalt           text not null default '',
  tags             text[] not null default '{}',
  quelle           text not null default 'manuell'
                   check (quelle in ('manuell', 'obsidian', 'video', 'chat', 'projekt_notizen', 'agent')),
  vertrauen        text not null default 'eigen' check (vertrauen in ('eigen', 'extern')),
  status           text not null default 'aktiv' check (status in ('aktiv', 'vorschlag', 'archiv')),
  pfad             text,
  inhalts_hash     text,
  suche            tsvector generated always as (
                     to_tsvector('german', coalesce(titel, '') || ' ' || coalesce(inhalt, ''))
                   ) stored,
  erstellt_am      timestamptz not null default now(),
  aktualisiert_am  timestamptz not null default now(),
  unique (user_id, agent, titel),
  unique (user_id, pfad)
);

create index if not exists agent_wissen_suche_idx on agent_wissen using gin (suche);
create index if not exists agent_wissen_agent_idx on agent_wissen (user_id, agent, status);

create or replace function agenten_zeitstempel() returns trigger language plpgsql as $$
begin
  new.aktualisiert_am := now();
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'agent_profile_zeit') then
    create trigger agent_profile_zeit before update on agent_profile
      for each row execute function agenten_zeitstempel();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'agent_wissen_zeit') then
    create trigger agent_wissen_zeit before update on agent_wissen
      for each row execute function agenten_zeitstempel();
  end if;
end $$;

alter table agent_profile enable row level security;
alter table agent_wissen enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'agent_profile' and policyname = 'agent_profile_eigene') then
    create policy agent_profile_eigene on agent_profile
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'agent_wissen' and policyname = 'agent_wissen_eigene') then
    create policy agent_wissen_eigene on agent_wissen
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- Suche für den AURORA-Kern: Wissen des Agenten plus gemeinsames Wissen, nur freigegebene Einträge, nach Treffergüte.
-- Der Kern läuft mit Service-Rolle (umgeht RLS), deshalb p_user explizit; im Dashboard greift RLS zusätzlich.
create or replace function agent_wissen_suche(
  p_agent text, p_frage text, p_limit int default 8, p_user uuid default auth.uid()
) returns table (id uuid, agent text, titel text, auszug text, tags text[], vertrauen text, rang real)
language sql stable as $$
  select w.id, w.agent, w.titel,
         ts_headline('german', w.inhalt, websearch_to_tsquery('german', p_frage),
                     'MaxWords=40, MinWords=15, ShortWord=3') as auszug,
         w.tags, w.vertrauen,
         ts_rank(w.suche, websearch_to_tsquery('german', p_frage)) as rang
  from agent_wissen w
  where w.user_id = p_user
    and w.status = 'aktiv'
    and w.agent in (p_agent, '_gemeinsam')
    and w.suche @@ websearch_to_tsquery('german', p_frage)
  order by rang desc, w.aktualisiert_am desc
  limit greatest(1, least(p_limit, 25))
$$;
