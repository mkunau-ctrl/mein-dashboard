-- Wochenplan, Wochenaufgaben, "Zu klaeren", Tagesbriefing (2026-10-05)

alter table public.termine add column if not exists bis_uhrzeit text;

-- Grundwoche: wiederkehrende Bloecke (rhythmus = {anker, modus: mit|ohne} fuer den 2-Wochen-Gottesdienst Lemgo)
create table if not exists public.wochenplan_bloecke (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  schluessel text not null,
  wochentag int not null check (wochentag between 1 and 7),
  von text not null,
  bis text not null,
  art text not null check (art in ('arbeit','weg','fest','flex','essen','routine','schlaf')),
  titel text not null,
  rhythmus jsonb,
  ende_offen boolean not null default false,
  unique (user_id, schluessel)
);

-- einzelnen wiederkehrenden Block an einem Datum aussetzen
create table if not exists public.wochenplan_ausnahmen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  datum date not null,
  block_schluessel text not null,
  notiz text,
  unique (user_id, datum, block_schluessel)
);

-- Wochenaufgaben: erledigt_woche = Montag der Woche, in der erledigt wurde (Montag-Reset ohne Cron)
create table if not exists public.wochenaufgaben (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titel text not null,
  dauer_min int not null default 0,
  pflicht boolean not null default true,
  erledigt_woche date,
  sortierung int not null default 0
);

create table if not exists public.zu_klaeren (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titel text not null,
  notiz text,
  erledigt boolean not null default false,
  erledigt_am timestamptz,
  erstellt_am timestamptz not null default now(),
  sortierung int not null default 0
);

alter table public.wochenplan_bloecke enable row level security;
alter table public.wochenplan_ausnahmen enable row level security;
alter table public.wochenaufgaben enable row level security;
alter table public.zu_klaeren enable row level security;
create policy wochenplan_bloecke_eigene on public.wochenplan_bloecke for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wochenplan_ausnahmen_eigene on public.wochenplan_ausnahmen for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wochenaufgaben_eigene on public.wochenaufgaben for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy zu_klaeren_eigene on public.zu_klaeren for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sendezeiten des Tagesbriefings je Wochentag (1 = Montag ... 7 = Sonntag)
alter table public.benachrichtigung_einst add column if not exists briefing_zeiten jsonb not null
  default '{"1":"06:00","2":"06:00","3":"06:00","4":"06:00","5":"06:00","6":"09:30","7":"08:30"}'::jsonb;
