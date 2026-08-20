// Verifies the 5 staging test Auth accounts created by
// create-staging-auth-users.ts: each can sign in, the returned Auth user id
// matches the expected Prisma User.id, and TenantMembership rows match what
// seed-tenant-fixtures.ts seeded. Reads passwords from the gitignored
// .env.staging-test-accounts.local — never hardcoded, never logged.
import "./env";
import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { WISDOMQUANT_TENANT_ID, DEMO_ACADEMY_TENANT_ID } from "./seed-tenant-fixtures";

const CREDENTIALS_PATH = path.resolve(__dirname, "../../.env.staging-test-accounts.local");
dotenv.config({ path: CREDENTIALS_PATH });

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  const status = ok ? "PASS" : "FAIL";
  if (!ok) failures++;
  console.log(`[${status}] ${label}${detail ? " — " + detail : ""}`);
}

function tenantLabel(tenantId: string): string {
  if (tenantId === WISDOMQUANT_TENANT_ID) return "WisdomQuant";
  if (tenantId === DEMO_ACADEMY_TENANT_ID) return "Demo Academy";
  return tenantId;
}

const TARGET_ACCOUNTS = [
  { key: "STAGING_WISDOMQUANT_ADMIN", label: "WisdomQuant admin", email: "wisdomquant-fixture-admin@example.test", expectedMemberships: [{ tenant: WISDOMQUANT_TENANT_ID, role: "ADMIN" }] },
  { key: "STAGING_WISDOMQUANT_LEARNER", label: "WisdomQuant learner", email: "wisdomquant-fixture-learner@example.test", expectedMemberships: [{ tenant: WISDOMQUANT_TENANT_ID, role: "STUDENT" }] },
  { key: "STAGING_DEMOACADEMY_ADMIN", label: "Demo Academy admin", email: "demoacademy-admin@example.test", expectedMemberships: [{ tenant: DEMO_ACADEMY_TENANT_ID, role: "ADMIN" }] },
  { key: "STAGING_DEMOACADEMY_LEARNER", label: "Demo Academy learner", email: "demoacademy-learner@example.test", expectedMemberships: [{ tenant: DEMO_ACADEMY_TENANT_ID, role: "STUDENT" }] },
  {
    key: "STAGING_CROSS_TENANT",
    label: "Cross-tenant user",
    email: "cross-tenant-user@example.test",
    expectedMemberships: [
      { tenant: WISDOMQUANT_TENANT_ID, role: "STUDENT" },
      { tenant: DEMO_ACADEMY_TENANT_ID, role: "ADMIN" },
    ],
  },
] as const;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  for (const target of TARGET_ACCOUNTS) {
    console.log(`\n=== ${target.label} (${target.email}) ===`);

    const password = process.env[`${target.key}_PASSWORD`];
    if (!password) {
      check(`${target.label}: password available`, false, `No ${target.key}_PASSWORD in ${CREDENTIALS_PATH}`);
      continue;
    }

    const expectedUser = await db.user.findUnique({ where: { email: target.email } });
    check(`${target.label}: fixture User row exists`, !!expectedUser);
    if (!expectedUser) continue;

    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
      email: target.email,
      password,
    });
    check(`${target.label}: sign-in succeeds`, !signInErr && !!signInData.user, signInErr?.message);
    if (signInErr || !signInData.user) continue;

    check(
      `${target.label}: Auth user id matches Prisma User.id`,
      signInData.user.id === expectedUser.id,
      `auth=${signInData.user.id} db=${expectedUser.id}`,
    );

    const memberships = await db.tenantMembership.findMany({
      where: { userId: expectedUser.id },
      select: { tenantId: true, role: true },
    });
    const actual = memberships.map((m) => `${tenantLabel(m.tenantId)}:${m.role}`).sort();
    const expected = target.expectedMemberships.map((m) => `${tenantLabel(m.tenant)}:${m.role}`).sort();
    check(
      `${target.label}: TenantMembership set matches expected`,
      JSON.stringify(actual) === JSON.stringify(expected),
      `actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`,
    );

    await client.auth.signOut();
  }

  await db.$disconnect();
  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect().catch(() => {});
  process.exit(1);
});
