import { NextResponse, type NextRequest } from "next/server";
import { appBaseUrlForRequest } from "@/lib/email";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const requestedRole = req.nextUrl.searchParams.get("role");
    if (requestedRole && !["student", "staff", "admin"].includes(requestedRole)) {
      return NextResponse.redirect(new URL("/login?error=Invalid+portal+selection.", req.url));
    }
    const supabase = await createSupabaseClient();
    const callbackUrl = new URL("/api/auth/google/callback", appBaseUrlForRequest(req.nextUrl));
    if (requestedRole) callbackUrl.searchParams.set("role", requestedRole);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url),
      );
    }
    if (!data.url) {
      return NextResponse.redirect(
        new URL("/login?error=Supabase+did+not+return+a+Google+sign-in+URL.", req.url),
      );
    }
    return NextResponse.redirect(data.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google sign-in is unavailable.";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url));
  }
}
