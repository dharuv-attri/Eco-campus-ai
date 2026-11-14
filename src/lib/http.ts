import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { all, one, run } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { Role, SessionUser } from "@/types";
import { nowIso } from "@/lib/utils";

export function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim().slice(0, 80) || "unknown";
  return req.headers.get("x-real-ip")?.slice(0, 80) || "127.0.0.1";
}

export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // Native form submissions and same-site navigations omit Origin.
  const host = req.headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function apiOk<T extends Record<string, unknown>>(data: T = {} as T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export async function getApiUser(): Promise<SessionUser | null> {
  return await getSessionUser();
}

export async function authorizeApi(
  roles?: Role[],
): Promise<{ user: SessionUser; response?: never } | { user?: never; response: NextResponse }> {
  const user = await getSessionUser();
  if (!user) return { response: apiError("Sign in required.", 401) };
  if (roles && !roles.includes(user.role)) {
    return { response: apiError("You do not have permission to perform this action.", 403) };
  }
  return { user };
}

export function enforceSameOrigin(req: NextRequest) {
  if (!sameOrigin(req)) {
    return apiError("Request blocked: invalid origin.", 403);
  }
  return null;
}

/**
 * Persistent sliding-window rate limiter. Keys should include the client IP and
 * the action bucket (e.g. `login:1.2.3.4`).
 *
 * The count and the insert happen in a single statement so every limited action
 * costs exactly one database round-trip instead of three.
 */
export async function rateLimit(key: string, limit: number, windowMs: number) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const row = await one<{ count: number; inserted: number }>(
    `WITH recent AS (
       SELECT COUNT(*)::int AS count
       FROM rate_limit_events
       WHERE bucket = ? AND created_at > ?
     ), inserted AS (
       INSERT INTO rate_limit_events (id, bucket, created_at)
       SELECT ?, ?, ? WHERE (SELECT count FROM recent) < ?
       RETURNING 1
     )
     SELECT (SELECT count FROM recent) AS count,
            (SELECT COUNT(*)::int FROM inserted) AS inserted`,
    key,
    since,
    randomUUID(),
    key,
    nowIso(),
    limit,
  );
  const allowed = (row?.inserted ?? 0) > 0;
  if (allowed && Math.random() < 0.03) {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Housekeeping must never add latency to the user's request.
    void run("DELETE FROM rate_limit_events WHERE created_at < ?", cutoff).catch(() => undefined);
  }
  return { allowed, retryAfterMs: allowed ? 0 : windowMs };
}

export async function cleanupRateLimits() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await all<{ id: string }>(
    "SELECT id FROM rate_limit_events WHERE created_at < ? LIMIT 100",
    cutoff,
  );
  for (const row of rows) await run("DELETE FROM rate_limit_events WHERE id = ?", row.id);
}

export async function readJson<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
