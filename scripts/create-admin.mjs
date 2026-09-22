// Usage: npm run create-admin -- "you@vecosoft.com" "a-strong-password" "Your Name" super_admin
// Creates (or updates the password/role of) an admin account. There is no
// public admin signup page on purpose - only someone with the Supabase
// service-role key (i.e. you, running this script) can create one.
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const [, , email, password, fullName, role = "super_admin"] = process.argv;

if (!email || !password) {
  console.error('Usage: npm run create-admin -- "you@vecosoft.com" "a-strong-password" "Your Name" [role]');
  console.error("role is one of: super_admin, hr, reviewer (default: super_admin)");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const passwordHash = await bcrypt.hash(password, 10);

const { data, error } = await supabase
  .from("admins")
  .upsert(
    { email: email.trim().toLowerCase(), password_hash: passwordHash, full_name: fullName || null, role, is_active: true },
    { onConflict: "email" }
  )
  .select("id, email, role")
  .single();

if (error) {
  console.error("Failed to create admin:", error.message);
  process.exit(1);
}

console.log(`Admin ready: ${data.email} (${data.role}) - id ${data.id}`);
