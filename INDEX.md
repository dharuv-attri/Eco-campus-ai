# EcoCampus AI — Folder Index

This index describes the project files and their purpose. Generated dependencies and build output are excluded.

## Project root

- `.env.example` — example environment-variable configuration.
- `.gitignore` — files excluded from version control.
- `DEVELOPMENT_PLAN.md` — project background, architecture, security model, and verification checklist.
- `next.config.ts` — Next.js configuration.
- `package.json` — project metadata, dependencies, and npm scripts.
- `package-lock.json` — locked npm dependency versions.
- `postcss.config.mjs` — PostCSS configuration.
- `tailwind.config.ts` — Tailwind CSS theme and content configuration.
- `tsconfig.json` — TypeScript configuration.
- `tsconfig.tsbuildinfo` — TypeScript incremental-build metadata.

## `data/`

- `ecocampus.db` — local SQLite database.
- `uploads/.gitkeep` — keeps the uploads directory present when empty.

## `public/`

Static assets served directly by the app:

- `favicon.svg`
- `icon-192.svg`
- `icon-512.svg`
- `sw.js` — service worker.

## `scripts/`

- `reset.ts` — resets the local database.
- `seed.ts` — inserts seed data into the local database.

## `src/app/`

Next.js App Router pages, layouts, metadata endpoints, and API routes.

### Shared app files

- `error.tsx` — app-level error UI.
- `globals.css` — global styles.
- `layout.tsx` — root layout.
- `manifest.ts` — PWA manifest.
- `not-found.tsx` — not-found UI.
- `robots.ts` — robots metadata.
- `sitemap.ts` — sitemap generation.

### `(auth)/`

Authentication screens and shared auth layout:

- `layout.tsx`
- `forgot-password/page.tsx`
- `login/page.tsx`
- `reset-password/page.tsx`
- `signup/page.tsx`
- `verify-email/page.tsx`

### `(public)/`

Public website pages and shared public layout:

- `layout.tsx`, `loading.tsx`, `page.tsx`
- `about/page.tsx`
- `announcements/page.tsx`
- `announcements/[slug]/page.tsx`
- `campus-map/page.tsx`
- `environmental-awareness/page.tsx`
- `environmental-awareness/[slug]/page.tsx`
- `report-problem/page.tsx`
- `track/page.tsx`

### `admin/`

Admin portal pages:

- `layout.tsx`
- `activities/page.tsx`
- `announcements/page.tsx`
- `audit/page.tsx`
- `awareness/page.tsx`
- `cms/page.tsx`
- `complaints/page.tsx`
- `complaints/[id]/page.tsx`
- `dashboard/page.tsx`
- `departments/page.tsx`
- `leaderboard/page.tsx`
- `map/page.tsx`
- `notifications/page.tsx`
- `profile/page.tsx`
- `reports/page.tsx`
- `users/page.tsx`

### `staff/`

Staff portal pages:

- `layout.tsx`
- `dashboard/page.tsx`
- `notifications/page.tsx`
- `profile/page.tsx`
- `reports/page.tsx`
- `reports/new/page.tsx`
- `reports/[id]/page.tsx`
- `tasks/page.tsx`
- `tasks/[id]/page.tsx`

### `student/`

Student portal pages:

- `layout.tsx`
- `dashboard/page.tsx`
- `green-actions/page.tsx`
- `leaderboard/page.tsx`
- `notifications/page.tsx`
- `profile/page.tsx`
- `reports/page.tsx`
- `reports/new/page.tsx`
- `reports/[id]/page.tsx`

### `api/`

Route handlers:

- `admin/activities/route.ts`
- `admin/announcements/route.ts`
- `admin/articles/route.ts`
- `admin/complaints/[id]/action/route.ts`
- `admin/departments/route.ts`
- `admin/locations/route.ts`
- `admin/sections/route.ts`
- `admin/settings/route.ts`
- `admin/users/[id]/route.ts`
- `auth/forgot/route.ts`
- `auth/google/route.ts`
- `auth/google/callback/route.ts`
- `auth/login/route.ts`
- `auth/logout/route.ts`
- `auth/me/route.ts`
- `auth/register/route.ts`
- `auth/resend-verification/route.ts`
- `auth/reset/route.ts`
- `auth/verify/route.ts`
- `chat/route.ts`
- `complaints/[id]/feedback/route.ts`
- `complaints/[id]/reopen/route.ts`
- `notifications/route.ts`
- `profile/route.ts`
- `quiz/route.ts`
- `reports/route.ts`
- `reports/check-duplicate/route.ts`
- `staff/complaints/[id]/action/route.ts`
- `uploads/route.ts`

## `src/components/`

Reusable React UI and feature components:

- `brand.tsx`, `ecobot.tsx`, `language-switcher.tsx`, `providers.tsx`, `theme-toggle.tsx`
- `admin/` — activity, announcement, article, CMS, complaint, department, location, and user management components.
- `auth/` — authentication forms.
- `charts/` — chart components.
- `complaints/` — complaint cards, details, filters, reporter/staff actions, and timelines.
- `forms/` — reporting form.
- `maps/` — campus map and map implementation.
- `portal/` — exports, leaderboard, notifications, portal shell, profile form, and quiz experience.
- `public/` — public site header and footer.
- `ui/` — shared badges, buttons, cards, forms, miscellaneous UI, and modal.

## `src/lib/`

Shared application logic and service helpers:

- `analytics.ts` — analytics helpers.
- `audit.ts` — admin audit logging.
- `auth.ts` — authentication and authorization.
- `client-api.ts` — client-side API helpers.
- `complaints.ts` — complaint-related logic.
- `constants.ts` — shared constants.
- `content.ts` — site content helpers.
- `db.ts` — database access.
- `email.ts` — email/outbox handling.
- `http.ts` — HTTP helpers.
- `i18n.ts` — internationalization helpers.
- `notifications.ts` — notification helpers.
- `settings.ts` — application settings.
- `utils.ts` — general utilities.
- `validation.ts` — input validation.

## `src/types/`

- `index.ts` — shared TypeScript types.

## npm scripts

- `npm run dev` — start the development server.
- `npm run build` — create a production build.
- `npm run start` — serve the production build.
- `npm run typecheck` — run the TypeScript compiler without emitting files.
- `npm run db:seed` — seed the local database.
- `npm run db:reset` — reset the local database.
