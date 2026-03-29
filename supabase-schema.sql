-- ============================================================
-- SplitTrip — Supabase Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. TRIPS
create table if not exists trips (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  code          text not null unique,
  base_currency text not null default 'CHF',
  created_at    timestamptz not null default now()
);

-- 2. MEMBERS
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips(id) on delete cascade,
  name       text not null,
  joined_at  timestamptz not null default now()
);

-- 3. EXPENSES
create table if not exists expenses (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips(id) on delete cascade,
  title        text not null,
  amount       numeric(12,2) not null,
  currency     text not null default 'CHF',
  category     text not null default 'other',
  paid_by_id   uuid not null references members(id),
  shared_with  uuid[] not null default '{}',
  receipt_url  text,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_members_trip   on members(trip_id);
create index if not exists idx_expenses_trip  on expenses(trip_id);
create index if not exists idx_trips_code     on trips(code);

-- ── Row Level Security (open read/write for simplicity) ──────
-- For a small private app with 10-15 users this is fine.
-- You can lock it down later with proper auth.
alter table trips    enable row level security;
alter table members  enable row level security;
alter table expenses enable row level security;

create policy "allow all trips"    on trips    for all using (true) with check (true);
create policy "allow all members"  on members  for all using (true) with check (true);
create policy "allow all expenses" on expenses for all using (true) with check (true);

-- ── Storage bucket for receipts ──────────────────────────────
-- Run this separately in SQL Editor:
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do nothing;

create policy "allow receipt uploads" on storage.objects
  for all using (bucket_id = 'receipts') with check (bucket_id = 'receipts');
