# Vecosoft Practical Hiring & Skill Assessment Platform

A private candidate assessment platform: import shortlisted candidates from an Excel sheet, the system generates a unique access code per candidate, you email it to them (Resend), they sign in with email + code, complete a multi-task practical assessment against a server-authoritative timer, and your team reviews/scores submissions from an admin dashboard.

Stack: **Next.js 15 (App Router, TypeScript) + Tailwind + Supabase (Postgres + Storage) + Resend**. No separate backend service to run or host.

## 1. Create a dedicated Supabase project

Use a **new, dedicated** Supabase project for this platform - don't share a database with an unrelated app. This keeps quotas, backups, and access isolated, and avoids the kind of "uploaded file got corrupted" problems that usually come from routing uploads through a disk-based server instead of straight into object storage (which is what this app does - see `src/app/api/candidate/upload/route.ts`).

1. Create a project at [supabase.com](https://supabase.com) (free tier is enough for a 50-500 candidate hiring round).
2. In the SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql) once. This creates every table plus a private `submissions` storage bucket.
   - If you ran `schema.sql` on this project **before** `access_code_encrypted` existed, also run [`supabase/migrations/0001_add_access_code_encrypted.sql`](./supabase/migrations/0001_add_access_code_encrypted.sql) once to add the new column.
3. In **Project Settings → API**, copy the Project URL, `anon` key, and `service_role` key.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Supabase values, a `RESEND_API_KEY` (see below), and generate a session secret and an access-code encryption key:

```bash
openssl rand -hex 32   # paste into ADMIN_SESSION_SECRET
openssl rand -hex 32   # paste into ACCESS_CODE_ENCRYPTION_KEY
```

`ACCESS_CODE_ENCRYPTION_KEY` lets the admin dashboard show a candidate's current access code (AES-256-GCM encrypted at rest, decrypted server-side only for authenticated admins) - separate from `access_code_hash`, which is what login actually checks and can never be reversed.

## 3. Create your first admin account and assessment

There's no public admin signup page - admins are created with a script using your service-role key:

```bash
npm install
npm run create-admin -- "you@vecosoft.com" "a-strong-password" "Your Name" super_admin
npm run seed-assessment
```

`seed-assessment` creates one example assessment with one task of each type (`github_url`, `link_submission`, `long_answer`, `mcq`) so you have something to import candidates against immediately. There is no admin UI for building assessments/tasks in Phase 1 - edit `scripts/seed-assessment.mjs` (or use the Supabase table editor directly) to define your real positions and tasks. A proper "assessment builder" screen is a natural Phase 2 addition once the core hiring flow is proven out.

## 4. Run locally

```bash
npm run dev
```

- Candidate portal: `http://localhost:3000/assessment/login`
- Admin dashboard: `http://localhost:3000/portal-x7k2` (redirects to `/portal-x7k2/login`) - deliberately not `/admin`; see the middleware note below

## 5. Resend setup (email)

