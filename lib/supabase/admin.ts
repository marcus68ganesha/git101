import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client using the service-role key. Bypasses Row Level
 * Security entirely — never import this from a Client Component, and never
 * use it to serve data directly to a browser request without your own
 * authorization checks first.
 *
 * Reserved for admin-only server tasks (e.g. one-off scripts). Prefer
 * `lib/supabase/server.ts` for anything triggered by a logged-in user.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
