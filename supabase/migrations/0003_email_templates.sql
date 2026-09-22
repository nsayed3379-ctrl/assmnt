-- Run once in the Supabase SQL editor for any project that already ran
-- schema.sql before this table existed. New projects get it straight from
-- schema.sql and don't need this file.
--
-- Stores the editable subject/body for outbound candidate emails (admin
-- panel: /admin/email-template) so content can be reviewed and changed
-- without a code deploy. `key` identifies which email this row is for -
-- only 'invitation' exists today, but the check constraint leaves room to
-- add more (e.g. 'resend_code') later without a schema change.
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

alter table email_templates enable row level security;

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
