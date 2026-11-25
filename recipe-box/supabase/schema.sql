-- recipe-box cloud accounts. Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Every row belongs to one signed-in user and the rules below make sure nobody can read or change another user's rows.

create table if not exists public.recipes (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          text        not null,
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  bigint      not null,
  server_time timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.categories (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id          text        not null,
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  bigint      not null,
  server_time timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists recipes_server_time on public.recipes (user_id, server_time);
create index if not exists categories_server_time on public.categories (user_id, server_time);

alter table public.recipes enable row level security;
alter table public.categories enable row level security;

drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own categories" on public.categories;
create policy "own categories" on public.categories for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Writes go through these two functions: the later edit wins, so an old phone coming back online cannot overwrite newer work.
create or replace function public.upsert_recipe(p_id text, p_data jsonb, p_deleted boolean, p_updated_at bigint)
returns void language sql security invoker as $$
  insert into public.recipes (id, data, deleted, updated_at, server_time)
  values (p_id, p_data, p_deleted, p_updated_at, clock_timestamp())
  on conflict (user_id, id) do update
    set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at, server_time = clock_timestamp()
    where public.recipes.updated_at <= excluded.updated_at;
$$;

create or replace function public.upsert_category(p_id text, p_data jsonb, p_deleted boolean, p_updated_at bigint)
returns void language sql security invoker as $$
  insert into public.categories (id, data, deleted, updated_at, server_time)
  values (p_id, p_data, p_deleted, p_updated_at, clock_timestamp())
  on conflict (user_id, id) do update
    set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at, server_time = clock_timestamp()
    where public.categories.updated_at <= excluded.updated_at;
$$;

-- Photos: a private bucket, one folder per user.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;

drop policy if exists "own photos read" on storage.objects;
create policy "own photos read" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos insert" on storage.objects;
create policy "own photos insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos update" on storage.objects;
create policy "own photos update" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "own photos delete" on storage.objects;
create policy "own photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
