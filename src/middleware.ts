
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Only the authenticated portals need a token refresh to be persisted from the
 * middleware. Public pages and route handlers validate their own session, so
 * skipping the extra Supabase round-trip here removes one network call from
 * every public navigation.
 */
function needsSessionRefresh(pathname: string) {
  return /^\/(student|staff|admin)(\/|$)/.test(pathname);
}

/**
 * Expose the requested path to Server Components. The auth layout needs to know
 * whether it is rendering the password-recovery pages, which must stay reachable
 * even while a temporary recovery session is present.
 */
function nextWithPath(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-ecocampus-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export async function middleware(request: NextRequest) {
  // Uploaded images are served by public/ static files or the /uploads/[name] route.
  if (request.nextUrl.pathname.startsWith("/uploads/")) {
    return nextWithPath(request);
  }

  // If Supabase falls back to the Site URL instead of the registered callback
  // (for example when the callback URL is missing from the redirect allow list),
  // forward the authorization code to the real callback so the session is saved.
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && !request.nextUrl.pathname.startsWith("/api/auth/google/callback")) {
    const target = request.nextUrl.clone();
    target.pathname = "/api/auth/google/callback";
    if (!target.searchParams.has("next")) {
      target.searchParams.set("next", request.nextUrl.pathname === "/" ? "/" : request.nextUrl.pathname);
    }
    return NextResponse.redirect(target);
  }

  if (!needsSessionRefresh(request.nextUrl.pathname)) {
    return nextWithPath(request);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return nextWithPath(request);
  }

  let response = nextWithPath(request);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },

      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = nextWithPath(request);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) =>
      /^sb-.+-auth-token(?:\.\d+)?$/.test(name)
    );

  if (!hasSessionCookie) {
    return response;
  }

  const { error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError") {
    console.error(
      "Could not validate the Supabase session:",
      error.message
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
