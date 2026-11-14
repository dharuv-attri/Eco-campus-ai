import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const TABLES = [
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

type SqliteValue = string | number | bigint | Uint8Array | null;
type SqliteRow = Record<string, SqliteValue>;

function assertIdentifier(identifier: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(identifier)) {
    throw new Error(`Unsupported database identifier in migration: ${identifier}`);
  }
}

function sameValue(left: unknown, right: unknown) {
  if (typeof left === "bigint") left = Number(left);
  if (typeof right === "bigint") right = Number(right);
  if (left instanceof Uint8Array && right instanceof Uint8Array) {
    return Buffer.from(left).equals(Buffer.from(right));
  }
  return left === right;
}

async function ensureStorageBucket(
  supabase: SupabaseClient,
  bucketName: string,
) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`Could not inspect Supabase Storage buckets: ${listError.message}`);

  const existing = buckets.find((bucket) => bucket.name === bucketName);
  if (existing) {
    if (!existing.public) {
      throw new Error(
        `Supabase Storage bucket "${bucketName}" already exists but is private. No bucket settings were changed.`,
      );
    }
    return;
  }

  const { error } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });
  if (error) throw new Error(`Could not create Supabase Storage bucket: ${error.message}`);
}

async function migrateUploads(
  supabase: SupabaseClient,
  bucketName: string,
  sourceDirectory: string,
  uploadedFiles: SqliteRow[],
) {
  const files = await readdir(sourceDirectory, { withFileTypes: true });
  const sourceNames = new Set<string>();
  const storage = supabase.storage.from(bucketName);

  for (const entry of files) {
    if (!entry.isFile()) continue;
    const storedName = entry.name;
    if (!/^[A-Za-z0-9._-]+$/.test(storedName)) {
      throw new Error(`Unsupported upload filename encountered: ${storedName}`);
    }

    const extension = path.extname(storedName).toLowerCase();
    const contentType =
      extension === ".jpg" || extension === ".jpeg"
        ? "image/jpeg"
        : extension === ".png"
          ? "image/png"
          : extension === ".webp"
            ? "image/webp"
            : null;
    if (!contentType) throw new Error(`Unsupported upload file type: ${storedName}`);

    sourceNames.add(storedName);
    const bytes = await readFile(path.join(sourceDirectory, storedName));
    const { data: matches, error: listError } = await storage.list("", {
      limit: 10,
      search: storedName,
    });
    if (listError) throw new Error(`Could not inspect stored upload "${storedName}": ${listError.message}`);

    if (matches.some((object) => object.name === storedName)) {
      const { data, error } = await storage.download(storedName);
      if (error) throw new Error(`Could not verify stored upload "${storedName}": ${error.message}`);
      const storedBytes = Buffer.from(await data.arrayBuffer());
      const sourceHash = createHash("sha256").update(bytes).digest("hex");
      const storedHash = createHash("sha256").update(storedBytes).digest("hex");
      if (sourceHash !== storedHash) {
        throw new Error(`Stored upload "${storedName}" differs from the local source; no overwrite was attempted.`);
      }
      continue;
    }

    const { error } = await storage.upload(storedName, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error(`Could not migrate upload "${storedName}": ${error.message}`);
  }

  for (const row of uploadedFiles) {
    const storedName = row.stored_name;
    if (typeof storedName !== "string" || !sourceNames.has(storedName)) {
      throw new Error(`The local upload referenced by a database row is missing: ${String(storedName)}`);
    }
  }
  return sourceNames.size;
}

const SECONDARY_UNIQUE_COLUMNS: Partial<
  Record<(typeof TABLES)[number], string[][]>
> = {
  users: [["email"]],
  sessions: [["token_hash"]],
  email_tokens: [["token_hash"]],
  departments: [["name"], ["slug"]],
  campus_locations: [["qr_slug"]],
  complaints: [["complaint_code"]],
  complaint_feedback: [["complaint_id"]],
  announcements: [["slug"]],
  environmental_articles: [["slug"]],
  uploaded_files: [["stored_name"]],
  leaderboard_points: [
    ["user_id", "complaint_id"],
    ["user_id", "quiz_id"],
  ],
  quiz_attempts: [["quiz_id", "user_id"]],
};

function matchColumns(columns: string[], offset = 0) {
  return columns
    .map((column, index) => `"${column}" IS NOT DISTINCT FROM $${offset + index + 1}`)
    .join(" AND ");
}

async function copyTable(
  sqlite: DatabaseSync,
  client: PoolClient,
  table: (typeof TABLES)[number],
  options?: { preferSource?: boolean },
) {
  const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as SqliteRow[];
  const primaryKeyColumns = (sqlite.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
    name: string;
    pk: number;
  }>)
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk)
    .map((column) => column.name);

  if (!primaryKeyColumns.length) {
    throw new Error(`Cannot safely migrate "${table}" without a primary key.`);
  }

  // Secondary UNIQUE constraints. When a target row already occupies one of
  // these keys under a different primary key, the target row is refreshed and
  // keeps its own primary key so existing references remain valid.
  const uniqueGroups: string[][] = [
    ...(SECONDARY_UNIQUE_COLUMNS[table] ?? []),
  ];

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const columns = Object.keys(row);
    columns.forEach(assertIdentifier);
    const values = columns.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const insert = await client.query(
      `INSERT INTO public."${table}" (${columns.map((column) => `"${column}"`).join(", ")})
       VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING 1`,
      values,
    );
    if (insert.rowCount) {
      inserted += 1;
      continue;
    }

    let keyValues = primaryKeyColumns.map((column) => row[column]);
    let keyColumns = primaryKeyColumns;

    let existing = await client.query(
      `SELECT * FROM public."${table}" WHERE ${matchColumns(keyColumns)}`,
      keyValues,
    );

    if (!existing.rows[0]) {
      for (const group of uniqueGroups) {
        if (group.some((column) => row[column] === null || row[column] === undefined)) continue;
        const candidate = await client.query(
          `SELECT * FROM public."${table}" WHERE ${matchColumns(group)}`,
          group.map((column) => row[column]),
        );
        if (candidate.rows[0]) {
          existing = candidate;
          keyColumns = group;
          keyValues = group.map((column) => row[column]);
          break;
        }
      }
    }

    const target = existing.rows[0] as Record<string, unknown> | undefined;
    if (!target) {
      throw new Error(
        `Migration conflict in "${table}" for primary key ${JSON.stringify(primaryKeyColumns.map((column) => row[column]))}. Existing target data was preserved.`,
      );
    }

    const differs = columns.filter((column) => !sameValue(row[column], target[column]));
    if (!differs.length) {
      unchanged += 1;
      continue;
    }

    if (!options?.preferSource) {
      throw new Error(
        `Migration conflict in "${table}" for primary key ${JSON.stringify(primaryKeyColumns.map((column) => row[column]))}. Existing target data was preserved.`,
      );
    }

    // Preserve the source record when it is the historical version of the same
    // row; the target row is refreshed rather than skipped.
    const setColumns = differs.filter(
      (column) => !keyColumns.includes(column) && !primaryKeyColumns.includes(column),
    );
    if (!setColumns.length) {
      unchanged += 1;
      continue;
    }
    const set = setColumns.map((column, index) => `"${column}" = $${index + 1}`).join(", ");
    const setValues = setColumns.map((column) => row[column]);
    const offset = setValues.length;
    await client.query(
      `UPDATE public."${table}" SET ${set} WHERE ${matchColumns(keyColumns, offset)}`,
      [...setValues, ...keyValues],
    );
    updated += 1;
  }

  return { rows: rows.length, inserted, updated, unchanged };
}

