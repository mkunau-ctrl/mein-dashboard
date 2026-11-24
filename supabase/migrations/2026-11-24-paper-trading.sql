-- Paper-Trading (Alpaca, nur Spielgeld) im Dashboard (2026-11-24)
--
-- Claude schreibt pro Handelsrunde einen Depot-Schnappschuss (paper_snapshots) und
-- Aktivitäten (paper_aktivitaet: Trades, geprüfte Nachrichten, Analysen, Runden-Notizen).
-- Das Dashboard (Finanzen -> Paper-Trading) liest nur. Der Alpaca-Schlüssel kommt NIE hierher.
-- RLS wie überall: user_id = auth.uid(). Idempotent, ohne drop/revoke.

create table if not exists paper_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  erstellt_am   timestamptz not null default now(),
  equity        numeric(14, 2) not null,
  cash          numeric(14, 2) not null default 0,
  -- [{symbol, qty, avg_entry_price, current_price, market_value, unrealized_pl, unrealized_plpc}]
  positionen    jsonb not null default '[]'::jsonb,
  -- [{symbol, side, qty, type, limit_price, stop_price, status}]
  offene_orders jsonb not null default '[]'::jsonb
);

create index if not exists paper_snapshots_user_zeit on paper_snapshots (user_id, erstellt_am desc);

create table if not exists paper_aktivitaet (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  erstellt_am timestamptz not null default now(),
  art         text not null check (art in ('trade', 'nachricht', 'analyse', 'runde')),
  symbol      text,
  titel       text not null,
  text        text not null default '',
  quellen     text not null default '',
  daten       jsonb not null default '{}'::jsonb
);

create index if not exists paper_aktivitaet_user_zeit on paper_aktivitaet (user_id, erstellt_am desc);

alter table paper_snapshots enable row level security;
alter table paper_aktivitaet enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'paper_snapshots' and policyname = 'paper_snapshots_eigene') then
    create policy paper_snapshots_eigene on paper_snapshots
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'paper_aktivitaet' and policyname = 'paper_aktivitaet_eigene') then
    create policy paper_aktivitaet_eigene on paper_aktivitaet
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

-- Die Ranglisten-Konten (rl_rollen) dürfen diese Tabellen nicht sehen: user_id passt nie zu ihnen,
-- die RLS-Policy oben reicht daher aus.
