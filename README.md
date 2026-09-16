# VecoSoft Assessment Portal (MVP)

A small, private, zero/near-zero-cost candidate assessment portal:

- Candidate enters email + starts a timed task. Start time is recorded on the **server**, so the timer can't be manipulated from the browser (devtools, changing the system clock, etc.) — only what's *displayed* to the candidate uses their local clock, corrected against the server's.
- Candidate submits a GitHub URL, Figma URL, live demo URL, and/or a ZIP upload, plus an AI-tools declaration and notes. Duration is computed server-side from `started_at` / `submitted_at`.
- You get a private `/admin` dashboard (password protected) listing every candidate with their duration, links, AI declaration, and a status you can move through `Review → Shortlist / Rejected`.

Stack: Next.js 14 (App Router, TypeScript) + Tailwind + Supabase (Postgres + Storage). No separate backend to run.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the SQL Editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql). This creates the `assessments` table and a private `submissions` storage bucket.
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not used server-side yet, but kept for future client-side features)
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**keep this secret** — it's only ever read on the server)

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase values, plus:

- `ADMIN_PASSWORD` — the password for `/admin`. Change it from the default.
- `ADMIN_SESSION_SECRET` — any long random string (used to sign the admin session cookie). Generate one with `openssl rand -hex 32`.

## 3. Run locally

```bash
npm install
npm run dev
```

- Candidate flow: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin` (redirects to a login page first)

## 4. Edit the task itself

Open [`src/lib/tasks.ts`](./src/lib/tasks.ts). Each position has its own `durationMinutes` and `instructions` shown to the candidate after they click **Start Assessment**. Add a new key to add a new position — it shows up automatically in the candidate dropdown on the home page (also update the `POSITIONS` array in `src/app/page.tsx`, which is intentionally kept separate/static so the dropdown doesn't leak positions you haven't announced yet).

## 5. Deploy (Vercel, free tier)

```bash
npm i -g vercel   # if you don't have it
vercel
```

Add the same environment variables from `.env.local` in the Vercel project's **Settings → Environment Variables**, then redeploy. Supabase's free tier plus Vercel's free tier is enough for an MVP hiring round.

## How the anti-cheating timer actually works

- `POST /api/start` inserts a row with `started_at = now()` — this timestamp comes from Postgres, not from anything the browser sends.
- The assessment page fetches `started_at` and `duration_minutes` from the database and computes a countdown. It also hits `GET /api/time` once to measure the offset between the candidate's device clock and the server's, so the *displayed* countdown stays accurate even if their system clock is wrong — this is a UX nicety, not the enforcement mechanism.
- `POST /api/submit` sets `submitted_at = now()` again from Postgres. The recorded duration (`submitted_at - started_at`) is always computed from these two server timestamps.
- Going over time does **not** block submission — overtime is just recorded and shown to you in the dashboard (e.g. "63m" for a 60-minute task), matching how most take-home assessments are actually graded: a few minutes over is normal, and a hard cutoff would need extra work (locking a session, background jobs) that isn't worth it for a first hiring round.

## Known MVP limitations (fine for round 1, worth revisiting if you scale this up)

- Single shared admin password, no per-reviewer accounts or audit log of who changed a status.
- No email notifications to candidates on submit, or reminders as their time runs low.
- No resume capability if a candidate closes the tab mid-assessment — reopening the same `/assessment/[id]` URL works (the timer keeps counting from the original `started_at`), but there's no "resend my link" flow if they lose the URL; add a lookup-by-email endpoint if this becomes a problem.
- No hard time-based lockout — see above.
- The ZIP upload path assumes trusted candidates; there's no virus scanning. For a first internal hiring round this is a reasonable tradeoff.

## Project structure

```
src/
  app/
    page.tsx                 Candidate entry (email, name, position)
    assessment/[id]/         Task instructions, timer, submission form
    admin/                   Password-gated dashboard + candidate detail
    api/
      start/                 Creates an assessment row (server sets started_at)
      submit/                Records submission (server sets submitted_at), uploads ZIP
      time/                  Returns server time for client clock correction
      admin/login|logout/    Admin session cookie
      admin/status/          Update a candidate's review status
  lib/
    supabaseAdmin.ts         Server-only Supabase client (service role key)
    tasks.ts                 Task copy + duration per position — edit this per role
    auth.ts                  Admin session cookie signing/verification
    format.ts                Display helpers (duration, status labels)
  middleware.ts               Protects /admin/* behind the login cookie
supabase/schema.sql            Run once in the Supabase SQL editor
```
npm run dev