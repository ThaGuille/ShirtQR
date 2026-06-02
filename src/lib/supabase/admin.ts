import { createClient } from "@supabase/supabase-js";

// SERVER-ONLY admin client. Uses the service role key, which BYPASSES Row
// Level Security. Use it only for privileged actions on the /admin side
// (delete/hide posts). NEVER import this into a Client Component or expose
// the key to the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
