import { createBrowserClient } from "@supabase/ssr";

// Supabase client for use in the browser (Client Components).
// Uses the public anon key — safe to ship to the browser because
// the database is locked down with Row Level Security (see supabase/schema.sql).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
