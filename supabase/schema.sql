-- À exécuter une seule fois dans Supabase : SQL Editor → New query → coller → Run.
-- Une ligne par utilisatrice, contenant toutes ses données (JSON).

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Sécurité : chaque compte ne peut lire et modifier que sa propre ligne.
alter table public.app_state enable row level security;

drop policy if exists "lecture de ses données"      on public.app_state;
drop policy if exists "création de ses données"     on public.app_state;
drop policy if exists "modification de ses données" on public.app_state;

create policy "lecture de ses données" on public.app_state
  for select using (auth.uid() = user_id);

create policy "création de ses données" on public.app_state
  for insert with check (auth.uid() = user_id);

create policy "modification de ses données" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
