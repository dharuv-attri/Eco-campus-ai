import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and either NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid http or https URL.");
  }
  return { url, key };
}

export function isSupabaseConfigured() {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

export async function createSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies; middleware refreshes sessions before rendering.
        }
      },
    },
  });
}

export function createSupabaseAuthClient() {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
