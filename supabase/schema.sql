-- Vecosoft Practical Hiring & Skill Assessment Platform - full schema
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- on a DEDICATED Supabase project for this platform (don't share a DB with
-- an unrelated app/project - keeps quotas, backups and access isolated).

create extension if not exists "pgcrypto";

-- ============================================================
-- Admins (internal staff: super_admin / hr / reviewer)
-- ============================================================
create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text,
  role text not null default 'reviewer' check (role in ('super_admin', 'hr', 'reviewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Tracks admin login attempts per IP for brute-force rate limiting (see
-- /api/admin/login). Rows aren't actively pruned - old ones just fall
-- outside the lookback window used by the rate-limit check.
create table if not exists admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  ip text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists admin_login_attempts_ip_idx on admin_login_attempts (ip, attempted_at desc);

-- ============================================================
-- Jobs & Assessments
-- ============================================================
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists assessments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete set null,
  title text not null,
  duration_minutes int not null default 60,
  hard_deadline timestamptz,          -- optional outer cutoff; NULL = duration only
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  -- shown to candidates before/alongside the task list, never counted as a
  -- task itself (e.g. AI-tool policy, prompt-history requirement). NULL/''
  -- = nothing shown.
  general_instructions text,
  created_at timestamptz not null default now()
);

create table if not exists assessment_tasks (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references assessments(id) on delete cascade,
  title text not null,
  description text not null default '',
  task_type text not null check (
    task_type in ('mcq', 'short_answer', 'long_answer', 'file_upload', 'github_url', 'link_submission')
  ),
  options jsonb,                      -- mcq choices: [{ "id": "a", "label": "..." }, ...]
  correct_option_id text,             -- mcq only, used for auto-scoring later
  -- optional: lets ONE task collect more than one submission piece (e.g. a
  -- live URL AND a GitHub repo). Each entry is
  -- { "key": string, "type": one of task_type's values, "label": string, "required": boolean }.
  -- task_type above still applies when this is null/empty - it's the
  -- fallback single-field rendering, so every existing task keeps working
  -- unchanged. The submissions row already has one column per underlying
  -- value (content/github_url/live_url/file_path), so no submissions
  -- schema change was needed to support this.
  fields jsonb,
  sort_order int not null default 0,
  max_score numeric not null default 10,
  required boolean not null default true,
  resources_url text,
  -- text-only tasks get copy/tab-switch integrity logging on the candidate
  -- side; file/github/link tasks assume external tools are normal and are
  -- never flagged for leaving the tab.
  created_at timestamptz not null default now()
);

create index if not exists assessment_tasks_assessment_idx on assessment_tasks (assessment_id, sort_order);

-- ============================================================
-- Candidates & Invites
-- ============================================================
create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,                     -- may be filled later by the candidate on first login
  phone text,
  source text not null default 'excel_import',
  created_at timestamptz not null default now()
);

create table if not exists assessment_invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,

  -- the access code is the candidate's only credential besides email.
  -- access_code_hash is what login actually checks (bcrypt, one-way).
  -- access_code_last4 is kept for admin support ("candidate says their
  -- code doesn't work" -> confirm which one it was).
  -- access_code_encrypted holds the same code AES-256-GCM encrypted
  -- (see src/lib/codes.ts) purely so admins can look up and read out a
  -- candidate's working code from the dashboard; login never reads it.
  access_code_hash text not null,
  access_code_last4 text not null,
  access_code_encrypted text,

  status text not null default 'invited' check (
    status in (
      'invited', 'opened', 'started', 'in_progress', 'submitted',
      'under_review', 'shortlisted', 'interview', 'selected', 'rejected'
    )
  ),

  failed_attempts int not null default 0,
  locked_until timestamptz,

  -- server-authoritative timing, same principle as the MVP: nothing here is
  -- ever taken from the candidate's browser.
  invited_at timestamptz not null default now(),
  started_at timestamptz,
  submitted_at timestamptz,
  expires_at timestamptz,             -- computed at start time from assessment duration/hard_deadline

  created_at timestamptz not null default now(),
  unique (candidate_id, assessment_id)
);

create index if not exists assessment_invites_status_idx on assessment_invites (status);
create index if not exists assessment_invites_assessment_idx on assessment_invites (assessment_id);

