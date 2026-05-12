-- 瀚翎帝国：每用户一行快照（与方案文档 §5.3 一致）
-- 在 Supabase Dashboard → SQL Editor 中执行整段；或 supabase db push 使用 migrations。

create table if not exists public.user_empire (
  user_id uuid primary key references auth.users (id) on delete cascade,
  emperor_json jsonb not null default '{}'::jsonb,
  map_json jsonb not null default '{}'::jsonb,
  quest_json jsonb not null default '{}'::jsonb,
  event_json jsonb not null default '{}'::jsonb,
  prefs_json jsonb not null default '{}'::jsonb,
  client_schema_version int not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.user_empire is 'Zustand 四域 + prefs 云端权威快照（模式 B）';

alter table public.user_empire enable row level security;

create policy "user_empire_select_own"
  on public.user_empire
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_empire_insert_own"
  on public.user_empire
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_empire_update_own"
  on public.user_empire
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.user_empire_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_empire_set_updated_at on public.user_empire;

create trigger user_empire_set_updated_at
  before update on public.user_empire
  for each row
  execute function public.user_empire_set_updated_at();
