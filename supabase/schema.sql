-- ============================================================
--  PokeScroll → pokiman  |  Supabase-Schema
--  Spiellogik unverändert, Datenquelle = eigene Cloud-DB.
--  Anwenden: Supabase Dashboard → SQL Editor → komplett einfügen → Run.
-- ============================================================

-- 1) Tabelle: pokiman (Monster-Karten, angelehnt an PokeAPI-Stats)
create table if not exists public.pokiman (
  id          integer primary key,
  name_de     text      not null,
  name_en     text      not null unique,
  artwork     text      not null,                       -- öffentliche Storage-URL
  types       text[]    not null default '{}',         -- z.B. {bug,dark}
  stats       jsonb     not null,                       -- [{name,value}] wie PokeAPI
  strength    integer   not null,                       -- kampfnaher Gesamtwert
  height      numeric,                                 -- dm (wie PokeAPI)
  weight      numeric                                  -- hg (wie PokeAPI)
);

-- 2) RLS: öffentliches Lesen (Spiel braucht nur SELECT)
alter table public.pokiman enable row level security;
drop policy if exists "public read pokiman" on public.pokiman;
create policy "public read pokiman"
  on public.pokiman for select
  using (true);

-- 3) Storage-Bucket für die Monster-Bilder (öffentlich)
insert into storage.buckets (id, name, public)
values ('pokiman', 'pokiman', true)
on conflict (id) do update set public = true;

-- 4) Storage-Policies: lesen öffentlich, schreiben nur Service-Role
drop policy if exists "public read pokiman objects" on storage.objects;
create policy "public read pokiman objects"
  on storage.objects for select
  using (bucket_id = 'pokiman');

drop policy if exists "service write pokiman objects" on storage.objects;
create policy "service write pokiman objects"
  on storage.objects for insert to service_role
  with check (bucket_id = 'pokiman');
