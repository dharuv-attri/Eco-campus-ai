# EcoCampus AI — Development Plan

**Project:** EcoCampus AI — Smart Environmental Management System
**Context:** Lamrin Tech Skills University Punjab, Ropar / Balachaur, Punjab
**Status:** Independent environmental management project. Not an officially endorsed LTSU service unless written authorization is obtained.

## 1. Research summary (official sources only)

Verified from ltsu.ac.in on 12 Nov 2026:

| Item | Verified detail | Source |
| --- | --- | --- |
| University name | Lamrin Tech Skills University Punjab (LTSU) | ltsu.ac.in |
| Established | Punjab State Act No. 22 of 2021; UGC-recognised under Section 2(f) of the UGC Act 1956 | /about-ltsu |
| Address | Chandigarh–Jalandhar Highway (NH 344A), Tehsil Balachaur, District SBS Nagar, Punjab 144533, India | /contact-us, /how-to-reach-ltsu |
| Contact | +91 8480005390, 01881-270794 / 270693, info@ltsu.ac.in | /contact-us |
| Location context | ~40 min from Chandigarh, ~6 km from Ropar, on NH 344A | /how-to-reach-ltsu |
| Campus | 100-acre educational campus developed by Rayat Educational and Research Trust (RERT) | /about-ltsu |
| Schools | Engineering & Technology, Computing, Pharmacy, Commerce & Management, Allied Health Sciences, Liberal Arts Sciences & Education, Hotel & Tourism Management, Polytechnic, Physical Education & Sports, Pharmaceutical Sciences, Legal Studies, Nursing, Design | ltsu.ac.in navigation |
| Map anchor | Official Google Maps embed centre: 30.991586, 76.477097 (Rel Majri / Balachaur, PIN 144533) | official embed on /how-to-reach-ltsu |

**Deliberately not invented:** building names/coordinates, student counts, sustainability statistics, official environmental claims, or an indoor floor map. Building pins remain unverified until an administrator adds and verifies them.

## 2. Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 3.4, custom component system inspired by shadcn/ui
- Supabase PostgreSQL for application data and user profiles; Supabase Auth for email/password, email OTP, Google OAuth, and cookie-backed sessions; server-side RBAC reads roles from the PostgreSQL user profile
- Supabase Storage for uploaded images, with existing `/uploads/<name>` URLs redirected to the public bucket after migration
- CSRF-origin checks, rate limiting, validated uploads
- Leaflet + OpenStreetMap maps
- Recharts analytics
- Secure server-side AI route with OpenAI-compatible provider support; safe local fallback assistant when no key is configured
- PWA manifest + service worker, dark mode, EN/हिंदी public UI, accessible components

## 3. Phases and deliverables

1. **Research + foundation** — official content, design system, DB schema, seed data, auth.
2. **Public website** — home, about, map, awareness, announcements, report entry, auth pages.
3. **Student portal** — dashboard, reporting (images/GPS/duplicate detection), tracking, notifications, feedback, reopen, profile, leaderboard.
4. **Staff portal** — assignments, status updates, progress notes, resolution photos, info requests.
5. **Admin portal** — analytics, complaint management, users/roles, departments, locations, website CMS, announcements, articles, reports (CSV/PDF), audit log, settings, demo-data purge.
6. **EcoBot AI** — multilingual, database-aware status checks, safe fallback, rate limiting, chat history.
7. **Premium extras** — Leaflet map + QR location links, receipt printing, heatmap, PWA, dark mode, leaderboard, quizzes, CSV/PDF exports, JSON backup.
8. **Security & QA** — RLS-equivalent access rules in every query, ownership checks, validation, sanitisation, production build, smoke tests.

## 4. Security model

- Roles: `student`, `staff`, `admin`, `super_admin`; staff registration requires approval; admin roles can only be granted by a super admin.
- All private layouts and API routes validate the Supabase session server-side, then authorise against the stored user profile; client-supplied roles and Supabase user metadata are never trusted.
- Students: own complaints only. Staff: assigned complaints or complaints assigned to their department, read/update only. Admins: platform management. Super admins: role management.
- Supabase SSR manages HttpOnly session cookies and middleware refresh; logout revokes the current Supabase session.
- Mutating APIs enforce same-origin, JSON/body validation (Zod), sanitised text, rate limits.
- Uploads: max 5 MB, image MIME + magic-byte checks, random filenames, stored in Supabase Storage; no executable content.
- AI keys stay server-side; chatbot cannot read other users' records and never asserts a report exists unless the DB query confirms it.
- Every privileged change writes to `admin_audit_logs`.

## 5. Environment variables

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`), `SUPABASE_DB_URL`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Run `npm run db:migrate` to apply the additive schema and copy SQLite rows and uploads without replacing existing target data. Set `SUPABASE_STORAGE_READY=true` only after verifying the bucket. Enable Google under Supabase Auth providers and allow the app callback URL in Supabase Auth URL Configuration; include the local port in use (for example, `http://localhost:3001/**`). Use a Supabase email template containing `{{ .Token }}` for numeric OTP verification. Any valid email address may register; Staff access requires approval, and Admin roles can only be assigned by an existing super administrator. Migrated profile role values are copied unchanged; existing accounts must also exist in Supabase Auth with the same verified email. AI and non-auth email integrations remain optional.

## 6. Verification checklist

- `npm run build` passes with type checking.
- Email/password signup and login, signup OTP verification/resend, Google sign-in, and logout work with the configured Supabase project.
- Existing accounts are provisioned in Supabase Auth with their profile email; Student, Staff, and Admin routes enforce stored roles and redirect unauthorised users.
- Student can report with photos, see timeline, receive notifications, give feedback, request reopen.
- Staff can update only assigned/department complaints.
- Admin can assign, change status, reject, verify, manage roles, edit CMS, export CSV/PDF, view audit log.
- Public CMS edits reflect immediately.
- Chatbot works without a key; provider mode verifies when key set.
- Responsive at 360 px, 768 px, 1280 px; keyboard focus visible; dark mode.
