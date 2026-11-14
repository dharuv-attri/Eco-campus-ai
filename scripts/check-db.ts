import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const EXPECTED_TABLES = [
  "roles",
  "users",
  "sessions",
  "email_tokens",
  "departments",
  "campus_locations",
  "complaints",
  "complaint_images",
  "complaint_assignments",
  "complaint_status_history",
  "staff_updates",
  "complaint_feedback",
  "notifications",
  "website_settings",
  "website_sections",
  "announcements",
  "environmental_articles",
  "green_activities",
  "leaderboard_points",
  "quiz_attempts",
  "ai_chat_history",
  "admin_audit_logs",
  "uploaded_files",
  "email_outbox",
  "rate_limit_events",
] as const;

function connectionString() {
  const value = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Set DATABASE_URL (or SUPABASE_DB_URL) in .env.local before running this check.");
  }
  const parsed = new URL(value);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    throw new Error("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
  }
  return value;
}

function sslConfig(hostname: string) {
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return false;
  const certificatePath = path.join(process.cwd(), "src", "lib", "certs", "prod-ca-2021.crt");
  return { ca: readFileSync(certificatePath, "utf8"), rejectUnauthorized: true };
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

  try {
    const info = await pool.query<{
      database: string;
      db_user: string;
      server_version: string;
    }>(
      "SELECT current_database() AS database, current_user AS db_user, current_setting('server_version') AS server_version",
    );
    const row = info.rows[0];
    console.log(`Connected to database "${row.database}" as "${row.db_user}" (PostgreSQL ${row.server_version}).`);

    const found = await pool.query<{ name: string }>(
      `SELECT table_name AS name
         FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const existing = new Set(found.rows.map((entry) => entry.name));
    const missing = EXPECTED_TABLES.filter((table) => !existing.has(table));

    console.log(`\nExpected tables: ${EXPECTED_TABLES.length}`);
    console.log(`Present tables:  ${EXPECTED_TABLES.length - missing.length}`);
    console.log(`Missing tables:  ${missing.length}`);
    if (missing.length) console.log(`  ${missing.join(", ")}`);

    for (const table of ["website_settings", "website_sections"] as const) {
      if (!existing.has(table)) continue;
      const columns = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position`,
        [table],
      );
      console.log(`\n${table} columns:`);
      for (const column of columns.rows) {
        console.log(
          `  ${column.column_name} (${column.data_type}, ${column.is_nullable === "YES" ? "nullable" : "NOT NULL"}${
            column.column_default ? `, default ${column.column_default}` : ""
          })`,
        );
      }
      const count = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.${table}`);
      console.log(`  rows: ${count.rows[0]?.count ?? "0"}`);
      const constraints = await pool.query<{ conname: string; definition: string }>(
        `SELECT conname, pg_get_constraintdef(oid) AS definition
           FROM pg_constraint
          WHERE conrelid = $1::regclass
          ORDER BY conname`,
        [`public.${table}`],
      );
      for (const constraint of constraints.rows) {
        console.log(`  constraint ${constraint.conname}: ${constraint.definition}`);
      }
    }

    if (existing.has("users")) {
      const count = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM public.users");
      console.log(`\nusers rows: ${count.rows[0]?.count ?? "0"}`);
    }

    console.log("\nRow counts:");
    for (const table of EXPECTED_TABLES) {
      if (!existing.has(table)) continue;
      const count = await pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM public.${table}`);
      console.log(`  ${table.padEnd(28)} ${count.rows[0]?.count ?? "0"}`);
    }

    if (existing.has("website_settings")) {
      const setup = await pool.query<{ value: string }>(
        "SELECT value FROM public.website_settings WHERE key = 'first_admin_setup_state'",
      );
      console.log(`\nfirst_admin_setup_state: ${setup.rows[0]?.value ?? "(not set)"}`);
    }

    if (missing.length) {
      console.log("\nResult: schema is incomplete. Run `npm run db:schema` before using the app.");
      process.exitCode = 1;
    } else {
      console.log("\nResult: all expected tables are present.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Database check failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
