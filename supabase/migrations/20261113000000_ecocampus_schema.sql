CREATE TABLE IF NOT EXISTS public.roles (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);
CREATE TABLE IF NOT EXISTS public.users (
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
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  handles_categories TEXT,
  email TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.campus_locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  building TEXT,
  floor TEXT,
  description TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  verified INTEGER NOT NULL DEFAULT 0,
  qr_slug TEXT NOT NULL UNIQUE,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.complaints (
  id TEXT PRIMARY KEY,
  complaint_code TEXT NOT NULL UNIQUE,
  reporter_id TEXT NOT NULL REFERENCES public.users(id),
  anonymous INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'submitted',
  location_id TEXT REFERENCES public.campus_locations(id) ON DELETE SET NULL,
  building TEXT,
  floor TEXT,
  room_number TEXT,
  specific_location TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  assigned_department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  assigned_staff_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
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
CREATE TABLE IF NOT EXISTS public.complaint_images (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'report',
  uploaded_by TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.complaint_assignments (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  department_id TEXT REFERENCES public.departments(id) ON DELETE SET NULL,
  staff_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.complaint_status_history (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  changed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.staff_updates (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES public.users(id),
  update_type TEXT NOT NULL DEFAULT 'progress',
  message TEXT NOT NULL,
  image_url TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.complaint_feedback (
  id TEXT PRIMARY KEY,
  complaint_id TEXT NOT NULL UNIQUE REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  complaint_id TEXT REFERENCES public.complaints(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

DO $$
DECLARE
  value_type TEXT;
BEGIN
  IF to_regclass('public.website_settings') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'setting_key'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'key'
    ) THEN
      ALTER TABLE public.website_settings RENAME COLUMN setting_key TO key;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'setting_key'
    ) THEN
      RAISE EXCEPTION 'Both setting_key and key exist on public.website_settings; review the schema before migrating.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'setting_value'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'value'
    ) THEN
      ALTER TABLE public.website_settings RENAME COLUMN setting_value TO value;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'website_settings'
        AND column_name = 'setting_value'
    ) THEN
      RAISE EXCEPTION 'Both setting_value and value exist on public.website_settings; review the schema before migrating.';
    END IF;

    SELECT data_type INTO value_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'website_settings'
      AND column_name = 'value';

    IF value_type = 'jsonb' THEN
      ALTER TABLE public.website_settings
        ALTER COLUMN value TYPE TEXT
        USING CASE
          WHEN jsonb_typeof(value) = 'string' THEN value #>> '{}'
          ELSE value::TEXT
        END;
    ELSIF value_type IS DISTINCT FROM 'text' THEN
      RAISE EXCEPTION 'public.website_settings.value must be JSONB or TEXT before migration; found %.', value_type;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.website_settings
      WHERE key IS NULL OR value IS NULL
    ) THEN
      RAISE EXCEPTION 'public.website_settings contains null keys or values; no rows were changed.';
    END IF;

    ALTER TABLE public.website_settings
      ALTER COLUMN key SET NOT NULL,
      ALTER COLUMN value SET NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.website_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.website_sections (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

DO $$
DECLARE
  settings_updated_at_type TEXT;
  sections_updated_at_type TEXT;
BEGIN
  SELECT data_type INTO settings_updated_at_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'website_settings'
    AND column_name = 'updated_at';

  SELECT data_type INTO sections_updated_at_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'website_sections'
    AND column_name = 'updated_at';

  ALTER TABLE public.website_settings ALTER COLUMN updated_at SET DEFAULT NULL;
  IF settings_updated_at_type = 'timestamp with time zone' THEN
    ALTER TABLE public.website_settings
      ALTER COLUMN updated_at TYPE TEXT
      USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  ELSIF settings_updated_at_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'public.website_settings.updated_at must be TIMESTAMPTZ or TEXT; found %.', settings_updated_at_type;
  END IF;

  ALTER TABLE public.website_sections ALTER COLUMN updated_at SET DEFAULT NULL;
  IF sections_updated_at_type = 'timestamp with time zone' THEN
    ALTER TABLE public.website_sections
      ALTER COLUMN updated_at TYPE TEXT
      USING to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  ELSIF sections_updated_at_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'public.website_sections.updated_at must be TIMESTAMPTZ or TEXT; found %.', sections_updated_at_type;
  END IF;

  IF EXISTS (SELECT 1 FROM public.website_settings WHERE updated_at IS NULL)
     OR EXISTS (SELECT 1 FROM public.website_sections WHERE updated_at IS NULL) THEN
    RAISE EXCEPTION 'A website settings/section row has a null updated_at; no rows were changed.';
  END IF;

  ALTER TABLE public.website_settings ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.website_sections ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE public.website_settings
    ALTER COLUMN updated_at SET DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
  ALTER TABLE public.website_sections
    ALTER COLUMN updated_at SET DEFAULT to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
END $$;

CREATE TABLE IF NOT EXISTS public.announcements (
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
CREATE TABLE IF NOT EXISTS public.environmental_articles (
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
CREATE TABLE IF NOT EXISTS public.green_activities (
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
CREATE TABLE IF NOT EXISTS public.leaderboard_points (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  activity_id TEXT,
  complaint_id TEXT,
  quiz_id TEXT,
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  id TEXT PRIMARY KEY,
  chat_session_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT,
  mode TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
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
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stored_name TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'logged',
  error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT
);
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_points_complaint
  ON public.leaderboard_points(user_id, complaint_id) WHERE complaint_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_points_quiz
  ON public.leaderboard_points(user_id, quiz_id) WHERE quiz_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_attempt_user
  ON public.quiz_attempts(quiz_id, user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON public.complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter_created ON public.complaints(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_department ON public.complaints(assigned_department_id);
CREATE INDEX IF NOT EXISTS idx_complaints_department_created ON public.complaints(assigned_department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_staff ON public.complaints(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_complaints_staff_created ON public.complaints(assigned_staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON public.complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_history_complaint ON public.complaint_status_history(complaint_id, created_at);
CREATE INDEX IF NOT EXISTS idx_images_complaint ON public.complaint_images(complaint_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role, status);

INSERT INTO public.roles (id, name, description) VALUES
  (1, 'student', 'Reports environmental problems and tracks their own complaints'),
  (2, 'staff', 'Handles complaints assigned to them or their department'),
  (3, 'admin', 'Manages complaints, content, users and campus data'),
  (4, 'super_admin', 'Full platform control including role management')
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.website_settings'::regclass
      AND contype IN ('p', 'u')
      AND pg_get_constraintdef(oid) IN ('PRIMARY KEY (key)', 'UNIQUE (key)')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.website_settings
      GROUP BY key
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'public.website_settings has duplicate keys; no unique index was created.';
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS website_settings_key_unique
      ON public.website_settings(key);
  END IF;
END $$;

INSERT INTO public.departments
  (id, name, slug, description, handles_categories, email, created_at, updated_at)
VALUES
  ('dept-water-plumbing', 'Water & Plumbing', 'water-plumbing',
   'Leakages, taps, water conservation and rainwater harvesting infrastructure.',
   '["water_leakage","water_wastage","damaged_taps","rainwater_harvesting"]',
   'water@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-electrical', 'Electrical Maintenance', 'electrical',
   'Lighting, electricity wastage, air-conditioning and solar equipment.',
   '["electricity_wastage","broken_lights","ac_running","solar_equipment"]',
   'electrical@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-housekeeping', 'Housekeeping & Sanitation', 'housekeeping',
   'Washroom cleanliness, garbage collection and campus hygiene.',
   '["garbage_waste","dirty_washrooms"]',
   'housekeeping@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-waste-management', 'Waste Management', 'waste-management',
   'Segregation, plastic reduction and construction waste.',
   '["plastic_pollution","construction_waste"]',
   'waste@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-civil', 'Civil Works', 'civil',
   'Drains, sewage and campus civil infrastructure.',
   '["drainage","blocked_drains","sewage"]',
   'civil@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-horticulture', 'Horticulture & Grounds', 'horticulture',
   'Green areas, trees and landscaping.',
   '["green_area","tree_damage"]',
   'grounds@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-environment-safety', 'Environment & Safety', 'environment-safety',
   'Air quality, noise and environmental safety concerns.',
   '["air_pollution","noise_pollution"]',
   'safety@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dept-operations', 'Campus Operations', 'operations',
   'General environmental issues and coordination.',
   '["other"]',
   'operations@ecocampus.local', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
   to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
ON CONFLICT DO NOTHING;

INSERT INTO public.website_settings (key, value, updated_at) VALUES
  ('site_name', 'EcoCampus AI', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('site_subtitle', 'Smart Environmental Management System', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('tagline', 'Report. Track. Resolve. Build a Greener Campus.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('university_name', 'Lamrin Tech Skills University Punjab', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('hero_heading', 'Let''s Make Our Campus Cleaner, Greener & Smarter.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('hero_description', 'An AI-powered platform that helps students and university staff report environmental problems, track solutions, and build a sustainable campus.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('hero_image', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('hero_badge', 'Independent campus sustainability initiative', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('about_heading', 'Built for the campus community, powered by transparency', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('about_summary', 'EcoCampus AI gives every student and staff member a clear way to report environmental problems, follow real progress, and celebrate verified improvements. Every report is traceable from submission to closure.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('logo_url', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('favicon_url', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('background_image', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('primary_color', '#14532D', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('secondary_color', '#10B981', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('background_color', '#F6FAF7', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('dark_background_color', '#0A1410', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('contact_email', 'info@ltsu.ac.in', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('contact_phone', '01881-270794 / 270693', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('contact_mobile', '+91 8480005390', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('address', 'Chandigarh–Jalandhar Highway (NH 344A), Tehsil Balachaur, District SBS Nagar, Punjab 144533, India', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('footer_text', 'EcoCampus AI is an independent environmental management project. It is not an official Lamrin Tech Skills University Punjab service unless authorization is obtained.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('announcement_banner', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('map_center_lat', '30.991586', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('map_center_lng', '76.477097', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('map_center_source', 'Map centre from the official LTSU Google Maps embed. Building-level pins require administrator verification.', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('water_saved_liters', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('energy_saved_kwh', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('impact_metric_note', '', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('anonymous_reporting_enabled', 'true', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('registration_open', 'true', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('social_instagram', 'https://www.instagram.com/lamrintechskillsuniversity/', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('social_linkedin', 'https://www.linkedin.com/company/76645349', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('social_youtube', 'https://www.youtube.com/channel/UCa-hPFUL3DypAk87S80eNwg', to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.website_sections (key, label, enabled, sort_order, updated_at) VALUES
  ('hero', 'Hero & primary actions', 1, 1, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('stats', 'Live campus statistics', 1, 2, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('recent_issues', 'Recently reported issues', 1, 3, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('how_it_works', 'How it works', 1, 4, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('map', 'Interactive campus map', 1, 5, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('initiatives', 'Sustainability initiatives', 1, 6, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('awareness', 'Environmental awareness', 1, 7, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('achievements', 'Platform achievements', 1, 8, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
  ('contact', 'Contact & footer', 1, 9, to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environmental_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.green_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
