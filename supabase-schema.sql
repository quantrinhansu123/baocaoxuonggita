-- Guitar Sài Thành · Studio v3
-- Chạy toàn bộ file này trong Supabase Dashboard → SQL Editor

-- Bài viết (gallery)
create table if not exists public.posts (
  id bigint primary key,
  title text not null default '',
  ch text default '',
  views integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  date text,
  url text default '',
  emoji text default '📄',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Toàn bộ workspace (scripts, kanban, comments, leads, ...)
create table if not exists public.studio_data (
  workspace_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists posts_date_idx on public.posts (date desc nulls last);
create index if not exists studio_data_updated_idx on public.studio_data (updated_at desc);

alter table public.posts enable row level security;
alter table public.studio_data enable row level security;

drop policy if exists "studio posts all" on public.posts;
create policy "studio posts all" on public.posts
  for all using (true) with check (true);

drop policy if exists "studio data all" on public.studio_data;
create policy "studio data all" on public.studio_data
  for all using (true) with check (true);

-- Seed workspace rỗng (tuỳ chọn)
insert into public.studio_data (workspace_id, payload)
values ('guitar_saigon', '{}'::jsonb)
on conflict (workspace_id) do nothing;
