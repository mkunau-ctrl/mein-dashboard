-- Video-Ablage (2026-11-24, Prototyp)
--
-- Mark legt Videos im Dashboard ab (#/videos). Der Browser komprimiert sie lokal (WebCodecs) und
-- lädt nur das kleine Ergebnis hoch. Claude lädt es herunter, zieht mit ffmpeg Einzelbilder heraus
-- und trägt seine Zusammenfassung in videos.claude_notiz ein.
--
-- Bucket "video-ablage" ist ÖFFENTLICH lesbar (Claudes Cloud-Umgebung hat kein Login), aber ohne
-- Auflisten und mit nicht erratbarem Pfad <user_id>/<uuid>-<name>.mp4. Schreiben/Löschen nur im
-- eigenen Ordner. Tabelle videos: RLS wie überall (user_id = auth.uid()).
-- Idempotent, ohne drop/revoke.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('video-ablage', 'video-ablage', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

create table if not exists videos (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid(),
  erstellt_am     timestamptz not null default now(),
  name            text not null,
  pfad            text not null,
  original_bytes  bigint,
  groesse         bigint not null,
  dauer_s         numeric(10, 2),
  breite          int,
  hoehe           int,
  codec           text,
  profil          text,
  kompr_sekunden  numeric(8, 1),
  notiz           text not null default '',
  -- von Claude: was im Video zu sehen/zu hören war, und wann er es angesehen hat
  claude_notiz    text,
  angesehen_am    timestamptz
);

create index if not exists videos_user_zeit on videos (user_id, erstellt_am desc);

alter table videos enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'videos' and policyname = 'videos_eigene') then
    create policy videos_eigene on videos
      for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'video_ablage_eigener_ordner_lesen') then
    create policy video_ablage_eigener_ordner_lesen on storage.objects
      for select to authenticated
      using (bucket_id = 'video-ablage' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'video_ablage_eigener_ordner_schreiben') then
    create policy video_ablage_eigener_ordner_schreiben on storage.objects
      for insert to authenticated
      with check (bucket_id = 'video-ablage' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'video_ablage_eigener_ordner_loeschen') then
    create policy video_ablage_eigener_ordner_loeschen on storage.objects
      for delete to authenticated
      using (bucket_id = 'video-ablage' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;
