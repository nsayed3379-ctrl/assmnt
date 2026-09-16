-- VecoSoft Assessment Portal - schema
-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  position text not null default 'Frontend Developer Intern',

  -- server-authoritative timing: both timestamps are set by the API routes,
  -- never trusted from the client, so a candidate changing their system
  -- clock or devtools cannot affect the recorded duration.
  duration_minutes int not null default 60,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,

  github_url text,
  figma_url text,
  live_demo_url text,
  zip_path text,           -- path inside the "submissions" storage bucket
  ai_used boolean,
  ai_tools text,
  notes text,

  -- in_progress -> submitted -> review -> shortlist | rejected
  status text not null default 'in_progress',

  created_at timestamptz not null default now()
);

create index if not exists assessments_status_idx on assessments (status);
create index if not exists assessments_created_at_idx on assessments (created_at desc);

-- Row Level Security: locked down by default. All reads/writes from the app
-- go through the Next.js API routes using the service-role key on the
-- server, so the browser (anon key) never touches this table directly.
alter table assessments enable row level security;

-- Storage bucket for candidate ZIP submissions.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- No public storage policies are added: uploads and downloads are proxied
-- through API routes using the service-role key, and admin downloads use
-- short-lived signed URLs.
