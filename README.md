# EcoCampus AI

**Smart Environmental Management System** — a working platform where students and staff of
Lamrin Tech Skills University Punjab report environmental problems, track them to resolution,
and earn green-campus recognition.

EcoCampus AI is an **independent project**, not an official university service. University
information shown in the app is sourced from ltsu.ac.in and editable through the admin CMS.

## Architecture

| Layer | Service |
| --- | --- |
| Application data | Supabase PostgreSQL (server-side `pg` connection) |
| Accounts and sessions | Supabase Auth (email/password, Google OAuth, email OTP, reset links) |
| Uploaded images | Supabase Storage (public `ecocampus-uploads` bucket) |
| Deployment | Render (Node.js web service) |

The app never exposes the database or storage keys to the browser. `NEXT_PUBLIC_*` values are
limited to the Supabase project URL, publishable key and public site URL.

## Quick start

```bash
npm install
npm run db:schema   # applies the additive PostgreSQL schema (safe to re-run)
npm run db:check    # verifies all 25 tables and prints row counts
npm run db:migrate  # optional: copies legacy data/ecocampus.db into Supabase
npm run dev         # http://localhost:3000
```

Production: `npm run build && npm start`.

The schema migration is additive and runs inside a transaction. It never drops tables, truncates
data or resets sequences. `npm run db:reset` is intentionally disabled.

### Legacy data migration

`npm run db:migrate` imports `data/ecocampus.db` in read-only mode:

- rows with the same primary key are refreshed from the legacy database, so nothing is lost;
- rows that conflict only on a secondary unique key (for example `complaint_feedback.complaint_id`)
  keep the target primary key and are refreshed in place;
- **no target rows or local files are deleted**;
- uploads are copied only when `SUPABASE_SERVICE_ROLE_KEY` is set, otherwise the script warns and
  still migrates the schema and rows.

If you previously ran `npm run db:seed` against an empty Supabase database and then migrate the
legacy database, some child tables (status history, assignments, notifications) can contain both
seeded and legacy versions of the same activity. The legacy rows are authoritative; remove the
seed-only duplicates once (review the list first):

```bash
npx tsx scripts/dedupe-seeded-rows.ts          # dry run
npx tsx scripts/dedupe-seeded-rows.ts --apply  # delete seed-only rows
```

## First Admin setup

`/admin-setup` creates the first Admin only when no non-demo Admin profile exists and the
`first_admin_setup_state` setting is absent. It requires either a super-admin session or
`ADMIN_SETUP_TOKEN` (minimum 32 characters, server-only).

After a legacy migration an Admin profile usually already exists. Supabase Auth identities are
managed separately, so the Admin must sign in with a Supabase Auth account that uses the **same
email** as the migrated profile:

1. Sign in with Google using that email, or add the user in
   Supabase → Authentication → Users (`Add user`, auto-confirm) and then sign in with the password.
2. If you need to promote a different account, update the profile in the Supabase SQL Editor:
   `UPDATE public.users SET role = 'admin', status = 'active', email_verified = 1 WHERE lower(email) = lower('you@example.com');`
3. To run `/admin-setup` again intentionally, remove the marker first:
   `DELETE FROM public.website_settings WHERE key = 'first_admin_setup_state';`
   (Only do this when you understand that setup can be claimed once.)

Public signup remains limited to Student and Staff. The seeder creates demo records only; demo
profiles cannot authenticate.

## Authentication

- **Email + password** through Supabase Auth, with rate limiting and role checks server-side.
- **6-digit email code** and **magic links** for verification and passwordless sign-in. Supabase
  must send numeric codes, so the signup/recovery email templates must include `{{ .Token }}`.
- **Google OAuth** through Supabase. Allow
  `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback` in Supabase → Authentication → URL
  Configuration and register Supabase's Google callback URL in Google Cloud.
- **Password reset** through Supabase recovery links that return to
  `/api/auth/google/callback?next=/reset-password`.
- **Role-based access** is enforced on the server. New signups are Student or Staff only; staff
  registrations stay pending until an Admin approves them.

Google OAuth and email links are handled by one callback route that exchanges the Supabase code,
stores the session cookies and redirects by role. If Supabase falls back to the Site URL instead of
the callback, middleware forwards the `code` parameter to the callback so the session is still
created.

## Email delivery

Auth emails are sent by **Supabase Auth SMTP** — for example Brevo:

1. Supabase → Authentication → Settings → SMTP: enter the Brevo host, port, login and SMTP key.
2. Set the sender address/name to a verified Brevo sender.
3. Edit the Confirm signup / Magic link / Recovery templates to include `{{ .Token }}` and point
   links at `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback`.
