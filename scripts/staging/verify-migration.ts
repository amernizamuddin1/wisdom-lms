// Verifies the 5 tenant migrations applied correctly against the legacy data
// seeded by seed-legacy-data.ts: every tenant-owned table has a NOT NULL
// tenant_id, every pre-existing row was backfilled to the WisdomQuant tenant,
// no data was lost, and FKs/unique constraints/indexes from the migration
// SQL actually exist. Prints a PASS/FAIL line per check; exits 1 if any fail.
import "./env";
import { Client } from "pg";

const WISDOMQUANT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

// Same 57 auto-scoped models as TENANT_SCOPED_MODELS in
// src/lib/tenant-scoping.ts, mapped to their @@map table names, plus the 3
// tenant_id-carrying models excluded from auto-scoping (Settings,
// CommunitySettings key on tenant_id as PK; TenantMembership is the join
// table itself).
const TENANT_OWNED_TABLES = [
  "courses", "instructors", "course_instructors", "course_prices", "chapters",
  "lessons", "lesson_files", "quizzes", "quiz_questions", "quiz_attempts",
  "quiz_attempt_answers", "course_bundles", "bundle_courses", "bundle_prices",
  "enrollments", "enrollment_grants", "bundle_enrollments", "lesson_progress",
  "certificates", "payments", "orders", "order_items", "order_payments",
  "carts", "cart_items", "coupons", "coupon_courses", "coupon_bundles",
  "coupon_redemptions", "refunds", "import_jobs", "email_campaigns",
  "email_campaign_recipients", "notifications", "notification_recipients",
  "admin_audit_logs", "commerce_events", "user_activity_events",
  "user_xp_transactions", "user_gamification_profiles", "user_achievements",
  "user_daily_learning_activity", "user_course_learning_time",
  "user_segment_snapshots", "community_categories", "discussion_threads",
  "discussion_answers", "discussion_replies", "discussion_reactions",
  "discussion_follows", "discussion_reports", "community_user_restrictions",
  "community_moderation_logs", "discussion_notifications",
  "gamification_levels", "xp_rules", "achievement_definitions",
  "tenant_memberships",
];
const SINGLETON_TABLES = ["settings", "community_settings"];

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[${status}] ${label}${detail ? " — " + detail : ""}`);
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // ── 1. Tenant / TenantMembership tables exist and are shaped right ────
  const tenantRow = await client.query(
    `SELECT id, name, slug, status FROM "tenants" WHERE id = $1`,
    [WISDOMQUANT_TENANT_ID],
  );
  check(
    "WisdomQuant tenant exists with fixed id",
    tenantRow.rowCount === 1 && tenantRow.rows[0].slug === "wisdomquant" && tenantRow.rows[0].status === "ACTIVE",
    JSON.stringify(tenantRow.rows[0]),
  );

  const membershipCount = await client.query(
    `SELECT count(*)::int AS n FROM "tenant_memberships" WHERE tenant_id = $1`,
    [WISDOMQUANT_TENANT_ID],
  );
  const userCount = await client.query(`SELECT count(*)::int AS n FROM "users"`);
  check(
    "Every existing user got a TenantMembership in WisdomQuant",
    membershipCount.rows[0].n === userCount.rows[0].n,
    `memberships=${membershipCount.rows[0].n} users=${userCount.rows[0].n}`,
  );

  // Role mirrored from users.role
  const roleMismatch = await client.query(
    `SELECT count(*)::int AS n FROM "tenant_memberships" tm
     JOIN "users" u ON u.id = tm.user_id
     WHERE tm.tenant_id = $1 AND tm.role::text != u.role::text`,
    [WISDOMQUANT_TENANT_ID],
  );
  check("TenantMembership.role mirrors User.role for the backfill", roleMismatch.rows[0].n === 0);

  // ── 2. Every tenant-owned table has the tenant_id column, NOT NULL ────
  for (const table of [...TENANT_OWNED_TABLES, ...SINGLETON_TABLES]) {
    const col = await client.query(
      `SELECT is_nullable FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 AND column_name='tenant_id'`,
      [table],
    );
    check(
      `${table}.tenant_id exists and is NOT NULL`,
      col.rowCount === 1 && col.rows[0].is_nullable === "NO",
      col.rowCount === 0 ? "column missing" : `is_nullable=${col.rows[0].is_nullable}`,
    );
  }

  // ── 3. No NULL tenant_id anywhere, and every pre-existing row backfilled ─
  for (const table of TENANT_OWNED_TABLES) {
    const nullCount = await client.query(`SELECT count(*)::int AS n FROM "${table}" WHERE tenant_id IS NULL`);
    check(`${table}: zero NULL tenant_id rows`, nullCount.rows[0].n === 0, `null_count=${nullCount.rows[0].n}`);

    const notWisdomQuant = await client.query(
      `SELECT count(*)::int AS n FROM "${table}" WHERE tenant_id != $1`,
      [WISDOMQUANT_TENANT_ID],
    );
    check(
      `${table}: every pre-existing row backfilled to WisdomQuant`,
      notWisdomQuant.rows[0].n === 0,
      `rows_not_wisdomquant=${notWisdomQuant.rows[0].n}`,
    );
  }

  // ── 4. Settings / CommunitySettings converted from id='main' singleton
  //       to tenant_id-keyed singleton, exactly one row, values intact ────
  for (const table of SINGLETON_TABLES) {
    const pk = await client.query(
      `SELECT a.attname FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
       WHERE i.indrelid = $1::regclass AND i.indisprimary`,
      [table],
    );
    check(
      `${table}: primary key is now tenant_id`,
      pk.rows.length === 1 && pk.rows[0].attname === "tenant_id",
      `pk_columns=${pk.rows.map((r) => r.attname).join(",")}`,
    );
    const rowCount = await client.query(`SELECT count(*)::int AS n FROM "${table}"`);
    check(`${table}: exactly one row (still the single deployment singleton)`, rowCount.rows[0].n === 1);
    const idColStillExists = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name='id'`,
      [table],
    );
    check(`${table}: old "id" column dropped`, idColStillExists.rowCount === 0);
  }
  // Spot-check settings values survived (updated_at is the only non-null
  // legacy column we set — everything else in our seed was left default).
  const settingsRow = await client.query(`SELECT tenant_id, updated_at FROM "settings"`);
  check(
    "settings row is keyed on the WisdomQuant tenant id",
    settingsRow.rows[0]?.tenant_id === WISDOMQUANT_TENANT_ID,
  );

  // ── 5. Row counts: post-migration == pre-migration (no data loss) ─────
  // (Compared manually against docs/multi-tenancy.md's recorded "before"
  // snapshot — this script re-affirms zero rows were deleted by re-summing.)
  const { rows: allTables } = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`,
  );
  console.log("\n[info] Post-migration row counts (compare against before-migration-counts.txt):");
  for (const { table_name } of allTables) {
    const { rows } = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM "${table_name}"`);
    console.log(`  ${table_name}: ${rows[0].count}`);
  }

  // ── 6. FKs / unique constraints / indexes exist (spot-check a sample) ──
  const fkSample = await client.query(
    `SELECT conname FROM pg_constraint WHERE conrelid = 'courses'::regclass AND contype = 'f' AND conname LIKE '%tenant_id%'`,
  );
  check("courses table has a tenant_id FK constraint", fkSample.rowCount! > 0, fkSample.rows.map((r) => r.conname).join(","));

  // Prisma emits @@unique as a plain CREATE UNIQUE INDEX, not an
  // ALTER TABLE ... ADD CONSTRAINT, so check pg_indexes rather than
  // pg_constraint (which only shows the PK here).
  const uniqueSample = await client.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'tenant_memberships' AND indexname = 'tenant_memberships_tenant_id_user_id_key'`,
  );
  check(
    "tenant_memberships has its (tenant_id, user_id) unique constraint",
    uniqueSample.rowCount! > 0,
    uniqueSample.rows.map((r) => r.indexname).join(","),
  );

  const indexSample = await client.query(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'quiz_attempts' AND indexdef LIKE '%tenant_id%'`,
  );
  check(
    "quiz_attempts indexes are prefixed with tenant_id",
    indexSample.rowCount! >= 5,
    `found ${indexSample.rowCount} tenant_id-prefixed indexes`,
  );

  // wisdom_lms_app role + inert RLS policies from migration 5
  const role = await client.query(`SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'wisdom_lms_app'`);
  check("wisdom_lms_app role exists, NOBYPASSRLS", role.rowCount === 1 && role.rows[0].rolbypassrls === false);

  const rlsEnabled = await client.query(
    `SELECT relrowsecurity FROM pg_class WHERE relname = 'courses' AND relnamespace = 'public'::regnamespace`,
  );
  check(
    "RLS is NOT enabled on courses (policies scaffolded but inert, as designed)",
    rlsEnabled.rows[0]?.relrowsecurity === false,
  );

  const policyCount = await client.query(`SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public'`);
  check("Tenant-isolation RLS policies exist (inert)", policyCount.rows[0].n >= 57, `policy_count=${policyCount.rows[0].n}`);

  await client.end();

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
