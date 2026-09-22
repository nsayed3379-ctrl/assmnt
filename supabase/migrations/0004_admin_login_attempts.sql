-- Run once in the Supabase SQL editor for any project that already ran
-- schema.sql before this table existed. New projects get it straight from
-- schema.sql and don't need this file.
--
-- Tracks admin login attempts per IP for brute-force rate limiting (see
-- /api/admin/login). Rows aren't actively pruned - old ones just fall
-- outside the lookback window used by the rate-limit check.
create table if not exists admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_idx on admin_login_attempts (ip, attempted_at desc);

alter table admin_login_attempts enable row level security;
