import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const message = "That sign-in link has expired. Request a new Supabase email code.";
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, req.url));
}
