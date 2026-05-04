-- Esegui questo script nel SQL Editor di Supabase.
-- Schema compatibile con il CSV attuale: id,name,image_url,set,rarity,type,version

create extension if not exists pgcrypto;

create table if not exists public.cards (
  uuid uuid primary key default gen_random_uuid(),
  id integer not null,
  name text not null,
  image_url text,
  "set" text,
  rarity text,
  type text,
  version text,
  created_at timestamptz not null default now()
);

-- Evita duplicati della stessa variante carta nello stesso set
create unique index if not exists cards_unique_variant
  on public.cards (id, name, coalesce("set", ''), coalesce(version, ''));

alter table public.cards enable row level security;

-- Lettura carte per utenti autenticati nell'app
create policy if not exists "Authenticated users can read cards"
on public.cards
for select
to authenticated
using (true);