-- Grundwoche
insert into public.wochenplan_bloecke (user_id, schluessel, wochentag, von, bis, art, titel, rhythmus, ende_offen) values
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-aufstehen',1,'06:15','06:45','routine','Aufstehen, Frühstück, anziehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-zug',1,'06:45','07:30','weg','Zug nach Lage',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-fruehstueck2',1,'09:15','09:30','essen','2. Frühstück',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-mittag',1,'12:30','13:00','essen','Mittagessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-arbeit',1,'07:30','16:00','arbeit','Arbeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-jungschar',1,'16:00','18:00','fest','Jungschar',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-flex1',1,'18:00','19:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-abendessen',1,'19:00','20:00','essen','Abendessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-flex2',1,'20:00','22:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mo-schlaf',1,'22:30','22:30','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-aufstehen',2,'06:15','06:45','routine','Aufstehen, Frühstück, anziehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-zug',2,'06:45','07:30','weg','Zug nach Lage',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-fruehstueck2',2,'09:15','09:30','essen','2. Frühstück',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-mittag',2,'12:30','13:00','essen','Mittagessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-arbeit',2,'07:30','16:00','arbeit','Arbeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-heimweg',2,'16:00','16:30','weg','Heimweg',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-flex1',2,'16:30','17:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-gespraech',2,'17:30','18:30','fest','Gespräch bei Frau Wiethaupt',null,true),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-flex2',2,'18:30','19:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-abendessen',2,'19:00','20:00','essen','Abendessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-flex3',2,'20:00','22:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','di-schlaf',2,'22:30','22:30','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-aufstehen',3,'06:15','06:45','routine','Aufstehen, Frühstück, anziehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-zug',3,'06:45','07:30','weg','Zug nach Lage',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-fruehstueck2',3,'09:15','09:30','essen','2. Frühstück',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-mittag',3,'12:30','13:00','essen','Mittagessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-arbeit',3,'07:30','16:00','arbeit','Arbeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-heimweg',3,'16:00','16:30','weg','Heimweg',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-flex1',3,'16:30','19:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-abendessen',3,'19:00','20:00','essen','Abendessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-flex2',3,'20:00','22:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','mi-schlaf',3,'22:30','22:30','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-aufstehen',4,'06:15','06:45','routine','Aufstehen, Frühstück, anziehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-zug',4,'06:45','07:30','weg','Zug nach Lage',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-fruehstueck2',4,'09:15','09:30','essen','2. Frühstück',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-mittag',4,'12:30','13:00','essen','Mittagessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-arbeit',4,'07:30','16:00','arbeit','Arbeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-heimweg',4,'16:00','16:30','weg','Heimweg',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-flex1',4,'16:30','17:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-gespraech',4,'17:30','18:30','fest','Gespräch bei Frau Wiethaupt',null,true),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-snack',4,'18:30','19:00','essen','Snack',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-jugend',4,'19:00','22:00','fest','Jugend in Detmold',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-flex2',4,'22:00','23:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','do-schlaf',4,'23:00','23:00','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-aufstehen',5,'06:15','06:45','routine','Aufstehen, Frühstück, anziehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-zug',5,'06:45','07:30','weg','Zug nach Lage',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-fruehstueck2',5,'09:15','09:30','essen','2. Frühstück',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-mittag',5,'12:30','13:00','essen','Mittagessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-arbeit',5,'07:30','14:00','arbeit','Arbeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-heimweg',5,'14:00','15:00','weg','Heimweg',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-flex1',5,'15:00','18:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-snack',5,'18:30','19:00','essen','Snack',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-jugend',5,'19:00','22:00','fest','Jugend in Lemgo (Homebase, CVJM)',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-flex2',5,'22:00','23:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','fr-schlaf',5,'23:00','23:00','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','sa-aufstehen',6,'10:00','11:00','routine','Aufstehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','sa-flex1',6,'11:00','19:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','sa-abendessen',6,'19:00','20:00','essen','Abendessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','sa-flex2',6,'20:00','23:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','sa-schlaf',6,'23:00','23:00','schlaf','Schlafen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-aufstehen',7,'09:00','09:30','routine','Aufstehen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-abholung',7,'09:30','10:00','fest','Ich werde abgeholt',null,true),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-gottesdienst',7,'10:00','14:00','fest','Gottesdienst Immanuel',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-flex1',7,'14:00','16:00','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-lemgo1',7,'16:00','19:00','fest','Gottesdienst Lemgo (Livestream)','{"anker":"2026-10-18","modus":"mit"}'::jsonb,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-flex-ohne1',7,'16:00','19:00','flex','Flexible Zeit','{"anker":"2026-10-18","modus":"ohne"}'::jsonb,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-abendessen',7,'19:00','20:00','essen','Abendessen',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-lemgo2',7,'20:00','21:00','fest','Kaffee, Kuchen, Gemeinschaft','{"anker":"2026-10-18","modus":"mit"}'::jsonb,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-flex-ohne2',7,'20:00','21:00','flex','Flexible Zeit','{"anker":"2026-10-18","modus":"ohne"}'::jsonb,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-flex2',7,'21:00','22:30','flex','Flexible Zeit',null,false),
('df0b24a6-6a74-4830-995c-84015161dcc3','so-schlaf',7,'22:30','22:30','schlaf','Schlafen',null,false)
on conflict (user_id, schluessel) do nothing;
insert into public.wochenaufgaben (user_id, titel, dauer_min, pflicht, sortierung) values
('df0b24a6-6a74-4830-995c-84015161dcc3','Bad putzen',45,true,1),
('df0b24a6-6a74-4830-995c-84015161dcc3','Kochen',60,true,2),
('df0b24a6-6a74-4830-995c-84015161dcc3','Einkaufen gehen',60,true,3),
('df0b24a6-6a74-4830-995c-84015161dcc3','Sport machen',45,true,4),
('df0b24a6-6a74-4830-995c-84015161dcc3','Woche planen',10,true,5),
('df0b24a6-6a74-4830-995c-84015161dcc3','Tag planen',5,true,6),
('df0b24a6-6a74-4830-995c-84015161dcc3','Kalender eintragen',10,true,7),
('df0b24a6-6a74-4830-995c-84015161dcc3','Alltägliches',5,true,8),
('df0b24a6-6a74-4830-995c-84015161dcc3','Zimmer aufräumen',0,false,9),
('df0b24a6-6a74-4830-995c-84015161dcc3','An meinen Projekten weiterarbeiten',0,false,10),
('df0b24a6-6a74-4830-995c-84015161dcc3','Handys reparieren (Nebengeschäft)',0,false,11);
insert into public.zu_klaeren (user_id, titel, notiz, sortierung) values
('df0b24a6-6a74-4830-995c-84015161dcc3','Zahnarzttermin finden (Montag?)','Ich glaube, er ist an einem Montag. Er stand in keinem durchsuchten Kalender. Termin oder Mail dazu finden.',1),
('df0b24a6-6a74-4830-995c-84015161dcc3','Jugendband-Probe: fest? Kollidiert mit Essen','Kalender sagt alle zwei Wochen montags 18:00-20:00 (zuletzt 05.10.2026). Kollidiert mit Abendessen um 19:00. Klären, ob die Probe fest ist, und dann in die Wochenstruktur aufnehmen.',2),
('df0b24a6-6a74-4830-995c-84015161dcc3','Do Heimweg Detmold: Zug oder abgeholt?','Jugend endet 22:00. Wie komme ich heim (Zug oder abgeholt) und wann bin ich im Bett? Bis dahin sind nur ca. 7 Stunden Schlaf sicher.',3),
('df0b24a6-6a74-4830-995c-84015161dcc3','So mit Lemgo-Gottesdienst: Essen um 19:00?','Wo esse ich um 19:00, wenn ich noch in Lemgo bin?',4),
('df0b24a6-6a74-4830-995c-84015161dcc3','Jungschar XXL: Ort und Uhrzeiten','Ort (Seefall oder Lemgo) und genaue Uhrzeiten klären.',5),
('df0b24a6-6a74-4830-995c-84015161dcc3','Gespräche Frau Wiethaupt: Dauer prüfen','Ich habe 1 Stunde angenommen. Prüfen.',6),
('df0b24a6-6a74-4830-995c-84015161dcc3','Fr 9.10.: Zeitplan Bielefeld und XXL','Zeit zwischen Arbeitsende, Bielefeld und XXL-Beginn prüfen (14:00 Zug, 15:00 Termin, danach Abfahrt zur Übernachtung).',7);

