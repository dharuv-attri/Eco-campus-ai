import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const hasSessionCookie = request.cookies
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
  if (!hasSessionCookie) return response;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError && sessionError.name !== "AuthSessionMissingError") {
    console.error("Could not read the Supabase session cookie:", sessionError.message);
  }
  if (sessionData.session) {
    const { error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") {
      console.error("Could not validate the Supabase session:", error.message);
    }
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
