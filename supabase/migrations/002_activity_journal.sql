-- 瀚翎帝国 · 勤政录 / 邸报 / 政务工时（Supabase 规范化）
-- 前置：已执行 001_user_empire.sql
-- 在 Supabase Dashboard → SQL Editor 中执行整段。
--
-- 设计要点（与产品约定一致）：
-- 1) 展示时间统一按北京时间 Asia/Shanghai（应用层格式化；库内 timestamptz 存 UTC 瞬时点）
-- 2) 八百里加急（顶栏邸报）：仅叙事，默认 UI 筛「北京今日」；详情不进邸报
-- 3) 勤政录：邸报摘录 + 政务工时 双 Tab；过往全量在云端查
-- 4) 一条政务办理周期 = quest_work_session 一行；点卯/暂停/撤点卯/呈报等写入 operations jsonb 数组
-- 5) 集团军集群 = 一条 session（session_kind = batch）
-- 6) 不设条数上限（Postgres 承担长期归档；本地仅缓存）

-- ---------------------------------------------------------------------------
-- A. 扩展现有 user_empire（巡游四海等仍用 jsonb 快照，与四域同步方式一致）
-- ---------------------------------------------------------------------------

alter table public.user_empire
  add column if not exists grand_tour_json jsonb not null default '{}'::jsonb;

comment on column public.user_empire.grand_tour_json is
  '巡游四海：舆图库藏 + 行在列表（对应客户端 hanling-grand-tour / 密函 grandTour）';

-- 可选：标记客户端同步协议版本（应用升级时递增）
comment on column public.user_empire.client_schema_version is
  '客户端存档协议版本；2 起含 grand_tour_json；勤政录明细见 event_log / quest_work_session 表';

-- ---------------------------------------------------------------------------
-- B. 邸报（永久保留；顶栏默认只展示北京今日，由应用按 beijing_date 筛选）
-- ---------------------------------------------------------------------------

create table if not exists public.event_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- client_log_id: 客户端 EventLog.id，幂等 upsert / 撤回
  client_log_id text not null,
  occurred_at timestamptz not null,
  -- beijing_date: 北京时间自然日，顶栏「今日邸报」索引
  beijing_date date not null,
  message text not null,
  log_type text not null default 'info'
    check (log_type in ('info', 'decree', 'battle', 'treasury')),
  city_name text,
  emphasis text
    check (
      emphasis is null
      or emphasis in ('calamity', 'goldFlash', 'goldFlashLong', 'crimsonDecree')
    ),
  revert jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_log_user_client_log unique (user_id, client_log_id)
);

comment on table public.event_log is
  '八百里加急 / 勤政录·邸报摘录：叙事型邸报，不含政务工时明细';

create index if not exists event_log_user_beijing_date_idx
  on public.event_log (user_id, beijing_date desc, occurred_at desc);

create index if not exists event_log_user_occurred_at_idx
  on public.event_log (user_id, occurred_at desc);

alter table public.event_log enable row level security;

create policy "event_log_select_own"
  on public.event_log for select to authenticated
  using (auth.uid() = user_id);

create policy "event_log_insert_own"
  on public.event_log for insert to authenticated
  with check (auth.uid() = user_id);

create policy "event_log_update_own"
  on public.event_log for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "event_log_delete_own"
  on public.event_log for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- C. 政务工时（一条政务办理周期一行；operations 记录全部动作及时间）
-- ---------------------------------------------------------------------------
--
-- operations jsonb 数组元素约定（客户端写入，kind 可扩展）：
--   timer_start   { "kind","at" }                    -- 点卯开表
--   timer_pause   { "kind","at" }
--   timer_resume  { "kind","at" }
--   timer_cancel  { "kind","at","staminaRefunded"? } -- 撤点卯
--   complete      { "kind","at","durationMs","durationMinutes","expGain?",... } -- 呈报
--   sop_complete  { "kind","at",... }                -- 改易方案
--   shoddy_void   { "kind","at",... }                -- 低于 T_floor 作废
--   batch_start   { "kind","at","cityIds":[] }
--   batch_complete{ "kind","at","durationMs",... }
--   batch_cancel  { "kind","at",... }
-- "at" 建议 ISO-8601 字符串（含 +08:00）或毫秒数 number，应用层统一即可。

create table if not exists public.quest_work_session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_session_id text not null,
  quest_id text not null,
  quest_title text not null,
  city_id text,
  city_display text,
  affiliation text
    check (affiliation is null or affiliation in ('city', 'tongwu')),
  period text
    check (period is null or period in ('早朝', '晌午', '傍晚', '深夜')),
  session_kind text not null default 'single'
    check (session_kind in ('single', 'batch')),
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled', 'voided')),
  operations jsonb not null default '[]'::jsonb,
  batch_city_ids jsonb,
  batch_city_count int,
  standard_minutes int,
  effective_duration_ms bigint,
  effective_duration_minutes numeric(12, 2),
  first_action_at timestamptz,
  last_action_at timestamptz,
  decree_client_log_id text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quest_work_session_user_client unique (user_id, client_session_id),
  constraint quest_work_session_operations_is_array
    check (jsonb_typeof(operations) = 'array')
);

comment on table public.quest_work_session is
  '勤政录·政务工时：同一政务一条办理周期，operations 含点卯/撤点卯/呈报等全部动作及时间';

create index if not exists quest_work_session_user_updated_idx
  on public.quest_work_session (user_id, updated_at desc);

create index if not exists quest_work_session_user_status_idx
  on public.quest_work_session (user_id, status)
  where status = 'open';

create index if not exists quest_work_session_user_quest_idx
  on public.quest_work_session (user_id, quest_id, updated_at desc);

alter table public.quest_work_session enable row level security;

create policy "quest_work_session_select_own"
  on public.quest_work_session for select to authenticated
  using (auth.uid() = user_id);

create policy "quest_work_session_insert_own"
  on public.quest_work_session for insert to authenticated
  with check (auth.uid() = user_id);

create policy "quest_work_session_update_own"
  on public.quest_work_session for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "quest_work_session_delete_own"
  on public.quest_work_session for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- D. updated_at 触发器（与 user_empire 一致）
-- ---------------------------------------------------------------------------

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists event_log_set_updated_at on public.event_log;
create trigger event_log_set_updated_at
  before update on public.event_log
  for each row execute function public.set_row_updated_at();

drop trigger if exists quest_work_session_set_updated_at on public.quest_work_session;
create trigger quest_work_session_set_updated_at
  before update on public.quest_work_session
  for each row execute function public.set_row_updated_at();

-- ---------------------------------------------------------------------------
-- E. 辅助：按北京时间取「今日」date（可在 SQL 报表或校验时用）
-- ---------------------------------------------------------------------------

create or replace function public.beijing_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Shanghai')::date;
$$;

comment on function public.beijing_today() is
  '当前北京时间自然日，供服务端查询或调试';

-- 示例：查某用户今日邸报
-- select * from public.event_log
-- where user_id = auth.uid() and beijing_date = public.beijing_today()
-- order by occurred_at desc;

-- 示例：查某用户全部政务工时（勤政录 Tab2）
-- select * from public.quest_work_session
-- where user_id = auth.uid()
-- order by updated_at desc;