-- Einmalige Termine und Ausnahme (Stand 05.10.2026)
insert into public.termine (user_id, titel, faellig_am, uhrzeit, bis_uhrzeit, ort, notiz, quelle) values
('df0b24a6-6a74-4830-995c-84015161dcc3','Bei Dennis im Lager','2026-10-07','16:00','20:00',null,'Nur diese Woche','chat'),
('df0b24a6-6a74-4830-995c-84015161dcc3','Handys abholen Bielefeld','2026-10-09','15:00',null,'Bielefeld','Tankstellenfirma. Zug ab 14:00, Dauer ca. 1 h angenommen','chat'),
('df0b24a6-6a74-4830-995c-84015161dcc3','Jungschar XXL (Übernachtung)','2026-10-09',null,null,'Seefall oder Lemgo (offen)','Übernachtung Fr auf Sa, Uhrzeiten offen','chat'),
('df0b24a6-6a74-4830-995c-84015161dcc3','Jungschar XXL (Übernachtung)','2026-10-10',null,null,'Seefall oder Lemgo (offen)','Übernachtung Fr auf Sa, Uhrzeiten offen','chat');
insert into public.wochenplan_ausnahmen (user_id, datum, block_schluessel, notiz) values
('df0b24a6-6a74-4830-995c-84015161dcc3','2026-10-09','fr-jugend','Jugend in Lemgo entfällt wegen Jungschar XXL');
