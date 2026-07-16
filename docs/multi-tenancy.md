# Multi-tenancy

Wisdom LMS is a shared-database, multi-tenant application: many schools/orgs
("tenants") live in one Postgres database, each isolated by a `tenantId`
column on every tenant-owned table. This document covers what's live today,
what's deliberately not enabled yet, and the environment variables involved.

## Schema

- **`Tenant`** (`tenants` table): `id`, `name`, `slug` (unique), `primaryDomain`
  (unique, nullable — a tenant's own custom domain), `subdomain` (unique),
  `status` (`ACTIVE | PAUSED | DEACTIVATED`), `brandingJson` (reserved),
  timestamps.
- **`TenantMembership`** (`tenant_memberships` table): `tenantId`, `userId`,
  `role` (`ADMIN | STUDENT`), `status` (`ACTIVE | INVITED | REMOVED`),
  unique on `(tenantId, userId)`. A single `User` (matching one Supabase Auth
  identity) can hold a `TenantMembership` row — with a different role — in
  any number of tenants. `User.role` still exists on the `User` model but is
  deprecated: it's no longer read anywhere; `TenantMembership.role` is the
  only source of truth for access control.
- **Every tenant-owned table** (courses, lessons, chapters, enrollments,
  orders/payments, certificates, quizzes, analytics/gamification tables,
  notifications, email campaigns, discussion/community tables, coupons,
  media, import jobs, audit logs — 57 tables total) has a required
  `tenantId String` column + FK to `Tenant`, with every pre-existing index
  prefixed with `tenantId`.
- **`Settings` and `CommunitySettings`** were previously singleton tables
  keyed on a hardcoded `id = "main"`. Both are now keyed directly on
  `tenantId` as their primary key (one settings row per tenant) — this is how
  branding, the certificate template, Razorpay/Stripe/Resend credentials, and
  analytics thresholds all became tenant-specific with no new tables.
- **`GamificationLevel`, `XpRule`, `AchievementDefinition`** — the
  admin-configurable gamification catalogs — are tenant-owned, so each
  tenant can run its own XP rules/levels/badges.
- **All existing data** was backfilled into one tenant named `WisdomQuant`
  (fixed id `00000000-0000-0000-0000-000000000001`, slug `wisdomquant`), and
  every existing user got a `TenantMembership` row in it mirroring their old
  global `User.role`. No data was deleted or modified beyond adding the new
  column values.

## Migration sequence

Applied in order (`prisma/migrations/`):

1. `20260716050000_add_tenants_and_memberships` — enums, `tenants`,
   `tenant_memberships`, `users.is_super_admin`. No data risk.
2. `20260716050100_add_tenant_id_columns_nullable` — adds `tenant_id` as a
   **nullable** column everywhere (safe against existing rows), rebuilds
   indexes, adds FK constraints.
3. `20260716050200_backfill_default_tenant` — creates the `WisdomQuant`
   tenant, backfills every `tenant_id` to it, backfills
   `tenant_memberships` from `users.role`. Idempotent (safe to re-run).
4. `20260716050300_tenant_id_not_null` — flips every `tenant_id` column to
   `NOT NULL`, and (for `settings`/`community_settings`) drops the old `id`
   primary key in favor of `tenant_id`.
5. `20260716050400_app_db_role_and_rls_scaffold` — creates a `wisdom_lms_app`
   Postgres role (no password set — see below) and RLS policies on every
   tenant table. **The policies are created but RLS is never `ENABLE`d in
   this migration**, so they are inert today.
6. `20260716180000_fix_user_segment_snapshot_tenant_unique` — widens
   `user_segment_snapshots`' unique index from `(user_id, snapshot_date)` to
   `(tenant_id, user_id, snapshot_date)`, fixing the cross-tenant collision
   described in "Learner-segment cross-tenant leak" below. Applied only to
   local staging in this pass — **not yet run against production.**

These have now been validated end-to-end against a local staging database
(see "Staging validation" below) but **not** against the project's real
Supabase database — run them there (`prisma migrate deploy`, or your normal
flow) when ready, following the "Production deployment checklist" below.

## How tenant resolution works

1. `src/proxy.ts` runs on (almost) every request, resolves the tenant from
   the request host via `src/lib/tenant-resolver.ts` — custom `primaryDomain`
   match first, then `<subdomain>.<ROOT_DOMAIN>`, then a local-dev fallback to
   `DEFAULT_TENANT_SLUG`. An unrecognized host gets a 404; a `PAUSED`/
   `DEACTIVATED` tenant gets a 503. The resolved tenant's `id`/`slug` are
   stamped onto `x-tenant-id`/`x-tenant-slug` request headers.
2. `src/lib/tenant-context.ts` reads those headers back out via
   `next/headers` — correctly request-scoped for every page, layout, server
   action, and route handler, since each is its own request that passes
   through proxy.ts. No `AsyncLocalStorage` is needed for this path.
3. **Out-of-band paths** (Razorpay webhooks, cron jobs) have no tenant
   subdomain to resolve from. `src/proxy.ts` explicitly exempts
   `/api/webhooks/*` and `/api/cron/*` from host-based tenant resolution.
   Instead:
   - Razorpay orders are created with `notes.tenantId` stamped on them (see
     `razorpay-actions.ts` and `checkout/actions.ts`).
   - The webhook route (`src/app/api/webhooks/razorpay/route.ts`) reads
     `notes.tenantId` back out, falls back to `DEFAULT_TENANT_SLUG` for
     pre-migration orders that predate this field, and wraps all processing
     in `runWithTenant(tenantId, tenantSlug, fn)` — an explicit
     `AsyncLocalStorage`-backed override that `getTenantId()` checks first.
   - The cron `segment-snapshot` job loops over every `ACTIVE` tenant and
     runs its whole snapshot inside `runWithTenant(tenant.id, tenant.slug, …)`
     (`src/app/api/cron/segment-snapshot/route.ts`). This used to still leak
     cross-tenant data despite the per-tenant loop — see "Learner-segment
     cross-tenant leak: root cause and fix" below — that has since been
     fixed.

## Enforcement: how tenant scoping actually happens

`src/lib/prisma.ts` wraps the base Prisma client in a `$extends()` layer
(`src/lib/tenant-scoping.ts` holds the pure, unit-tested scoping logic). For
every one of the ~57 tenant-owned models, every query/mutation automatically
gets `tenantId` merged into `where` (reads, updates, deletes) or `data`
(creates) — **this is why the ~130 existing call sites across the app didn't
need to be individually edited.** `Settings`/`CommunitySettings` are excluded
from auto-scoping since their primary key already *is* `tenantId`.

Two explicit escape hatches:
- `platformPrisma` — the raw, unscoped client. Used only by the tenant
  resolver itself (which must look up `Tenant` rows before any tenant is
  known) and by the Razorpay webhook route. Never import this into ordinary
  admin/dashboard/public code.
- `runWithTenant(tenantId, tenantSlug, fn)` — explicitly scopes a block of
  code for out-of-band paths (webhooks, cron). This currently only sets the
  `AsyncLocalStorage` override; it does **not** yet issue a `SET LOCAL
  app.tenant_id` on the connection (see the RLS section below for why).

## User provisioning: every entry point creates a TenantMembership

`src/lib/user-provisioning.ts` is the single choke point every user-creation
path (self-registration, checkout/payment buyer creation, admin CSV bulk
import of users, admin CSV bulk import of enrollments) goes through to reach
Supabase Auth + the Prisma `User` row. It previously created the global
`User` row only — a real gap, since `requireUser`/`requireAdmin`
(`src/lib/auth.ts`) gate all access on an ACTIVE `TenantMembership` existing
for the caller's tenant, so any user created without one could never sign
back in to that tenant.

- **`ensureTenantMembership(tx, { tenantId, userId, role })`** — the new
  shared primitive. Upserts-by-check: looks up the `(tenantId, userId)`
  unique row first and no-ops if it already exists, so re-running the same
  import, or attaching a user who already belongs to another tenant, never
  throws on the `@@unique([tenantId, userId])` constraint and never creates a
  duplicate row. `tenantId` must always come from the caller's own
  `getTenantId()` — never from CSV content or any other request payload —
  which is what stops one tenant from attaching users to another.
- **`createUserAccount`** now creates the Prisma `User` row and the
  `TenantMembership` row (role taken from the same `role` param used for the
  legacy `User.role` field) in one `$transaction`, so a newly created account
  is immediately usable in the tenant that created it.
- **`findOrCreateUser`** (checkout/payment flows) now also calls
  `ensureTenantMembership` for the *existing*-user branch, so a returning
  buyer who already has a global account elsewhere still gets attached to
  the tenant they're purchasing from.
- **CSV bulk import of users**
  (`src/app/admin/(dashboard)/users/bulk-import/actions.ts`) previously
  skipped any row whose email matched an existing global `User` entirely —
  no membership, no course/bundle grant, nothing. It now distinguishes:
  - `existsAlready` — a global `User` with this email exists.
  - `alreadyMember` — that user already has a `TenantMembership` in *this*
    tenant.
  Only `alreadyMember` rows are skipped (true duplicates, reported under
  "Skipped"). Rows that `existsAlready` but aren't yet a member get a fresh
  `TenantMembership` with the row's `role`, plus whatever course/bundle
  access the row specifies — the same treatment brand-new rows get. Row-level
  errors (bad email, unknown role, unknown course/bundle, per-file duplicate
  emails) are unchanged and still block that row without touching the
  database.
  - The CSV template/columns are unchanged (`role` already existed and now
    also seeds `TenantMembership.role`, not just the deprecated `User.role`).
- **CSV bulk import of enrollments**
  (`src/app/admin/(dashboard)/enrollments/bulk-import/actions.ts`) had the
  same gap for both new and pre-existing users; it now calls
  `ensureTenantMembership` (role `STUDENT`, since this importer has no role
  column) right after resolving each row's `userId` and before granting
  course/bundle access.
- **Tests**: `src/lib/user-provisioning.test.ts` covers `ensureTenantMembership`
  (create vs. no-op-on-duplicate, tenant-scoped lookup),
  `createUserAccount` (membership created alongside the profile, rollback on
  failure creates no membership), and `findOrCreateUser` (existing user gets
  attached, no duplicate Supabase account). `src/app/admin/(dashboard)/users/
  bulk-import/actions.test.ts` covers new-user creation, existing-user
  membership creation, duplicate-import idempotency, invalid rows, per-tenant
  membership isolation (the same global user imported by two different
  tenants gets independent membership rows), and partial-import failure
  (one row failing doesn't affect others).

## Learner-segment cross-tenant leak: root cause and fix

**Root cause.** `getAllLearnerSegments()` (`src/lib/analytics/learner-segments.ts`)
resolved "which users are learners" via `prisma.user.findMany({ where: { role:
"STUDENT" } })`. `User` is a deliberately global, unscoped model (one Supabase
Auth identity can hold a `TenantMembership` — with a different role — in any
number of tenants), and `User.role` has no per-tenant meaning. So this query
returned **every** STUDENT-role user across **every** tenant, not just the
tenant `runWithTenant()` had scoped the call to. Two concrete symptoms:
tenant A's segment computation included tenant B's learners, and — when a
real user held memberships in two tenants — the second tenant's
`UserSegmentSnapshot` write collided on `@@unique([userId, snapshotDate])`
(no `tenantId` in the constraint), throwing the cron's `$transaction`.

**Fix.**
- New helper module `src/lib/analytics/tenant-learners.ts` —
  `getTenantStudentMemberships()` / `countTenantStudents()` — resolves
  eligible learners exclusively through `TenantMembership` rows
  (`role: "STUDENT", status: "ACTIVE"`) scoped to the ambient tenant via
  `getTenantId()`. `getAllLearnerSegments()` now uses this instead of
  querying `User` at all, and uses `TenantMembership.createdAt` (when the
  user joined *this* tenant) instead of the global `User.createdAt` for
  "days since joined" — a semantic correction as well as a fix, since
  account age should be tenant-relative in a multi-tenant product.
- `UserSegmentSnapshot`'s unique constraint was widened from
  `(userId, snapshotDate)` to `(tenantId, userId, snapshotDate)`
  (`20260716180000_fix_user_segment_snapshot_tenant_unique`), so one snapshot
  row per user *per tenant* per day is legal — matching every other
  tenant-scoped table's uniqueness convention.
- The same `prisma.user.count/findMany({ where: { role: "STUDENT" } })`
  pattern was also present in seven more analytics call sites
  (`overview.ts`, `learners.ts` ×2, `community-analytics.ts` ×2,
  `gamification-analytics.ts` ×2) — every dashboard KPI/count built on it was
  silently all-tenant. All eight now go through `countTenantStudents()` /
  `getTenantStudentMemberships()`.
- The route-by-route audit (Follow-up item 1) also turned up two more leaks
  in the same family, not previously documented:
  - `buildLearnerRows()` (`learners.ts`, backs the admin Learners list/search
    page) queried `prisma.user.findMany({ where: { role: "STUDENT", ...search
    } } )` with no tenant scoping at all — an admin's learner search returned
    **other tenants' learner names and emails** directly in the UI. Fixed by
    pre-filtering to the tenant's own student `userId`s before applying the
    search.
  - `getLearnerProfile(userId)` (backs
    `admin/(dashboard)/analytics/learners/[userId]`) took `userId` from a
    route param and fetched that user's full profile (name, email,
    enrollments, courses) with **no check that they belonged to the active
    tenant** — an IDOR letting a tenant A admin view tenant B's learner PII
    by ID. Fixed by verifying an `ACTIVE` `TenantMembership` for that
    `(tenantId, userId)` pair before returning anything, returning `null`
    (same as "learner not found") otherwise.

**Regression tests.** `src/__tests__/integration/tenant-segment-isolation.integration.test.ts`
reproduces the original failure directly: two tenants, one global user with
independent `TenantMembership` rows (different roles) in each, asserting
`getAllLearnerSegments()` scoped to each tenant returns only that tenant's
eligible learners, and that a full cron run across both tenants produces
exactly one snapshot row per tenant per eligible learner with no
unique-constraint collision. `background-jobs-webhook.integration.test.ts`'s
former `it.fails` for this bug is now a normal passing assertion.

## TenantMembership hardening: safe writes by raw row ID

`TenantMembership` is intentionally excluded from the Prisma
auto-scoping extension (`src/lib/tenant-scoping.ts`) since it's the identity
table itself — there's no single secondary tenant-scoped field the generic
extension could inject the way it does `data.tenantId` on create for every
other tenant-owned model. Every real write path already keyed off the
compound `(tenantId, userId)` unique (`src/lib/auth.ts`,
`src/lib/user-provisioning.ts`, the bulk-import actions) — confirmed by
search, no call site anywhere used a raw membership `id`. But an
`updateMany`/`deleteMany`/`findUnique` filtered only by `{ id }` would
silently bypass tenant scoping entirely, since `TenantMembership` isn't in
`TENANT_SCOPED_MODELS`.

**Fix.** `src/lib/tenant-membership.ts` adds
`findTenantMembershipById` / `updateTenantMembershipById` /
`deleteTenantMembershipById`, each re-deriving `tenantId` from
`getTenantId()` and folding it into the `where` clause
(`{ id, tenantId }`), so a row belonging to another tenant is invisible to
these helpers regardless of whether its `id` is known. The update/delete
variants throw a `TenantMembershipNotFoundError` when zero rows match —
deliberately the same error for "doesn't exist" and "exists in another
tenant," so a caller can't use the error to probe for another tenant's
membership ids. No existing call site needed migration; these exist so any
future by-id path is safe by construction.

**Regression tests.** `users-membership.integration.test.ts`'s former
`it.fails` for this gap is now six passing tests: valid same-tenant
update/delete by id, a cross-tenant update attempt (rejected, row
unchanged), a cross-tenant delete attempt (rejected, row still present), an
unknown membership id (rejected on find/update/delete), and a
multi-tenant-membership user's row correctly resolved only from its own
tenant's scope.

## What's NOT enabled yet (by design)

- **Row-Level Security is not enforced.** The policies exist
  (`20260716050400_app_db_role_and_rls_scaffold`) but `ENABLE ROW LEVEL
  SECURITY` was never run. The app's `DATABASE_URL` still connects as the
  Supabase `postgres` superuser, which has `BYPASSRLS` — enabling RLS today
  would silently enforce nothing. The `wisdom_lms_app` role this migration
  creates has no password (never commit one to a migration file); an
  operator must set one out-of-band (`ALTER ROLE "wisdom_lms_app" WITH
  PASSWORD '...';` via the Supabase SQL editor) and cut `DATABASE_URL` over
  to it in every environment before a follow-up migration turns RLS on.
  Tenant isolation today is enforced entirely at the **application layer**
  (the Prisma extension above) — real, but a second DB-level layer is the
  planned defense-in-depth, not yet active.
- **No super-admin UI.** `User.isSuperAdmin` exists on the schema as the seam
  for a future `/platform` console (tenant CRUD, activate/pause/deactivate,
  assigning tenant admins) but no routes were built this session.
- **Google OAuth is not tenant-specific.** Supabase Auth's OAuth provider
  config is per-Supabase-project, not per-tenant-row — there's no code-level
  fix for this without either sharing one Google app across all tenants or
  building a custom OAuth flow.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `ROOT_DOMAIN` | Platform's own root domain, used to extract `<subdomain>.<ROOT_DOMAIN>` from the request host. | unset (subdomain matching disabled; only custom domains + dev fallback apply) |
| `DEFAULT_TENANT_SLUG` | Tenant slug used for local dev hosts (`localhost`, `127.0.0.1`, `*.local`) and as the Razorpay-webhook fallback for orders with no `notes.tenantId`. | `wisdomquant` |
| `DATABASE_URL` | **Unchanged for now** — still the pooled superuser connection. Will need to point at `wisdom_lms_app` once RLS is turned on (see above). | (existing) |

## Follow-up work (not built this session)

1. ~~**Route-by-route audit** of every `admin/(dashboard)/**`, `dashboard/**`,
   `community/**`, `(public)/**` call site~~ — the `/api/cron/segment-snapshot`
   job's per-tenant loop was already in place; the audit instead found (and
   fixed) the `User.role`-based cross-tenant leaks described in
   "Learner-segment cross-tenant leak" above, across 10 analytics call sites.
   Only `src/lib/analytics/**` and the admin analytics/users read paths were
   covered this pass — `dashboard/**`, `community/**`, and `(public)/**`
   still warrant the same audit (see Known limitations).
