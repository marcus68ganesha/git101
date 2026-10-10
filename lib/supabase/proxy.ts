import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require a logged-in teacher account. /reset-password
// must be public too: a password-recovery link lands here with a token in
// the URL *hash* (never sent to the server), so there's no session cookie
// yet for this check to see — the client-side JS on that page is what
// actually establishes the session from the hash.
const PUBLIC_ROUTES = ["/login", "/reset-password"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * unauthenticated visitors to /login (and signed-in visitors away from
 * /login). This is an *optimistic* check — it only reads the session
 * cookie, never the database — so real authorization still happens
 * server-side in each page/action via `lib/supabase/server.ts`.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and getUser().
  // A stray return here can randomly log users out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route),
  );

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
