
import { timingSafeEqual, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { one, run, transaction } from "@/lib/db";
import { appBaseUrlForRequest } from "@/lib/email";
import { apiError, clientIp, rateLimit, sameOrigin } from "@/lib/http";
import { createSupabaseAuthClient } from "@/lib/supabase";
import { nowIso, sanitizeText } from "@/lib/utils";
import { adminSetupSchema } from "@/lib/validation";

const SETUP_STATE_KEY = "first_admin_setup_state";

function matchesSetupToken(provided: string, configured: string) {
  const providedBuffer = Buffer.from(provided);
  const configuredBuffer = Buffer.from(configured);

  return (
    providedBuffer.length === configuredBuffer.length &&
    timingSafeEqual(providedBuffer, configuredBuffer)
  );
}

async function releaseSetupClaim(claim: string) {
  const result = await run(
    "DELETE FROM website_settings WHERE key = ? AND value = ?",
    SETUP_STATE_KEY,
    claim,
  );

  if (result.changes !== 1) {
    console.error("Could not release the first Admin setup claim.");
  }
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return apiError("Invalid origin.", 403);
  }

  const ip = clientIp(req);

  if (!(await rateLimit(`admin-setup:${ip}`, 5, 15 * 60 * 1000)).allowed) {
    return apiError("Too many setup attempts. Please wait 15 minutes.", 429);
  }

  let json: unknown;

  try {
    json = await req.json();
  } catch {
    return apiError("Invalid request.", 400);
  }

  const parsed = adminSetupSchema.safeParse(json);

  if (!parsed.success) {
    return apiError(
      parsed.error.issues[0]?.message || "Check the setup details.",
      400,
    );
  }

  const { fullName, email, password, setupToken } = parsed.data;

  const configuredToken = process.env.ADMIN_SETUP_TOKEN?.trim();

  if (configuredToken && configuredToken.length < 32) {
    return apiError(
      "ADMIN_SETUP_TOKEN must contain at least 32 characters.",
      503,
    );
  }

  const currentUser = await getSessionUser();
  const authorizedBySession = currentUser?.role === "super_admin";

  const authorizedByToken =
    !!configuredToken &&
    matchesSetupToken(setupToken, configuredToken);

  if (!authorizedBySession && !authorizedByToken) {
    return apiError(
      configuredToken
        ? "A super-admin session or valid setup token is required."
        : "Admin setup is not configured. Sign in as a super admin or configure ADMIN_SETUP_TOKEN on the server.",
      403,
    );
  }

  if (
    await one<{ value: string }>(
      "SELECT value FROM website_settings WHERE key = ?",
      SETUP_STATE_KEY,
    )
  ) {
    return apiError(
      "First Admin setup has already been used or is in progress.",
      409,
    );
  }

  if (
    await one(
      "SELECT id FROM users WHERE role = 'admin' AND is_demo = 0 AND status != 'deleted' LIMIT 1",
    )
  ) {
    return apiError("A non-demo Admin account already exists.", 409);
  }

  if (await one("SELECT id FROM users WHERE lower(email) = ?", email)) {
    return apiError(
      "An EcoCampus account with this email already exists.",
      409,
    );
  }

  let supabase;

  try {
    supabase = createSupabaseAuthClient();
  } catch (error) {
    return apiError(
      error instanceof Error
        ? error.message
        : "Supabase Auth is not configured.",
      503,
    );
  }

  const claim = `pending:${randomUUID()}`;

  const claimResult = await run(
    `INSERT INTO website_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO NOTHING`,
    SETUP_STATE_KEY,
    claim,
    nowIso(),
  );

  if (claimResult.changes !== 1) {
    return apiError(
      "First Admin setup has already been used or is in progress.",
      409,
    );
  }

  const signupResult = await supabase.auth
    .signUp({
      email,
      password,
      options: {
        data: {
          full_name: sanitizeText(fullName).slice(0, 100),
        },
        emailRedirectTo: `${appBaseUrlForRequest(req.nextUrl)}/api/auth/google/callback?next=/login`,
      },
    })
    .catch(async (authError: unknown) => {
      await releaseSetupClaim(claim);

      console.error(
        "Supabase Auth request failed during first Admin setup:",
        authError instanceof Error ? authError.message : authError,
      );

      return null;
    });

  if (!signupResult) {
    return apiError(
      "Supabase Auth could not be reached. Please try again.",
      502,
    );
  }

  const { data, error } = signupResult;

  if (error) {
    await releaseSetupClaim(claim);
    return apiError(
      error.message || "Supabase could not create the Admin account.",
      400,
    );
  }

  if (!data.user?.email || data.user.identities?.length === 0) {
    await releaseSetupClaim(claim);
    return apiError(
      "An account with this email already exists in Supabase Auth.",
      409,
    );
  }

  // Use the same ID as the Supabase Auth user.
  const userId = data.user.id;

  const verified = data.user.email_confirmed_at ? 1 : 0;

  try {
    await transaction(async () => {
      await run(
        `INSERT INTO users (
          id, email, password_hash, role, full_name,
          email_verified, status, provider, is_demo,
          created_at, updated_at
        )
        VALUES (?, ?, NULL, 'admin', ?, ?, 'active', 'email', 0, ?, ?)`,
        userId,
        email,
        sanitizeText(fullName).slice(0, 100),
        verified,
        nowIso(),
        nowIso(),
      );

      const completed = await run(
        "UPDATE website_settings SET value = 'complete', updated_at = ? WHERE key = ? AND value = ?",
        nowIso(),
        SETUP_STATE_KEY,
        claim,
      );

      if (completed.changes !== 1) {
        throw new Error(
          "The first Admin setup claim changed before completion.",
        );
      }

      await logAudit({
        actor: currentUser,
        action: "First Admin account created",
        entityType: "user",
        entityId: userId,
        details: email,
        ip,
      });
    });
  } catch (profileError) {
    console.error(
      "Supabase Admin account was created but the EcoCampus profile could not be saved:",
      profileError,
    );

    return apiError(
      "The Supabase account was created, but its EcoCampus profile could not be saved. Setup is locked to prevent duplicate accounts; contact a platform administrator.",
      500,
    );
  }

  return NextResponse.json(
    {
      ok: true,
      email,
      requiresVerification: !verified,
      message: verified
        ? "The Admin account is ready for normal email and password sign-in."
        : "The Admin account was created. Verify the email address before signing in.",
    },
    { status: 201 },
  );
}
