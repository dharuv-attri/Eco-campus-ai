/** Read-only look at homepage section toggles and key content counts. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function connectionString() {
  const value = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) throw new Error("DATABASE_URL is not set.");
  return value;
}

function sslConfig(hostname: string) {
  if (["localhost", "127.0.0.1", "::1"].includes(hostname)) return false;
  return { ca: readFileSync(path.join(process.cwd(), "src", "lib", "certs", "prod-ca-2021.crt"), "utf8"), rejectUnauthorized: true };
}

async function main() {
  const url = connectionString();
  const pool = new Pool({ connectionString: url, max: 1, ssl: sslConfig(new URL(url).hostname) });
  try {
    const sections = await pool.query(
      "SELECT key, label, enabled, sort_order FROM website_sections ORDER BY sort_order",
    );
    console.log("website_sections:");
    for (const row of sections.rows) {
      console.log(`  ${String(row.key).padEnd(18)} enabled=${row.enabled} sort=${row.sort_order} ${row.label}`);
    }
    const counts = await pool.query(
      `SELECT
        (SELECT count(*) FROM announcements WHERE published = 1) AS announcements,
        (SELECT count(*) FROM environmental_articles WHERE published = 1) AS articles,
        (SELECT count(*) FROM campus_locations WHERE verified = 1) AS locations,
        (SELECT count(*) FROM complaints WHERE is_demo = 0) AS real_complaints`,
    );
    console.log("public content counts:", counts.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
