import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool } from "pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const apply = process.argv.includes("--apply");
const TABLES = [
  "complaint_assignments",
  "complaint_status_history",
  "staff_updates",
  "notifications",
] as const;

const legacy = new DatabaseSync(path.resolve(process.env.DATABASE_PATH || "data/ecocampus.db"), {
  readOnly: true,
});
const url = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) throw new Error("Set DATABASE_URL or SUPABASE_DB_URL.");
const parsed = new URL(url);

const pool = new Pool({
  connectionString: url,
  max: 1,
  ssl: ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)
    ? false
    : {
        ca: readFileSync(path.join(process.cwd(), "src", "lib", "certs", "prod-ca-2021.crt"), "utf8"),
        rejectUnauthorized: true,
      },
});

async function main() {
  try {
    for (const table of TABLES) {
      const legacyIds = new Set(
        (legacy.prepare(`SELECT id FROM "${table}"`).all() as Array<{ id: string }>).map((row) => row.id),
      );
      const targetRows = (
        await pool.query<{ id: string; created_at: string }>(
          `SELECT id, created_at FROM public."${table}" ORDER BY created_at`,
        )
      ).rows;
      const orphaned = targetRows.filter((row) => !legacyIds.has(row.id));

      console.log(
        `${table}: legacy=${legacyIds.size} target=${targetRows.length} seed-only=${orphaned.length}`,
      );
      for (const row of orphaned) {
        console.log(`  DELETE ${row.id} (${row.created_at})`);
      }

      if (apply && orphaned.length) {
        const ids = orphaned.map((row) => row.id);
        const placeholders = ids.map((_, index) => `$${index + 1}`).join(", ");
        const result = await pool.query(
          `DELETE FROM public."${table}" WHERE id IN (${placeholders})`,
          ids,
        );
        console.log(`  deleted ${result.rowCount ?? 0} row(s).`);
      }
    }

    if (!apply) {
      console.log("\nDry run only. Re-run with --apply to delete the seed-only rows listed above.");
    } else {
      console.log("\nCleanup committed.");
    }
  } finally {
    legacy.close();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Cleanup failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