async function migrate() {
  const databaseUrl =
    process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("Set DATABASE_URL (or SUPABASE_DB_URL) before running the migration.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const storageReady = Boolean(supabaseUrl && serviceRoleKey);

  const sourceDatabase = path.resolve(process.env.DATABASE_PATH || "data/ecocampus.db");
  const sourceUploads = path.resolve("public", "uploads");
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "ecocampus-uploads";

  const parsedDatabaseUrl = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(parsedDatabaseUrl.protocol)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection URL.");
  }

  let supabase: SupabaseClient | null = null;
  if (storageReady) {
    const parsedSupabaseUrl = new URL(supabaseUrl!);
    if (!["http:", "https:"].includes(parsedSupabaseUrl.protocol)) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid http or https URL.");
    }
    supabase = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
    });
  } else {
    console.warn(
      "Supabase Storage is not configured (SUPABASE_SERVICE_ROLE_KEY is missing). Uploaded images will not be copied; database schema and records will still be migrated.",
    );
  }

  const sqlite = new DatabaseSync(sourceDatabase, { readOnly: true });
  const isLocalDatabase = ["localhost", "127.0.0.1", "::1"].includes(parsedDatabaseUrl.hostname);
  const certificatePath = path.join(process.cwd(), "src", "lib", "certs", "prod-ca-2021.crt");
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 20_000,
    ssl: isLocalDatabase
      ? false
      : { ca: readFileSync(certificatePath, "utf8"), rejectUnauthorized: true },
  });

  try {
    const uploadedFiles = sqlite.prepare("SELECT stored_name FROM uploaded_files").all() as SqliteRow[];
    let uploadCount = 0;
    if (supabase) {
      await ensureStorageBucket(supabase, bucketName);
      uploadCount = await migrateUploads(supabase, bucketName, sourceUploads, uploadedFiles);
    } else if (uploadedFiles.length) {
      console.warn(
        `Skipping ${uploadedFiles.length} uploaded image file(s). Run again with SUPABASE_SERVICE_ROLE_KEY to copy them to Supabase Storage.`,
      );
    }

    const migrationPath = path.resolve(
      "supabase",
      "migrations",
      "20261113000000_ecocampus_schema.sql",
    );
    const schema = await readFile(migrationPath, "utf8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(schema);
      const counts: Array<[string, { rows: number; inserted: number; updated: number; unchanged: number }]> = [];
      for (const table of TABLES) {
        // The SQLite database is the historical source of truth for existing
        // records. Rows with the same primary key are refreshed from the source
        // instead of being treated as an error or being silently dropped.
        counts.push([table, await copyTable(sqlite, client, table, { preferSource: true })]);
      }
      await client.query("COMMIT");
      console.log("Supabase migration completed. Verified source rows per table:");
      for (const [table, count] of counts) {
        console.log(
          `  ${table}: ${count.rows} source rows (${count.inserted} inserted, ${count.updated} updated, ${count.unchanged} unchanged)`,
        );
      }
      if (supabase) {
        console.log(`  Storage bucket "${bucketName}": ${uploadCount} local files verified`);
      } else {
        console.log("  Storage uploads: skipped (Supabase Storage not configured)");
      }
      console.log("No existing target rows or local source files were deleted.");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error("Supabase migration failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