1. Create a free account at [resend.com](https://resend.com) (3,000 emails/month, 100/day on the free tier - comfortably enough for a 50-candidate round).
2. Grab an API key and put it in `RESEND_API_KEY`.
3. To send from your own domain (`assessment@vecosoft.com` instead of a generic address), verify that domain in Resend (Domains → Add Domain → add the DNS records it gives you), then set `EMAIL_FROM="Vecosoft Careers <assessment@vecosoft.com>"`. Until the domain is verified, leave `EMAIL_FROM` as the default `onboarding@resend.dev` sender - invitations will still work, they'll just come from Resend's shared test address.

## 6. Deploying and integrating with your existing Vecosoft site (subdomain)

This app is a **separate deployment** from your main Vecosoft marketing site - it doesn't need to live in the same codebase or hosting project. To make it feel integrated:

1. Deploy this project on its own (Netlify's free tier works with Next.js App Router, including the Node.js-runtime middleware this app uses - do one end-to-end smoke test with 2-3 dummy candidates right after deploying, before sending real invitations, since serverless Next.js hosting occasionally has edge cases with middleware).
2. Add all the `.env.local` variables to the hosting project's environment variables settings, using your **production** Resend key and a real `NEXT_PUBLIC_APP_URL`.
3. In your domain's DNS (wherever `vecosoft.com`/`vicosoft.com` is managed), add a subdomain - e.g. `careers.vecosoft.com` or `assessment.vecosoft.com` - pointing at the new deployment (a `CNAME` record to the host's provided target, or the exact record your hosting dashboard's "custom domain" screen asks for).
4. Add that same subdomain as a custom domain inside the hosting project's dashboard.
5. Update `NEXT_PUBLIC_APP_URL` to the final subdomain URL and redeploy, so invitation emails link to the right place.
6. From your main site's careers page, link "Apply Now" / shortlist communications to that subdomain - no iframe or code-sharing needed, it's just a link between two independently-hosted sites.

## How the anti-cheat features actually work (and their real limits)

**Timer** - `started_at` and `expires_at` are set/read from Postgres, never from the candidate's browser. `expires_at` is `min(started_at + duration_minutes, hard_deadline)` if a hard deadline is set on the assessment, computed once at start time. The countdown shown to the candidate corrects for their device clock being wrong (`/api/time`), but that's a display nicety only - nothing about the deadline is enforced client-side. Going over time does **not** block submission; overtime is simply visible to reviewers.

**Copy-paste protection** - the task instructions panel (`protected-text.tsx`) disables text selection and blocks copy/cut/right-click events. This stops casual copy-paste effectively. It does **not** and cannot stop screenshots, phone photos, or screen recording - no website can intercept those, they happen entirely outside the browser's control.

**Watermark** - every task page overlays a faint tiled watermark with the candidate's email and a timestamp. This doesn't prevent leaking content, but if a screenshot does leak, it's traceable back to who took it.

**Integrity logging** - copy attempts, right-click attempts, and tab-switches are logged per task, but **only for text-based tasks** (`mcq`, `short_answer`, `long_answer`). Tasks that require external tools (`github_url`, `link_submission`, `file_upload`) never log tab-switches, because candidates are expected to work in an external editor/GitHub and switching tabs there is completely normal - logging it would just be noise and could unfairly flag honest candidates. There is deliberately **no fullscreen lock and no auto-submit-on-blur**, since that would break the normal workflow of a practical coding task.

## Known Phase 1 scope cuts (fine for a first hiring round, worth revisiting if this scales up)

- No admin UI to author assessments/tasks - use `scripts/seed-assessment.mjs` or edit rows directly in Supabase's table editor.
- Scoring is a single overall score + comment per task per reviewer, not a multi-criterion rubric breakdown (schema supports multiple `criterion` rows per submission already - the UI just doesn't expose a rubric builder yet).
- Bulk admin actions (multi-select status change) aren't built - status changes are per-candidate. CSV export of the full filtered list is available from the dashboard.
- MCQ auto-scoring against `correct_option_id` isn't wired up yet - MCQ answers show up for manual review like everything else.
- A candidate is assumed to have one active invite/assessment at a time; the schema supports more per candidate for a future "apply to multiple roles" flow.
- No email delivery/bounce webhook handling from Resend yet - failed sends are visible in `email_logs` and the admin can re-run "Send Invitations" to retry pending ones, but there's no automatic bounce tracking.

## Project structure

```
src/
  app/
    page.tsx                        Landing page -> candidate sign-in
    assessment/
      login/                        Candidate sign-in (email + access code)
      set-name/                     One-time name capture if not pre-imported
      dashboard/                    Task list, progress, Start / Final Submit
      task/[taskId]/                Per-task instructions + submission form
      completed/                    Post-submission confirmation
    portal-x7k2/                    Admin panel - obscured path, not /admin
      login/                        Admin sign-in (email + password)
      page.tsx                      Overview stats + filterable candidate table
      import/                       Excel upload -> preview -> import -> send invites
      email-template/               Preview/edit the invitation email subject+body
      candidates/[inviteId]/        Full submission review + scoring
    api/
      candidate/                    verify, set-name, start, draft, upload,
                                     submit-task, final-submit, integrity, resend-code
      admin/                        login, logout, import/preview, import/confirm,
                                     send-invitations, status, score, export
      time/                         Server clock for client countdown correction
  lib/
    supabaseAdmin.ts                Server-only Supabase client (service role key)
    database.types.ts               Hand-written types matching supabase/schema.sql
    auth.ts / candidateAuth.ts      Signed session cookies (admin / candidate)
    codes.ts                        Access code + password hashing (bcrypt)
    excel.ts                        .xlsx parsing/validation for candidate import
    email.ts                        Resend templates + batch sending
    timer.ts                        Server-side expiry calculation
    adminData.ts                    Shared candidate-list query + scoring aggregation
    audit.ts                        Best-effort audit_logs writer
  middleware.ts                     Protects /portal-x7k2/* and /assessment/* behind
                                     their respective session cookies
scripts/
  create-admin.mjs                  Create/update an admin account
  seed-assessment.mjs               Create an example job + assessment + tasks
supabase/schema.sql                 Run once in the Supabase SQL editor
```
