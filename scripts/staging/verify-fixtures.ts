// One-off verification script for Step 4.2: checks post-seed counts and
// ownership invariants. Not part of the permanent staging script suite —
// read-only, safe to delete after use.
import "./env";
import { Client } from "pg";
import {
  WISDOMQUANT_TENANT_ID,
  DEMO_ACADEMY_TENANT_ID,
  CROSS_TENANT_USER_ID,
} from "./seed-tenant-fixtures";

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[${status}] ${label}${detail ? " — " + detail : ""}`);
}

async function count(client: Client, table: string, where = ""): Promise<number> {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM "${table}" ${where}`);
  return rows[0].n;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log("\n=== Top-level counts ===");
  const tenants = await count(client, "tenants");
  const users = await count(client, "users");
  const memberships = await count(client, "tenant_memberships");
  const courses = await count(client, "courses");
  const bundles = await count(client, "course_bundles");
  const enrollments = await count(client, "enrollments");
  const orders = await count(client, "orders");
  const payments = await count(client, "order_payments");
  const settings = await count(client, "settings");
  const communitySettings = await count(client, "community_settings");
  const notifications = await count(client, "notifications");
  const quizzes = await count(client, "quizzes");
  const quizAttempts = await count(client, "quiz_attempts");
  const xpTx = await count(client, "user_xp_transactions");
  const gamProfiles = await count(client, "user_gamification_profiles");
  const categories = await count(client, "community_categories");
  const threads = await count(client, "discussion_threads");

  console.log(`tenants=${tenants} users=${users} tenant_memberships=${memberships}`);
  console.log(`courses=${courses} bundles=${bundles} enrollments=${enrollments}`);
  console.log(`orders=${orders} order_payments=${payments}`);
  console.log(`settings=${settings} community_settings=${communitySettings}`);
  console.log(`notifications=${notifications} quizzes=${quizzes} quiz_attempts=${quizAttempts}`);
  console.log(`user_xp_transactions=${xpTx} user_gamification_profiles=${gamProfiles}`);
  console.log(`community_categories=${categories} discussion_threads=${threads}`);

  console.log("\n=== Per-tenant breakdown ===");
  for (const [name, id] of [
    ["WisdomQuant", WISDOMQUANT_TENANT_ID],
    ["Demo Academy", DEMO_ACADEMY_TENANT_ID],
  ] as const) {
    const tCourses = await count(client, "courses", `WHERE tenant_id = '${id}'`);
    const tMemberships = await count(client, "tenant_memberships", `WHERE tenant_id = '${id}'`);
    const tEnrollments = await count(client, "enrollments", `WHERE tenant_id = '${id}'`);
    const tOrders = await count(client, "orders", `WHERE tenant_id = '${id}'`);
    console.log(`${name}: courses=${tCourses} memberships=${tMemberships} enrollments=${tEnrollments} orders=${tOrders}`);
    check(`${name} has >=2 courses`, tCourses >= 2);
    check(`${name} has >=3 memberships (admin+learner+cross-tenant)`, tMemberships >= 3);
  }

  console.log("\n=== Ownership: non-null tenant_id on tenant-owned tables ===");
  const TENANT_OWNED_TABLES = [
    "courses", "course_bundles", "bundle_courses", "bundle_prices", "course_prices",
    "enrollments", "orders", "order_items", "order_payments", "notifications",
    "notification_recipients", "quizzes", "quiz_questions", "quiz_attempts",
    "user_xp_transactions", "user_gamification_profiles", "community_categories",
    "discussion_threads", "tenant_memberships", "settings", "community_settings",
  ];
  for (const table of TENANT_OWNED_TABLES) {
    const nullCount = await count(client, table, "WHERE tenant_id IS NULL");
    check(`${table}: zero NULL tenant_id rows`, nullCount === 0, `null_count=${nullCount}`);
  }

  console.log("\n=== Cross-tenant shared user ===");
  const crossUser = await client.query(`SELECT id, email FROM "users" WHERE id = $1`, [CROSS_TENANT_USER_ID]);
  check("Cross-tenant user exists", crossUser.rowCount === 1);

  const crossMemberships = await client.query(
    `SELECT tenant_id, role FROM "tenant_memberships" WHERE user_id = $1 ORDER BY tenant_id`,
    [CROSS_TENANT_USER_ID],
  );
  check(
    "Cross-tenant user has exactly 2 memberships (one per tenant)",
    crossMemberships.rowCount === 2,
    JSON.stringify(crossMemberships.rows),
  );
  const membershipTenantIds = crossMemberships.rows.map((r) => r.tenant_id).sort();
  check(
    "Cross-tenant user memberships cover WisdomQuant + Demo Academy",
    JSON.stringify(membershipTenantIds) === JSON.stringify([DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID].sort()),
  );

  await client.end();
  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
