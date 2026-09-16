import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-only Supabase client using the service role key. This must never
// be imported from a "use client" component or exposed to the browser.
let client: ReturnType<typeof createClient<Database>> | null = null;

export function supabaseAdmin() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
    );
  }

  client = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });

  return client;
}

export const SUBMISSIONS_BUCKET =
  process.env.SUPABASE_SUBMISSIONS_BUCKET || "submissions";
