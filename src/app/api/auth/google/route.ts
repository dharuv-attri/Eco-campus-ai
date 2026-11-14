import { NextResponse, type NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { appBaseUrlForRequest } from "@/lib/email";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  let baseUrl: string;
  try {
    baseUrl = appBaseUrlForRequest(req.nextUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The public site URL is not configured." },
      { status: 503 },
    );
  }

  function failure(message: string) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, baseUrl),
    );
  }

  try {
    const requestedRole = req.nextUrl.searchParams.get("role");
    if (requestedRole && !["student", "staff", "admin"].includes(requestedRole)) {
      return failure("Invalid portal selection.");
    }

    // Collect the PKCE code-verifier cookie that Supabase creates here and
    // attach it to the redirect explicitly. Relying on the ambient cookie store
    // silently drops it on some Next.js versions, which makes the callback fail
    // with "PKCE code verifier not found" and leaves the user signed out.
    const authCookies: Array<{ name: string; value: string; options: CookieOptions }> = [];
    const supabase = await createSupabaseClient({
      onCookiesSet: (cookiesToSet) => authCookies.push(...cookiesToSet),
    });

    const callbackUrl = new URL("/api/auth/google/callback", baseUrl);
    if (requestedRole) callbackUrl.searchParams.set("role", requestedRole);
    const nextPath = req.nextUrl.searchParams.get("next");
    if (nextPath) callbackUrl.searchParams.set("next", nextPath);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      return failure(error.message);
    }
    if (!data.url) {
      return failure("Supabase did not return a Google sign-in URL.");
    }

    const response = NextResponse.redirect(data.url);
    authCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in is unavailable.";
    return failure(message);
  }
}
