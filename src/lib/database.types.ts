// Hand-written types matching supabase/schema.sql. If you change the schema,
// update this file too (or generate it with `supabase gen types typescript`
// once you have the Supabase CLI linked to your project).
export type AssessmentRow = {
  id: string;
  email: string;
  full_name: string | null;
  position: string;
  duration_minutes: number;
  started_at: string;
  submitted_at: string | null;
  github_url: string | null;
  figma_url: string | null;
  live_demo_url: string | null;
  zip_path: string | null;
  ai_used: boolean | null;
  ai_tools: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export type AssessmentInsert = Partial<AssessmentRow> &
  Pick<AssessmentRow, "email" | "position">;

export type AssessmentUpdate = Partial<AssessmentRow>;

export type AdminLoginAttemptRow = {
  id: number;
  ip: string;
  attempted_at: string;
};

export type AdminLoginAttemptInsert = Partial<AdminLoginAttemptRow> &
  Pick<AdminLoginAttemptRow, "ip">;

export type Database = {
  public: {
    Tables: {
      assessments: {
        Row: AssessmentRow;
        Insert: AssessmentInsert;
        Update: AssessmentUpdate;
        Relationships: [];
      };
      admin_login_attempts: {
        Row: AdminLoginAttemptRow;
        Insert: AdminLoginAttemptInsert;
        Update: Partial<AdminLoginAttemptRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
