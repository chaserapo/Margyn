-- Margyn Supabase schema.
-- Run this once in your project's SQL Editor (Supabase dashboard -> SQL Editor -> New query).
-- Safe to re-run: every statement is idempotent (create ... if not exists / drop ... if exists).

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hourly_rate_cents integer not null default 6500,
  target_margin_pct numeric not null default 40,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  client_name text not null,
  quoted_price_cents integer not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  name text not null,
  cost_cents integer not null,
  qty integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  hours numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists materials_job_id_idx on public.materials(job_id);
create index if not exists time_entries_job_id_idx on public.time_entries(job_id);
create index if not exists jobs_user_id_idx on public.jobs(user_id);

-- Row Level Security: every row is only visible/writable by the user who owns it.
alter table public.settings enable row level security;
alter table public.jobs enable row level security;
alter table public.materials enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "settings_select_own" on public.settings;
drop policy if exists "settings_insert_own" on public.settings;
drop policy if exists "settings_update_own" on public.settings;
create policy "settings_select_own" on public.settings for select using (auth.uid() = user_id);
create policy "settings_insert_own" on public.settings for insert with check (auth.uid() = user_id);
create policy "settings_update_own" on public.settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "jobs_select_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
drop policy if exists "jobs_delete_own" on public.jobs;
create policy "jobs_select_own" on public.jobs for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs for delete using (auth.uid() = user_id);

-- Insert is only allowed while the parent job is still open - mirrors the
-- check the old FastAPI backend made before Supabase replaced it.
drop policy if exists "materials_select_own" on public.materials;
drop policy if exists "materials_insert_own" on public.materials;
drop policy if exists "materials_delete_own" on public.materials;
create policy "materials_select_own" on public.materials for select using (auth.uid() = user_id);
create policy "materials_insert_own" on public.materials for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
);
create policy "materials_delete_own" on public.materials for delete using (auth.uid() = user_id);

drop policy if exists "time_entries_select_own" on public.time_entries;
drop policy if exists "time_entries_insert_own" on public.time_entries;
drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_select_own" on public.time_entries for select using (auth.uid() = user_id);
create policy "time_entries_insert_own" on public.time_entries for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
);
create policy "time_entries_delete_own" on public.time_entries for delete using (auth.uid() = user_id);

-- Give every new user a default settings row automatically, so the app never
-- has to handle "no settings row yet" as a special case.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Editing (not just adding/deleting) materials and time entries, plus
-- receipt photos, plus a fast way to sort jobs by margin.

alter table public.materials add column if not exists receipt_path text;

drop policy if exists "materials_update_own" on public.materials;
create policy "materials_update_own" on public.materials for update using (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
) with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
);

drop policy if exists "time_entries_update_own" on public.time_entries;
create policy "time_entries_update_own" on public.time_entries for update using (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
) with check (
  auth.uid() = user_id
  and exists (select 1 from public.jobs j where j.id = job_id and j.status = 'open')
);

-- Private storage bucket for receipt photos, one folder per user
-- (<user_id>/<filename>), enforced by policy below.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "receipts_select_own" on storage.objects;
drop policy if exists "receipts_insert_own" on storage.objects;
drop policy if exists "receipts_delete_own" on storage.objects;
create policy "receipts_select_own" on storage.objects for select using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "receipts_insert_own" on storage.objects for insert with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "receipts_delete_own" on storage.objects for delete using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
