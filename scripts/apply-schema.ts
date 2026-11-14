import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function connectionString() {
  const value = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error("Set DATABASE_URL (or SUPABASE_DB_URL) in .env.local before applying the schema.");
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
    connectionTimeoutMillis: 20_000,
    ssl: sslConfig(parsed.hostname),
  });

  const migrationPath = path.resolve(
    "supabase",
    "migrations",
    "20261113000000_ecocampus_schema.sql",
  );
  const schema = readFileSync(migrationPath, "utf8");

  const client = await pool.connect();
  try {
    console.log("Applying supabase/migrations/20261113000000_ecocampus_schema.sql ...");
    await client.query("BEGIN");
    await client.query(schema);
    await client.query("COMMIT");
    console.log("Schema applied successfully (transaction committed).");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Schema migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