2. **Enable RLS for real**: cut `DATABASE_URL` over to `wisdom_lms_app` in
   every environment, then run a migration that `ENABLE`s row level security
   on all 59 tenant tables; verify with an isolation test using a second,
   non-superuser Postgres role.
3. **Super-admin UI**: a `/platform` route group — tenant list/create/
   activate/pause/deactivate, assigning tenant admins (writes
   `TenantMembership`), domain/status view — gated on `User.isSuperAdmin` and
   using the `platformPrisma` unscoped client explicitly.
4. ~~**Exhaustive isolation tests**: cross-tenant data isolation integration
   tests against a real test database~~ — 12 DB-backed integration test
   files now cover courses/bundles, users/memberships (incl. safe by-id
   writes), enrollments/commerce, quizzes, notifications/community,
   analytics/gamification, settings/branding, CSV imports, search/pagination,
   background jobs/webhooks, tenant-context edge cases, and the
   learner-segment leak specifically (54 tests total, see "Tenant-isolation
   test matrix"). Still open: admin-access-restriction tests for every admin
   route group as an end-to-end HTTP flow (today's coverage is data-layer
   isolation, not route-level authorization behavior).
5. **Google OAuth** — decide between one shared Google app across all
   tenants vs. a custom OAuth flow.
6. **Bulk-import UX for the tenant-membership change**: the users bulk-import
   preview/result screens now distinguish "existing account, will join this
   tenant" from "already a member here, skipped" — worth a quick pass to make
   sure that reads clearly to admins in practice, and to add a similar
   distinction to the enrollments bulk-import UI (it silently attaches
   existing-but-not-yet-member users today with no separate UI callout).

## Staging validation

Performed against a local, disposable staging Postgres — **not** the real
Supabase project, which was never touched by anything in this section. This
supersedes the "code-only, nothing applied" state described earlier in this
document: the 5 migrations have now been applied and verified end-to-end,
though only in staging.

### Staging environment

`npx prisma dev` (Prisma's official local Postgres, PGlite-backed) was used
as the staging database — this machine has no Docker/WSL/local Postgres
install, and the only pre-existing `DATABASE_URL` pointed at the real
Supabase project. `prisma dev` is genuine Postgres (not an emulation layer),
runs entirely on `localhost`, and needs no credentials, so it can't reach a
real environment even by mistake. Every script that touches it
(`scripts/staging/*.ts`) loads connection details from a gitignored
`.env.staging.local` and hard-fails if the resolved host isn't
`localhost`/`127.0.0.1`.

One real operational limitation worth recording: this local PGlite server
has much lower concurrent-connection capacity than a real Postgres instance.
Running the full suite (unit + integration together) with vitest's default
parallelism reliably crashed it ("Server has closed the connection") across
many integration files at once. The reliable method for this validation
pass: `npx vitest run src/__tests__/integration --no-file-parallelism`
(integration files only, run one at a time in-process) — this ran cleanly
end-to-end with all 12 files in a single invocation. Running the unit suite
(no `TEST_DATABASE_URL`) and the integration suite (with it) as two separate
`vitest run` invocations also sidesteps an unrelated pre-existing issue: a
handful of unit test files (`auth.test.ts`, `user-provisioning.test.ts`,
`users/bulk-import/actions.test.ts`) call `vi.mock("@/lib/prisma", …)` and
don't export `platformPrisma` from their mock, which trips the global
`afterAll` in `global-teardown.ts` if `TEST_DATABASE_URL` happens to be set
for the whole process while those files also run. This is a property of the
local dev database and the test-invocation split, not of the application —
a real staging Postgres would not have the capacity ceiling, and none of
this affects `npm test` in normal use (no staging DB → every integration
test is skipped, see below).

### Migration execution order (exactly as applied)

1. All 27 pre-tenancy migrations (`20260711181347_init` through
   `20260716044433_phase3_commerce_intelligence`), applied via `prisma
   migrate deploy` — this reproduces the schema state the real Supabase
   database is in today.
2. `scripts/staging/seed-legacy-data.ts` — inserts a representative slice of
   pre-tenant data (raw SQL, since the generated Prisma Client already
   expects the post-migration `tenant_id` columns) across every model family
   migrations 2-4 touch: users, settings/community_settings (old `id='main'`
   singleton shape), courses/chapters/lessons, quizzes/questions/attempts/
   answers, bundles, enrollments/grants/progress, certificates, payments,
   cart/orders/order items/payments, coupons/redemptions, import jobs,
   notifications/campaigns, commerce events, admin audit logs, gamification
   (levels/achievements/profiles/XP/activity), community (categories/
   threads/answers/replies/reactions/follows).
3. `20260716050000_add_tenants_and_memberships`
4. `20260716050100_add_tenant_id_columns_nullable`
5. `20260716050200_backfill_default_tenant`
6. `20260716050300_tenant_id_not_null`
7. `20260716050400_app_db_role_and_rls_scaffold`
8. `scripts/staging/verify-migration.ts` — asserts every check below.
9. `scripts/staging/seed-tenant-fixtures.ts` — creates **Demo Academy** as a
   second real tenant and seeds fresh data into both it and **WisdomQuant**
   (admins, learners, courses, bundles, enrollments, orders, tenant-specific
   settings, notifications, quiz attempts, gamification, discussions), plus
   one global user with independent memberships in both tenants.

All 32 migrations applied cleanly with **zero warnings or errors**.

### Record counts before/after (migrations 3-7)

Every one of the ~60 pre-existing rows across 46 non-empty tables (users,
courses, chapters, lessons, quizzes, quiz_questions, quiz_attempts,
quiz_attempt_answers, course_bundles, bundle_courses, bundle_prices,
enrollments, enrollment_grants, lesson_progress, certificates, payments,
carts, cart_items, orders, order_items, order_payments, coupons,
coupon_redemptions, import_jobs, notifications, notification_recipients,
email_campaigns, email_campaign_recipients, commerce_events,
admin_audit_logs, gamification_levels, xp_rules, achievement_definitions,
user_gamification_profiles, user_activity_events, user_xp_transactions,
user_achievements, user_daily_learning_activity,
user_course_learning_time, user_segment_snapshots, community_categories,
discussion_threads, discussion_answers, discussion_replies,
discussion_reactions, discussion_follows, settings, community_settings)
had an **identical row count before and after** the 5 migrations — confirmed
by `scripts/staging/verify-migration.ts`, which re-sums every table
post-migration for direct comparison against the pre-migration snapshot.
Zero rows were lost or duplicated. (`_prisma_migrations` grew from 27 to 32,
as expected; two new tables, `tenants` and `tenant_memberships`, appeared
with 1 and 3 rows respectively.)

### Migration verification checks (all passed)

- `Tenant`/`TenantMembership` tables exist; the `WisdomQuant` tenant exists
  with its fixed id (`00000000-0000-0000-0000-000000000001`) and `ACTIVE`
  status.
- Every existing user (3) got exactly one `TenantMembership` row in
  WisdomQuant, with `role` correctly mirroring the legacy `User.role`.
- **Every** tenant-owned table (the 57 `TENANT_SCOPED_MODELS`, plus
  `Settings`/`CommunitySettings`/`TenantMembership`, which also carry
  `tenant_id` but are excluded from auto-scoping) has a `tenant_id` column
  and it is `NOT NULL`.
- **Zero** `NULL tenant_id` rows anywhere, in any of those tables.
- **Every** pre-existing row's `tenant_id` equals the WisdomQuant fixed id —
  no row landed in the wrong tenant.
- `Settings` and `CommunitySettings` both converted from the old `id='main'`
  singleton PK to a `tenant_id` PK; the old `id` column was dropped; exactly
  one row remains in each, still keyed to WisdomQuant.
- Foreign keys (spot-checked `courses_tenant_id_fkey`), the
  `tenant_memberships_tenant_id_user_id_key` unique index, and `tenant_id`-
  prefixed indexes (spot-checked `quiz_attempts`, 5 found) all exist as the
  migration SQL defines them.
- `wisdom_lms_app` role exists, `NOBYPASSRLS`, no password (until set
  manually for the restricted-role test below).
- RLS is **not** enabled on any table (confirmed on `courses`) — the 59
  scaffolded policies exist but are inert, exactly as designed.

One numbers note: this task's brief cites "59 tenant-owned tables." Against
the actual current schema, **57** models are in `TENANT_SCOPED_MODELS`
(auto-scoped by the Prisma extension in `src/lib/tenant-scoping.ts`), and
**60** models actually carry a `tenant_id` column (adds `Settings`,
`CommunitySettings`, `TenantMembership` — all three intentionally excluded
from auto-scoping, for the reasons in "Schema" above). The RLS-policy count
(59) matches neither — it covers the 57 scoped models plus
`achievement_definitions`... the point being none of 57/59/60 are
interchangeable; each measures a different thing and none of them is wrong.

### Tenant-isolation test matrix

DB-backed integration tests, `src/__tests__/integration/*.integration.test.ts`
(12 files, 54 tests — real staging Postgres, not mocked Prisma). Skipped
entirely unless `TEST_DATABASE_URL` is explicitly set on the process
environment (never auto-loaded from a file), so `npm test` is unaffected in
any environment without a staging DB.

| Area | File | Result |
|---|---|---|
| Course/bundle CRUD, enumeration, tenant-stamping on create | `courses-bundles` | 7/7 passed |
| User/TenantMembership ops, multi-tenant-membership user, safe by-id helpers | `users-membership` | 8/8 passed |
| Enrollments, cart, orders, payments, coupons | `enrollments-commerce` | 5/5 passed |
| Quiz attempts & results | `quizzes` | 3/3 passed |
| Notifications, email campaigns, community/discussions | `notifications-community` | 3/3 passed |
| Analytics & gamification (XP, levels, achievements, activity) | `analytics-gamification` | 3/3 passed |
| Settings/CommunitySettings branding | `settings-branding` | 4/4 passed |
| CSV import choke point (`ensureTenantMembership`) | `csv-imports` | 3/3 passed |
| Search/filter/pagination/count (export-style queries) | `search-pagination` | 3/3 passed |
| Background jobs (segment-snapshot cron, now leak-free) & Razorpay webhook resolution | `background-jobs-webhook` | 5/5 passed |
| No tenant context, unknown host/tenant, id-tampering matrix | `tenant-context-edge-cases` | 6/6 passed |
| **New:** learner-segment cross-tenant isolation (direct repro of the fixed leak) | `tenant-segment-isolation` | 3/3 passed |

**Total: 54 passed, 0 documented gaps, 0 unexplained failures.** (Previous
pass: 44 passed + 2 documented `it.fails` gaps. Both gaps are now fixed and
their tests convert to normal passing assertions; the 8 net-new tests are
the `tenant-segment-isolation` file (3) plus the expanded
`users-membership` by-id coverage (+5 beyond the 1-test replacement).)

Also re-ran a representative subset (`courses-bundles`,
`enrollments-commerce`, `users-membership`, `tenant-context-edge-cases` —
23 tests) through the restricted `wisdom_lms_app` role instead of the
`postgres` superuser (password set locally only, RLS left disabled per
instructions) — **identical results**, confirming app-layer tenant scoping
does not depend on superuser/`BYPASSRLS` privileges.

## Known limitations

- **RLS is still inert** (unchanged from before this session) — the app
  connects as `postgres`/superuser in every real environment; a second,
  DB-level isolation layer remains future work (see Follow-up item 2 above).
  **Not enabled in this pass either, per instructions.**
- **PGlite/`prisma dev` connection-capacity ceiling** (staging-environment
  limitation, not an app bug) — see "Staging environment" above.
- No super-admin UI, no Google OAuth tenant-specificity — unchanged, see
  "What's NOT enabled yet" above.
- The route-by-route audit (Follow-up item 1) covered every
  `admin/(dashboard)/analytics/**` and `admin/(dashboard)/users/**` read path
  plus every cron/analytics module under `src/lib/analytics/`; it was not
  re-run against `dashboard/**`, `community/**`, or `(public)/**` in this
  pass, so a residual `User.role`-based leak elsewhere in those areas, while
  not found in the modules actually touched, can't be ruled out with the
  same confidence.

### Fixed in this pass (previously listed here as open findings)

- ~~`TenantMembership` id-based writes aren't tenant-scoped~~ — fixed by
  `src/lib/tenant-membership.ts`'s safe by-id helpers; see "TenantMembership
  hardening" above.
- ~~The segment-snapshot cron leaks cross-tenant data~~ — fixed by resolving
  learners via `TenantMembership` and widening `UserSegmentSnapshot`'s
  unique constraint; see "Learner-segment cross-tenant leak" above. Two
  related, previously-undocumented leaks in the same audit (admin Learners
  list search, learner-profile-by-id) were also found and fixed.

## Rollback / restore procedure

All 5 tenant migrations are additive (new tables, new nullable-then-NOT-NULL
columns, a new role, inert policies) — nothing destructive was dropped
except `Settings.id`/`CommunitySettings.id`, which migration 4 replaces with
`tenant_id` as the new PK (same underlying value, `'main'` → the tenant's
uuid, not a data loss).

- **Before running in production**: take a full database backup/snapshot
  (Supabase's point-in-time recovery or a manual `pg_dump`) immediately
  before migration 3 (`add_tenants_and_memberships`) — this is the natural
  rollback point, since migrations 1-2 are low-risk (additive nullable
  column) and migrations 3-5 are what actually change data shape.
- **If migration 3 (backfill) or 4 (NOT NULL) needs to be rolled back**:
  restore from that snapshot. There is no forward-compatible partial
  rollback (e.g. re-nulling `tenant_id` and dropping the `tenants` table)
  that's safe to script generically — restoring from backup is the
  supported path, consistent with this being additive-only, backup-gated
  change.
- **If only migration 5 (`app_db_role_and_rls_scaffold`) needs reverting**:
  safe to hand-write a down-migration that `DROP POLICY`s and `DROP ROLE
  wisdom_lms_app` — RLS was never enabled, so there's no data-access change
  to undo, only schema cleanup.
- **Local staging teardown**: `npx prisma dev rm wisdom-lms-staging`
  deletes the local database entirely; nothing here ever touched the real
  Supabase project, so no cloud-side rollback is needed for anything in this
  section.

## Production deployment checklist

- [x] ~~Run the 5 migrations against a database and verify them~~ — done
  against local staging, see "Staging validation" above. **Not yet run
  against the real Supabase database.**
- [x] ~~Fix the segment-snapshot cross-tenant leak~~ — done this pass, plus
  the two related learner-list/profile leaks found in the same audit. See
  "Learner-segment cross-tenant leak: root cause and fix" above. Migration
  6 (`20260716180000_fix_user_segment_snapshot_tenant_unique`) applied to
  local staging only.
- [x] ~~Harden `TenantMembership` writes by raw row id~~ — done this pass.
  See "TenantMembership hardening" above.
- [ ] Take a full backup/snapshot of the production Supabase database
  immediately before applying migration 3.
- [ ] Run `prisma migrate deploy` against production during a maintenance
  window (or low-traffic period), including migration 6 from this pass —
  expect it to complete in well under a minute based on staging timings, but
  production's actual row counts will determine the real duration of
  migrations 2-4 (they rewrite every row).
- [ ] Re-run `scripts/staging/verify-migration.ts`-equivalent checks against
  the real database's actual `DATABASE_URL`/`DIRECT_URL` immediately after
  migrating (the script itself is staging-only per its `env.ts` guard —
  treat it as a checklist to re-verify manually, not a script to run as-is
  against prod).
- [ ] Confirm application behavior against production data: spot-check a
  few real users' `TenantMembership` rows and a few `Settings`/
  `CommunitySettings` rows post-migration.
- [ ] Decide on and schedule RLS enablement (Follow-up item 2 above) — set a
  password on `wisdom_lms_app`, cut `DATABASE_URL` over in every
  environment, then run a follow-up `ENABLE ROW LEVEL SECURITY` migration.
  Confirmed in a previous session: the app-layer scoping extension works
  identically under the restricted role, so this cutover is a credential/
  config change, not a code change. **Still not enabled — out of scope for
  this pass per instructions.**
- [x] Full validation re-run this pass: `npx prisma generate`,
  `npx tsc --noEmit` (clean), `npm test` (unit suite, no `TEST_DATABASE_URL`:
  95 passed / 54 skipped), `npx vitest run src/__tests__/integration
  --no-file-parallelism` with `TEST_DATABASE_URL` set (12 files, 54 passed,
  0 failed), `npm run lint` (0 errors, 13 pre-existing warnings untouched).
- [x] Build: `npm run build` fails in place on this project's `F:` drive
  with `EISDIR: illegal operation on a directory, readlink
  '...\src\app\favicon.ico'` — a filesystem quirk of that drive, unrelated
  to any code change. Re-confirmed clean (`exit 0`, full route manifest
  printed, no errors) building from a copy on `C:\` this pass; CI/production
  build environments are unaffected (they don't run on this machine's `F:`
  drive).