4. Send a test verification and reset email before launch.

`RESEND_API_KEY` / `EMAIL_FROM` are legacy (the old local outbox sender) and are not used by
Supabase Auth. Without SMTP configured, Supabase cannot deliver codes or reset links.

## Environment variables

See `.env.example`. Required in production: `DATABASE_URL` or `SUPABASE_DB_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`,
`SUPABASE_SERVICE_ROLE_KEY`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` / `SUPABASE_DB_URL` | Server-only Supabase PostgreSQL connection string (SSL verified with the bundled CA) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`NEXT_PUBLIC_SUPABASE_ANON_KEY` legacy) | Browser-safe Supabase Auth key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for Supabase Storage (required in production) |
| `SUPABASE_STORAGE_BUCKET` | Public image bucket (default `ecocampus-uploads`) |
| `NEXT_PUBLIC_APP_URL` | Public URL used for OAuth callbacks, links and QR codes |
| `ADMIN_SETUP_TOKEN` | Optional server-only one-time Admin setup authorization |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Optional OpenAI-compatible LLM for EcoBot |

## Uploads

Images are validated by magic bytes (JPEG/PNG/WebP, max 5 MB). With
`SUPABASE_SERVICE_ROLE_KEY` set they are stored in the Supabase Storage bucket and the bucket is
created automatically if missing. Without the key, development writes to `public/uploads`; in
production the upload endpoint returns a clear 503 because Render's local disk is ephemeral.

`/uploads/<name>` URLs stay stable: static files in `public/uploads` are served directly, and the
`/uploads/[name]` route redirects anything else to the public Supabase Storage object.

## Project layout

```
src/app/(public)      Public site: home, about, report, map, awareness, announcements, track
src/app/(auth)        Login, signup, verify-email, forgot/reset password
src/app/admin-setup   One-time, server-authorized first Admin setup
src/app/student       Student portal (dashboard, reports, leaderboard, green actions)
src/app/staff         Staff portal (assigned tasks, own reports, updates)
src/app/admin         Admin portal (complaints, users, departments, map, CMS, reports, audit)
src/app/uploads       Stable /uploads/<name> image serving
src/app/api           REST endpoints (auth, complaints, uploads, admin CMS, chat)
src/lib               db, auth, validation (Zod), rate limiting, settings, analytics
src/components        UI system, charts (Recharts), Leaflet map, portal shells, EcoBot
supabase/migrations   Additive PostgreSQL schema, indexes, RLS and seed settings
scripts               apply-schema, check-db, migrate-supabase, seed, dedupe helpers
```

## Security notes

- Supabase Auth manages password hashing and browser sessions in HttpOnly cookies.
- Row Level Security is enabled on all tables; the server connects as the database owner. Direct
  anon/PostgREST table access is denied.
- Mutating APIs require same-origin requests and are rate-limited.
- Students can only read their own complaints; staff only assigned/department work; the public
  `/track` page exposes status only by complaint code.
- Admin actions (users, CMS, complaints, sign-ins) are recorded in the audit log.
- SSL verification stays enabled; the Supabase CA certificate is bundled in
  `src/lib/certs/prod-ca-2021.crt`.

## Deployment on Render

1. Back up `data/ecocampus.db` and `public/uploads` before any migration.
2. In Supabase: run `supabase/migrations/20261113000000_ecocampus_schema.sql` in the SQL Editor
   (or run `npm run db:schema` locally) and confirm with `npm run db:check`.
3. Create the Render web service: build `npm ci && npm run build`, start `npm start`, Node 22+.
4. Set the server env vars from `.env.example`. `NEXT_PUBLIC_APP_URL` must be the final https URL.
   Add `<NEXT_PUBLIC_APP_URL>/**` (or at least the callback URL) to Supabase Redirect URLs.
5. Verify: homepage, sign-in, Google OAuth, registration + email verification, password reset,
   student/staff/admin portals, report submission with an image, admin CMS save, notifications.
6. Auth emails are delivered by Supabase SMTP (Brevo), not by Render.

## Verification queries (Supabase SQL Editor)

```sql
-- 25 expected tables
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' order by 1;

-- expected settings and sections
select count(*) from public.website_settings;  -- 35 after legacy migration / 34 after schema only
select count(*) from public.website_sections;  -- 9

-- admin accounts that can sign in once Supabase Auth has the same email
select email, role, status, is_demo from public.users where role in ('admin','super_admin');
```
