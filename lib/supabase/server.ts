import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Reads/writes the session via Next.js's cookie store, so it stays
 * in sync with the browser client's auth state.
 *
 * `cookies()` is async in Next.js 16, so this factory must be awaited too.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` is called from a Server Component in some cases
            // (e.g. during a page render). This can be ignored if you have
            // proxy.ts refreshing sessions on every request.
          }
        },
      },
    },
  );
}
