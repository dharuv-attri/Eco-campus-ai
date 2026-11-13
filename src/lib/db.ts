import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as {
  __ecocampusDb?: DatabaseSync;
  __ecocampusDbInit?: boolean;
};

export function databasePath() {
  const configured = process.env.DATABASE_PATH || "data/ecocampus.db";
  return path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  full_name TEXT NOT NULL,
  profile_image TEXT,
  student_id TEXT,
  course TEXT,
  department TEXT,
  department_id TEXT,
  year_semester TEXT,
  employee_id TEXT,
  designation TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  provider TEXT NOT NULL DEFAULT 'email',
  is_demo INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  handles_categories TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS campus_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  description TEXT,
  lat REAL,
  lng REAL,
  verified INTEGER NOT NULL DEFAULT 0,
  qr_slug TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  complaint_code TEXT NOT NULL UNIQUE,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  anonymous INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'submitted',
  location_id TEXT REFERENCES campus_locations(id) ON DELETE SET NULL,
  building TEXT,
  floor TEXT,
  room_number TEXT,
  specific_location TEXT,
  lat REAL,
  lng REAL,
  assigned_department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  assigned_staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  admin_notes TEXT,
  resolution_notes TEXT,
  rejection_reason TEXT,
  reopen_reason TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  resolved_at TEXT,
  verified_at TEXT,
  closed_at TEXT
);

CREATE TABLE IF NOT EXISTS complaint_images (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'report',
  uploaded_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_assignments (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
  staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_updates (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES users(id),
  update_type TEXT NOT NULL DEFAULT 'progress',
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS complaint_feedback (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL UNIQUE REFERENCES complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  complaint_id TEXT REFERENCES complaints(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS website_sections (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  published INTEGER NOT NULL DEFAULT 1,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS environmental_articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  read_minutes INTEGER NOT NULL DEFAULT 4,
  image_url TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS green_activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  activity_date TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  activity_id TEXT,
  complaint_id TEXT,
  quiz_id TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_complaint
  ON leaderboard_points(user_id, complaint_id) WHERE complaint_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_quiz
  ON leaderboard_points(user_id, quiz_id) WHERE quiz_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempt_user ON quiz_attempts(quiz_id, user_id);

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id TEXT PRIMARY KEY,
  chat_session_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  mode TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'logged',
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter_created ON complaints(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON complaints(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_created ON complaints(assigned_department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_staff ON complaints(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_complaints_staff_created ON complaints(assigned_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_history_complaint ON complaint_status_history(complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_images_complaint ON complaint_images(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, status);

INSERT OR IGNORE INTO roles (id, name, description) VALUES
  (1, 'student', 'Reports environmental problems and tracks their own complaints'),
  (2, 'staff', 'Handles complaints assigned to them or their department'),
  (3, 'admin', 'Manages complaints, content, users and campus data'),
  (4, 'super_admin', 'Full platform control including role management');
`;

function initialise(db: DatabaseSync) {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
}

export function getDb() {
  if (globalForDb.__ecocampusDb && globalForDb.__ecocampusDbInit) {
    return globalForDb.__ecocampusDb;
  }
  const file = databasePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  initialise(db);
  globalForDb.__ecocampusDb = db;
  globalForDb.__ecocampusDbInit = true;
  return db;
}

type SqlParam = string | number | bigint | null | Uint8Array;

/**
 * node:sqlite returns rows as objects with a null prototype, which Next.js
 * cannot serialize when passed from Server Components to Client Components.
 * Normalize every row into a plain object here so all callers are safe.
 */
function plain<T>(row: unknown): T {
  return { ...(row as Record<string, unknown>) } as T;
}

export function all<T = Record<string, unknown>>(sql: string, ...params: SqlParam[]): T[] {
  const rows = getDb().prepare(sql).all(...params) as unknown[];
  return rows.map((row) => plain<T>(row));
}

export function one<T = Record<string, unknown>>(sql: string, ...params: SqlParam[]): T | null {
  const row = getDb().prepare(sql).get(...params);
  return row ? plain<T>(row) : null;
}

export function run(sql: string, ...params: SqlParam[]) {
  return getDb().prepare(sql).run(...params);
}

export function exec(sql: string) {
  getDb().exec(sql);
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore a rollback failure; the original error is more useful.
    }
    throw error;
  }
}

export function closeDb() {
  if (globalForDb.__ecocampusDb) {
    globalForDb.__ecocampusDb.close();
    globalForDb.__ecocampusDb = undefined;
    globalForDb.__ecocampusDbInit = false;
  }
}
