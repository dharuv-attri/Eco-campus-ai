
import { AsyncLocalStorage } from "node:async_hooks";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool, types, type PoolClient } from "pg";

type SqlParam = string | number | bigint | null | Uint8Array;
type QueryResult = { changes: number };

const transactionClient = new AsyncLocalStorage<PoolClient>();

const globalForDb = globalThis as typeof globalThis & {
  __ecocampusPool?: Pool;
};

types.setTypeParser(20, (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : value;
});

function getPool() {
  if (globalForDb.__ecocampusPool) {
    return globalForDb.__ecocampusPool;
  }

  const connectionString =
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error(
      "Supabase PostgreSQL is not configured. Set SUPABASE_DB_URL on the server.",
    );
  }

  let hostname: string;

  try {
    const url = new URL(connectionString);

    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error();
    }

    hostname = url.hostname;
  } catch {
    throw new Error(
      "SUPABASE_DB_URL must be a valid PostgreSQL connection URL.",
    );
  }

  const isLocalhost = [
    "localhost",
    "127.0.0.1",
    "::1",
  ].includes(hostname);

  let sslConfig: false | { ca: string; rejectUnauthorized: boolean };

  if (isLocalhost) {
    sslConfig = false;
  } else {
    const certificatePath = path.join(
      process.cwd(),
      "src",
      "lib",
      "certs",
      "prod-ca-2021.crt",
    );

    let caCertificate: string;

    try {
      caCertificate = readFileSync(certificatePath, "utf8");
    } catch {
      throw new Error(
        `Supabase SSL certificate not found at: ${certificatePath}`,
      );
    }

    sslConfig = {
      ca: caCertificate,
      rejectUnauthorized: true,
    };
  }

  const pool = new Pool({
    connectionString,

    // Keep the application-side pool small for Vercel serverless instances.
    max: 1,

    keepAlive: true,
    keepAliveInitialDelayMillis: 5_000,

    // Release idle connections sooner.
    idleTimeoutMillis: 10_000,

    connectionTimeoutMillis: 10_000,
    application_name: "ecocampus-ai",
    ssl: sslConfig,
  });

  pool.on("error", (error) => {
    console.error("Idle PostgreSQL client error:", error);
  });

  globalForDb.__ecocampusPool = pool;

  return pool;
}

function toPostgresSql(sql: string) {
  const ignoreConflicts = /^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql);

  let source = ignoreConflicts
    ? sql.replace(/^(\s*INSERT)\s+OR\s+IGNORE\s+INTO\b/i, "$1 INTO")
    : sql;

  let output = "";
  let index = 0;
  let quote: "'" | '"' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (lineComment) {
      output += char;

      if (char === "\n") {
        lineComment = false;
      }

      continue;
    }

    if (blockComment) {
      output += char;

      if (char === "*" && next === "/") {
        output += next;
        i += 1;
        blockComment = false;
      }

      continue;
    }

    if (quote) {
      output += char;

      if (char === quote) {
        if (next === quote) {
          output += next;
          i += 1;
        } else {
          quote = null;
        }
      } else if (char === "\\" && next) {
        output += next;
        i += 1;
      }

      continue;
    }

    if (char === "-" && next === "-") {
      output += char + next;
      i += 1;
      lineComment = true;
    } else if (char === "/" && next === "*") {
      output += char + next;
      i += 1;
      blockComment = true;
    } else if (char === "'" || char === '"') {
      quote = char;
      output += char;
    } else if (char === "?") {
      output += `$${++index}`;
    } else {
      output += char;
    }
  }

  if (ignoreConflicts) {
    const semicolon = /;\s*$/.test(output);
    source = output.replace(/;\s*$/, "");
    output = `${source} ON CONFLICT DO NOTHING${semicolon ? ";" : ""}`;
  }

  return output;
}

async function query<
  T extends Record<string, unknown> = Record<string, unknown>
>(sql: string, params: SqlParam[]) {
  const client = transactionClient.getStore() ?? getPool();
  const statement = toPostgresSql(sql);

  try {
    return await client.query<T>(statement, params);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (/EMAXCONNSESSION|max clients reached/i.test(message)) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return client.query<T>(statement, params);
    }

    throw error;
  }
}

export async function all<T = Record<string, unknown>>(
  sql: string,
  ...params: SqlParam[]
): Promise<T[]> {
  const result = await query(sql, params);

  return result.rows.map((row) => ({ ...row }) as T);
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  ...params: SqlParam[]
): Promise<T | null> {
  const result = await query(sql, params);
  const row = result.rows[0];

  return row ? ({ ...row } as T) : null;
}

export async function run(
  sql: string,
  ...params: SqlParam[]
): Promise<QueryResult> {
  const result = await query(sql, params);

  return { changes: result.rowCount ?? 0 };
}

export async function exec(sql: string): Promise<void> {
  await query(sql, []);
}

export async function transaction<T>(
  fn: () => T | Promise<T>,
): Promise<T> {
  const currentClient = transactionClient.getStore();

  if (currentClient) {
    return fn();
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const result = await transactionClient.run(client, fn);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "Could not roll back the PostgreSQL transaction:",
        rollbackError,
      );
    }

    throw error;
  } finally {
    client.release();
  }
}
