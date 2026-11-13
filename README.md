# EcoCampus AI

**Smart Environmental Management System** — a working platform where students and staff of
Lamrin Tech Skills University Punjab report environmental problems, track them to resolution,
and earn green-campus recognition.

EcoCampus AI is an **independent project**, not an official university service. University
information shown in the app is sourced from ltsu.ac.in and editable through the admin CMS.

## Quick start

```bash
npm install
npm run db:seed      # creates data/ecocampus.db with demo data
npm run dev          # http://localhost:3000
```

Production: `npm run build && npm start`.

`npm run db:reset` deletes the database and uploads for a clean start.

## Demo accounts (development only)

| Role | Email | Password |
| --- | --- | --- |
| Super admin | admin@ecocampus.local | EcoAdmin#2026 |
| Admin | eco.admin@ecocampus.local | EcoAdmin#2026 |
| Staff (approved) | staff@ecocampus.local | EcoStaff#2026 |
| Staff (pending — cannot sign in) | pending.staff@ecocampus.local | EcoStaff#2026 |
| Student | student@ecocampus.local | EcoStudent#2026 |

Demo data is flagged `is_demo` in the database and labelled in the UI.

## Authentication

- **Email + password** with strong password rules, lockout after repeated failures, rate limiting.
- **6-digit email OTP** for verification and passwordless sign-in (10-minute expiry, single use).
- **Magic links** — one click from the code email signs the user in (single use).
- **Google OAuth** — set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and register the
  redirect URI `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
- **Role-based access** enforced server-side only. New signups are always student or staff;
  staff registrations stay pending until an admin approves them; admin/super-admin roles are
  granted only by a super admin inside the portal.

**Email delivery:** without `RESEND_API_KEY` + `EMAIL_FROM`, the app runs in demo mode —
verification/sign-in codes and links are shown on-screen (never in production with delivery
configured). With delivery configured, real emails are sent and no code is ever returned by
the API.

## Environment variables

See `.env.example`. Everything except `NEXT_PUBLIC_APP_URL` is optional — the app runs with
zero external credentials on the built-in SQLite database.

| Variable | Purpose |
| --- | --- |
| `DATABASE_PATH` | SQLite file location (default `./data/ecocampus.db`) |
| `NEXT_PUBLIC_APP_URL` | Public URL used for OAuth callbacks, links, QR codes |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `RESEND_API_KEY` / `EMAIL_FROM` | Real email delivery (Resend) |
| `AUTO_VERIFY_EMAIL` | Skip verification in controlled demos only |
| `ALLOWED_EMAIL_DOMAIN` | Restrict registrations to one email domain |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Any OpenAI-compatible LLM for EcoBot (server-side only) |
| `SESSION_SECRET`, `SEED_*` | Session secret / initial super-admin seed values |

## Project layout

```
src/app/(public)      Public site: home, about, report, map, awareness, announcements, track
src/app/(auth)        Login, signup, verify-email, forgot/reset password
src/app/student       Student portal (dashboard, reports, leaderboard, green actions)
src/app/staff         Staff portal (assigned tasks, own reports, updates)
src/app/admin         Admin portal (complaints, users, departments, map, CMS, reports, audit)
src/app/api           REST endpoints (auth incl. OTP + magic link, complaints, uploads, admin CMS…)
src/lib               db, auth, validation (Zod), rate limiting, email/OTP engine, analytics
src/components        UI system, charts (Recharts), Leaflet map, portal shells, EcoBot
scripts/seed.ts       Demo data seeder
```

## Security notes

- Sessions are httpOnly cookies with hashed tokens; passwords use bcrypt.
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