create table if not exists candidate_status_history (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references assessment_invites(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text not null,           -- 'system' or an admin email
  changed_at timestamptz not null default now()
);

-- ============================================================
-- Submissions & Scoring
-- ============================================================
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references assessment_invites(id) on delete cascade,
  task_id uuid not null references assessment_tasks(id) on delete cascade,

  submission_type text not null,
  content text,                       -- mcq option id / short & long answer text
  file_path text,                     -- path inside the "submissions" storage bucket
  github_url text,
  live_url text,

  status text not null default 'draft' check (status in ('draft', 'submitted')),
  last_saved_at timestamptz,
  submitted_at timestamptz,

  created_at timestamptz not null default now(),
  unique (invite_id, task_id)
);

-- autosave history - each draft save appends a snapshot instead of only
-- overwriting `submissions`, so nothing is lost if something goes wrong.
create table if not exists submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  snapshot jsonb not null,
  saved_at timestamptz not null default now()
);

create table if not exists evaluation_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  reviewer_id uuid references admins(id) on delete set null,
  criterion text not null default 'Overall',
  score numeric not null,
  max_score numeric not null default 10,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists evaluation_scores_submission_idx on evaluation_scores (submission_id);

-- ============================================================
-- Integrity signals (copy attempts etc. - text-based tasks only)
-- ============================================================
create table if not exists integrity_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references assessment_invites(id) on delete cascade,
  task_id uuid references assessment_tasks(id) on delete set null,
  event_type text not null check (event_type in ('copy_attempt', 'right_click_attempt', 'tab_switch', 'devtools_suspected')),
  event_count int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Email & Audit logs
-- ============================================================
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references assessment_invites(id) on delete set null,
  type text not null check (type in ('invitation', 'resend_code', 'reminder', 'result')),
  provider text not null default 'resend',
  provider_message_id text,
  recipient text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz not null default now()
);

-- Editable subject/body for outbound candidate emails (admin panel:
-- /admin/email-template) so content can be reviewed and changed without a
-- code deploy. `key` identifies which email this row is for - only
-- 'invitation' exists today, but the check constraint leaves room to add
-- more (e.g. 'resend_code') later without a schema change.
create table if not exists email_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key in ('invitation')),
  subject text not null,
  -- lightweight markdown: blank line = new paragraph, "### " = heading,
  -- "- "/"* " = bullet list, **text** = bold. Rendered by
  -- src/lib/emailTemplate.ts, shared by the live preview and the real send.
  body_markdown text not null,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('admin', 'candidate', 'system')),
  actor_id text,                      -- admin email or candidate email, when known
  action text not null,
  target text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
-- Everything is accessed only through Next.js server code using the
-- service-role key - the browser (anon key) never talks to Postgres
-- directly, so RLS stays enabled with no public policies as a hard backstop.
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'admins','jobs','assessments','assessment_tasks','candidates',
      'assessment_invites','candidate_status_history','submissions',
      'submission_versions','evaluation_scores','integrity_events',
      'email_logs','audit_logs','email_templates','admin_login_attempts'
    ])
  loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- ============================================================
-- Storage bucket for CVs / ZIP submissions
-- ============================================================
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- ============================================================
-- Default invitation email template (editable at /admin/email-template)
-- ============================================================
insert into email_templates (key, subject, body_markdown)
values (
  'invitation',
  'You''re shortlisted - {{positionTitle}}',
  $$Dear Candidate,

We are pleased to inform you that you have been shortlisted for the next stage of our **{{positionTitle}}** selection process.

You are now invited to complete our online practical assessment.

**Assessment Link:** {{assessmentLink}}

### Login Instructions

Please log in using:

- **Email:** The same email address you used when applying
- **Access Code:** {{accessCode}}

Please make sure you use your own application email and the access code provided above to access the assessment.

Read all instructions carefully before starting the assessment. Once you begin, make sure you have a stable internet connection and enough uninterrupted time to complete it.

Please do not share your assessment link or access code with anyone else.

If you face any technical issues while accessing the assessment, please contact us.

Best regards,
**HR Team**
**VecoSoft**$$
)
on conflict (key) do nothing;

-- No public storage policies: uploads and downloads are proxied through API
-- routes with the service-role key, and admin downloads use short-lived
-- signed URLs. This also avoids the "file gets corrupted" failure mode
-- common with disk-based uploads - the file is streamed straight into
-- object storage as a binary buffer, never written to a local/ephemeral
-- filesystem in between.
