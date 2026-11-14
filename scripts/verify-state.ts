/**
 * Read-only health check for the running EcoCampus deployment.
 *
 * - Confirms the Supabase PostgreSQL schema is intact.
 * - Confirms public pages render values that come from `website_settings`
 *   (i.e. admin changes are database-backed, not React/localStorage state).
 * - Exercises the exact settings upsert used by the admin panel inside a
 *   transaction that is always rolled back, so no data is modified.
 *
 * Usage: npm run db:verify
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const BASE_URL = process.env.VERIFY_BASE_URL?.trim() || "http://localhost:3000";

function connectionString() {
  const value = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Set DATABASE_URL (or SUPABASE_DB_URL) in .env.local before running this check.");
  }
  return value;
}

function sslConfig(hostname: string) {
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return false;
  const certificatePath = path.join(process.cwd(), "src", "lib", "certs", "prod-ca-2021.crt");
  return { ca: readFileSync(certificatePath, "utf8"), rejectUnauthorized: true };
}

function decodeEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
}

async function main() {
  const url = connectionString();
  const parsed = new URL(url);
  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 15_000,
    ssl: sslConfig(parsed.hostname),
  });

  const problems: string[] = [];

  try {
    const settings = await pool.query<{ key: string; value: string }>(
      "SELECT key, value FROM public.website_settings ORDER BY key",
    );
    console.log(`website_settings rows: ${settings.rowCount}`);
    const byKey = new Map(settings.rows.map((row) => [row.key, row.value]));

    const requiredKeys = [
      "site_name",
      "site_subtitle",
      "hero_heading",
      "hero_description",
      "first_admin_setup_state",
    ];
    for (const key of requiredKeys) {
      if (!byKey.has(key)) problems.push(`missing setting: ${key}`);
    }
    console.log(`first_admin_setup_state: ${byKey.get("first_admin_setup_state") ?? "(not set)"}`);

    const counts = await pool.query<{ users: string; complaints: string; announcements: string; articles: string }>(
      `SELECT
        (SELECT count(*)::text FROM public.users) AS users,
        (SELECT count(*)::text FROM public.complaints) AS complaints,
        (SELECT count(*)::text FROM public.announcements) AS announcements,
        (SELECT count(*)::text FROM public.environmental_articles) AS articles`,
    );
    const row = counts.rows[0];
    console.log(
      `records: users=${row?.users} complaints=${row?.complaints} announcements=${row?.announcements} articles=${row?.articles}`,
    );

    // Render-from-database check.
    let html = "";
    try {
      const response = await fetch(BASE_URL, { redirect: "manual" });
      html = await response.text();
      console.log(`homepage: HTTP ${response.status}, ${html.length} bytes`);
      if (response.status !== 200) problems.push(`homepage returned HTTP ${response.status}`);
    } catch (error) {
      problems.push(`homepage fetch failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (html) {
      const decoded = decodeEntities(html);
      for (const key of ["site_name", "hero_heading", "hero_description"]) {
        const value = byKey.get(key)?.trim();
        if (!value) continue;
        const present = decoded.includes(value.replace(/\s+/g, " ").trim());
        console.log(`  ${key} rendered from DB: ${present ? "yes" : "NO"}`);
        if (!present) problems.push(`homepage does not render ${key} from the database`);
      }
    }

    // Exercise the admin upsert without persisting anything.
    const probeKey = "__verification_probe";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO public.website_settings (key, value, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [probeKey, "round-trip-ok"],
      );
      const probe = await client.query<{ value: string }>(
        "SELECT value FROM public.website_settings WHERE key = $1",
        [probeKey],
      );
      const upsertOk = probe.rows[0]?.value === "round-trip-ok";
      console.log(`settings upsert round-trip: ${upsertOk ? "ok" : "FAILED"}`);
      if (!upsertOk) problems.push("settings upsert did not round-trip inside the transaction");
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
    const afterRollback = await pool.query("SELECT 1 FROM public.website_settings WHERE key = $1", [probeKey]);
    const rollbackOk = (afterRollback.rowCount ?? 0) === 0;
    console.log(`probe row rolled back: ${rollbackOk ? "yes" : "NO"}`);
    if (!rollbackOk) problems.push("verification probe row was not rolled back");

    if (problems.length) {
      console.log("\nResult: problems found");
      for (const problem of problems) console.log(`  - ${problem}`);
      process.exitCode = 1;
    } else {
      console.log("\nResult: database, persistence path and public rendering all look healthy.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Verification failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
