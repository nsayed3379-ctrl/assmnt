// Hand-written types matching supabase/schema.sql. If you change the schema,
// update this file too (or generate it with `supabase gen types typescript`
// once you have the Supabase CLI linked to your project).

export type AdminRole = "super_admin" | "hr" | "reviewer";

export type TaskType =
  | "mcq"
  | "short_answer"
  | "long_answer"
  | "file_upload"
  | "github_url"
  | "link_submission";

export type InviteStatus =
  | "invited"
  | "opened"
  | "started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected";

export type McqOption = { id: string; label: string };

// Lets one task collect more than one submission piece (e.g. a live URL
// AND a GitHub repo). `type` reuses TaskType so the same rendering/storage
// rules apply per field; `key` just needs to be unique within the task.
export type TaskField = { key: string; type: TaskType; label: string; required: boolean };

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type AdminRow = {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
};

export type AdminLoginAttemptRow = {
  id: string;
  ip: string;
  attempted_at: string;
};

export type JobRow = {
  id: string;
  title: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};

export type AssessmentRow = {
  id: string;
  job_id: string | null;
  title: string;
  duration_minutes: number;
  hard_deadline: string | null;
  status: "draft" | "active" | "closed";
  general_instructions: string | null;
  created_at: string;
};

export type AssessmentTaskRow = {
  id: string;
  assessment_id: string;
  title: string;
  description: string;
  task_type: TaskType;
  options: McqOption[] | null;
  correct_option_id: string | null;
  fields: TaskField[] | null;
  sort_order: number;
  max_score: number;
  required: boolean;
  resources_url: string | null;
  created_at: string;
};

export type CandidateRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  source: string;
  created_at: string;
};

export type AssessmentInviteRow = {
  id: string;
  candidate_id: string;
  assessment_id: string;
  access_code_hash: string;
  access_code_last4: string;
  access_code_encrypted: string | null;
  status: InviteStatus;
  failed_attempts: number;
  locked_until: string | null;
  invited_at: string;
  started_at: string | null;
  submitted_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type CandidateStatusHistoryRow = {
  id: string;
  invite_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_at: string;
};

export type SubmissionRow = {
  id: string;
  invite_id: string;
  task_id: string;
  submission_type: TaskType;
  content: string | null;
  file_path: string | null;
  github_url: string | null;
  live_url: string | null;
  status: "draft" | "submitted";
  last_saved_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type SubmissionVersionRow = {
  id: string;
  submission_id: string;
  snapshot: Record<string, unknown>;
  saved_at: string;
};

export type EvaluationScoreRow = {
  id: string;
  submission_id: string;
  reviewer_id: string | null;
  criterion: string;
  score: number;
  max_score: number;
  comment: string | null;
  created_at: string;
};

export type IntegrityEventRow = {
  id: string;
  invite_id: string;
  task_id: string | null;
  event_type: "copy_attempt" | "right_click_attempt" | "tab_switch" | "devtools_suspected";
  event_count: number;
  created_at: string;
};

export type EmailLogRow = {
  id: string;
  invite_id: string | null;
  type: "invitation" | "resend_code" | "reminder" | "result";
  provider: string;
  provider_message_id: string | null;
  recipient: string;
  status: "pending" | "sent" | "failed";
  error_message: string | null;
  sent_at: string;
};

export type EmailTemplateRow = {
  id: string;
  key: "invitation";
  subject: string;
  body_markdown: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_type: "admin" | "candidate" | "system";
  actor_id: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      admins: TableDef<AdminRow, Partial<AdminRow> & Pick<AdminRow, "email" | "password_hash">>;
      admin_login_attempts: TableDef<AdminLoginAttemptRow, Partial<AdminLoginAttemptRow> & Pick<AdminLoginAttemptRow, "ip">>;
      jobs: TableDef<JobRow, Partial<JobRow> & Pick<JobRow, "title" | "slug">>;
      assessments: TableDef<AssessmentRow, Partial<AssessmentRow> & Pick<AssessmentRow, "title">>;
      assessment_tasks: TableDef<
        AssessmentTaskRow,
        Partial<AssessmentTaskRow> & Pick<AssessmentTaskRow, "assessment_id" | "title" | "task_type">
      >;
      candidates: TableDef<CandidateRow, Partial<CandidateRow> & Pick<CandidateRow, "email">>;
      assessment_invites: TableDef<
        AssessmentInviteRow,
        Partial<AssessmentInviteRow> &
          Pick<AssessmentInviteRow, "candidate_id" | "assessment_id" | "access_code_hash" | "access_code_last4">
      >;
      candidate_status_history: TableDef<
        CandidateStatusHistoryRow,
        Partial<CandidateStatusHistoryRow> & Pick<CandidateStatusHistoryRow, "invite_id" | "to_status" | "changed_by">
      >;
      submissions: TableDef<
        SubmissionRow,
        Partial<SubmissionRow> & Pick<SubmissionRow, "invite_id" | "task_id" | "submission_type">
      >;
      submission_versions: TableDef<
        SubmissionVersionRow,
        Partial<SubmissionVersionRow> & Pick<SubmissionVersionRow, "submission_id" | "snapshot">
      >;
      evaluation_scores: TableDef<
        EvaluationScoreRow,
        Partial<EvaluationScoreRow> & Pick<EvaluationScoreRow, "submission_id" | "score">
      >;
      integrity_events: TableDef<
        IntegrityEventRow,
        Partial<IntegrityEventRow> & Pick<IntegrityEventRow, "invite_id" | "event_type">
      >;
      email_logs: TableDef<EmailLogRow, Partial<EmailLogRow> & Pick<EmailLogRow, "type" | "recipient">>;
      email_templates: TableDef<
        EmailTemplateRow,
        Partial<EmailTemplateRow> & Pick<EmailTemplateRow, "key" | "subject" | "body_markdown">
      >;
      audit_logs: TableDef<AuditLogRow, Partial<AuditLogRow> & Pick<AuditLogRow, "actor_type" | "action">>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
