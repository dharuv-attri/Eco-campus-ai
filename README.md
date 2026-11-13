# EcoCampus AI

**Smart Environmental Management System** — a working platform where students and staff of
Lamrin Tech Skills University Punjab report environmental problems, track them to resolution,
and earn green-campus recognition.

EcoCampus AI is an **independent project**, not an official university service. University
information shown in the app is sourced from ltsu.ac.in and editable through the admin CMS.

## Quick start

```bash
npm install
npm run db:seed      # creates data/ecocampus.db with non-login demo records
npm run dev          # http://localhost:3000
```

Production: `npm run build && npm start`.

`npm run db:reset` deletes the database and uploads for a clean start.

## First Admin setup

1. Configure Supabase Auth and set `ADMIN_SETUP_TOKEN` in the server environment to a private
   value with at least 32 characters. Do not prefix it with `NEXT_PUBLIC_` or commit it.
2. Visit `/admin-setup`, enter the setup token, then choose and confirm the Admin email and
   password. The endpoint only creates the `admin` role server-side and can be used once.
3. If Supabase requires email confirmation, verify the email before signing in at
   `/login?role=admin`.

An existing authenticated super-admin can authorize setup without a token. Public signup remains
limited to Student and Staff. The database seeder creates demo records only; it creates no default
Admin profile or login credentials.

## Authentication

- **Email + password** with strong password rules, lockout after repeated failures, rate limiting.
- **6-digit email OTP** for verification and passwordless sign-in (10-minute expiry, single use).
- **Magic links** — one click from the code email signs the user in (single use).
- **Google OAuth** — enable Google under Supabase Auth providers, then allow
  `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback` in Supabase's URL configuration and register
  Supabase's provider callback URL with Google Cloud.
- **Role-based access** enforced server-side only. New signups are always student or staff;
  staff registrations stay pending until an admin approves them; the first Admin is provisioned
  through the one-time setup route, never through public registration.

**Email delivery:** without `RESEND_API_KEY` + `EMAIL_FROM`, the app runs in demo mode —
verification/sign-in codes and links are shown on-screen (never in production with delivery
configured). With delivery configured, real emails are sent and no code is ever returned by
the API.

## Environment variables

See `.env.example`. The app uses the built-in SQLite database for campus profiles and
Supabase Auth for live authentication. Configure the Supabase URL and public key to enable
sign-in and registration.

| Variable | Purpose |
| --- | --- |
| `DATABASE_PATH` | SQLite file location (default `./data/ecocampus.db`) |
| `NEXT_PUBLIC_APP_URL` | Public URL used for OAuth callbacks, links, QR codes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`NEXT_PUBLIC_SUPABASE_ANON_KEY` legacy) | Supabase Auth client key |
| `ADMIN_SETUP_TOKEN` | Optional server-only, one-time Admin setup authorization (minimum 32 characters) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Real email delivery (Resend) |
| `AUTO_VERIFY_EMAIL` | Skip verification in controlled demos only |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Any OpenAI-compatible LLM for EcoBot (server-side only) |
| `SESSION_SECRET` | Session secret |

Enable Google in Supabase Auth and allow the app callback URL in Supabase's URL
Configuration. Any valid email address may register as Student or Staff; Admin access is
assigned only by a super administrator.

## Project layout

```
src/app/(public)      Public site: home, about, report, map, awareness, announcements, track
src/app/(auth)        Login, signup, verify-email, forgot/reset password
src/app/admin-setup   One-time, server-authorized first Admin setup
src/app/student       Student portal (dashboard, reports, leaderboard, green actions)
src/app/staff         Staff portal (assigned tasks, own reports, updates)
src/app/admin         Admin portal (complaints, users, departments, map, CMS, reports, audit)
src/app/api           REST endpoints (auth incl. OTP + magic link, complaints, uploads, admin CMS…)
src/lib               db, auth, validation (Zod), rate limiting, email/OTP engine, analytics
src/components        UI system, charts (Recharts), Leaflet map, portal shells, EcoBot
scripts/seed.ts       Demo data seeder
```

## Security notes

- Supabase Auth manages password hashing and browser sessions in cookies.
- All uploads are magic-byte-validated images stored with UUID names.
- Mutating APIs require same-origin requests and are rate-limited.
- Students can only read their own complaints; staff only assigned/department work;
  the public `/track` page exposes status only by complaint code.
- Admin actions (users, CMS, complaints, sign-ins) are recorded in the audit log.

## Deployment (free tiers)

1. Push the repo to GitHub.
2. Deploy on Vercel (or any Node host). Set `NEXT_PUBLIC_APP_URL` to the deployment URL.
3. For a hosted database, create a free Supabase/Postgres project and migrate the schema in
   `DEVELOPMENT_PLAN.md` (Row Level Security policies included there); set `DATABASE_PATH`
   to a persistent disk path on hosts that support it.
4. Add Resend + Google OAuth credentials for real email/OAuth. No paid services required.
