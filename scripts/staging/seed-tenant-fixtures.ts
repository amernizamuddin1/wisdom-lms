// Seeds two real, fully-migrated tenants for isolation testing:
//   - WisdomQuant (the existing backfilled tenant, fixed id) gets fresh data
//     on top of the legacy backfilled rows.
//   - Demo Academy is created as a brand-new second tenant.
// Also seeds one global user who is a member of BOTH tenants (different
// roles), covering the multi-tenant-membership case.
//
// Uses the raw, unscoped client from ./db.ts for most rows — safe here
// because every create below stamps tenantId explicitly, unlike ordinary app
// code which must always go through the auto-scoped `prisma` export in
// src/lib/prisma.ts instead. The one exception is the gamification award
// engine (evaluateAchievements): that logic must not be duplicated with raw
// inserts, so it's invoked for real, scoped via runWithTenantContext, after
// the raw QuizAttempt/XP rows it depends on are created.
//
// Run with: npx tsx --conditions=react-server scripts/staging/seed-tenant-fixtures.ts
// (the --conditions flag is required because this script, via @/lib/prisma,
// now transitively imports "server-only", which throws unless resolved
// through its react-server export condition — see docs/multi-tenancy.md.)
import { db } from "./db";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { runWithTenantContext } from "@/lib/tenant-context";
import { evaluateAchievements } from "@/lib/gamification/achievements";

export const WISDOMQUANT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEMO_ACADEMY_TENANT_ID = "00000000-0000-0000-0000-000000000002";
export const CROSS_TENANT_USER_ID = "00000000-0000-0000-0000-00000000cafe";

type TenantFixtureIds = {
  admin: string;
  learner: string;
  course1: string;
  course2: string;
  bundle: string;
  enrollment: string;
  order: string;
  notification: string;
  quiz: string;
  quizAttempt: string;
  category: string;
  thread: string;
};

async function seedTenant(tenantId: string, name: string, slug: string): Promise<TenantFixtureIds> {
  const ids: TenantFixtureIds = {
    admin: randomUUID(),
    learner: randomUUID(),
    course1: randomUUID(),
    course2: randomUUID(),
    bundle: randomUUID(),
    enrollment: randomUUID(),
    order: randomUUID(),
    notification: randomUUID(),
    quiz: randomUUID(),
    quizAttempt: randomUUID(),
    category: randomUUID(),
    thread: randomUUID(),
  };

  await db.user.create({
    data: {
      id: ids.admin,
      name: `${name} Admin`,
      email: `${slug}-admin@example.test`,
      role: "ADMIN",
      tenantMemberships: { create: { tenantId, role: "ADMIN", status: "ACTIVE" } },
    },
  });
  await db.user.create({
    data: {
      id: ids.learner,
      name: `${name} Learner`,
      email: `${slug}-learner@example.test`,
      role: "STUDENT",
      tenantMemberships: { create: { tenantId, role: "STUDENT", status: "ACTIVE" } },
    },
  });

  await db.course.create({
    data: {
      id: ids.course1,
      tenantId,
      title: `${name} Course One`,
      status: "PUBLISHED",
      createdById: ids.admin,
      prices: { create: { tenantId, currency: "INR", amount: "1499.00" } },
    },
  });
  await db.course.create({
    data: { id: ids.course2, tenantId, title: `${name} Course Two`, status: "PUBLISHED", createdById: ids.admin },
  });

  await db.courseBundle.create({
    data: {
      id: ids.bundle,
      tenantId,
      name: `${name} Bundle`,
      slug: `${slug}-bundle`,
      status: "ACTIVE",
      createdById: ids.admin,
      courses: { create: { tenantId, courseId: ids.course2 } },
      prices: { create: { tenantId, currency: "INR", amount: "2499.00" } },
    },
  });

  await db.enrollment.create({
    data: { id: ids.enrollment, tenantId, userId: ids.learner, courseId: ids.course1, source: "DIRECT" },
  });

  await db.order.create({
    data: {
      id: ids.order,
      tenantId,
      orderNumber: `${slug.toUpperCase()}-ORD-0001`,
      userId: ids.learner,
      status: "PAID",
      currency: "INR",
      subtotal: "1499.00",
      totalAmount: "1499.00",
      paymentMethod: "RAZORPAY",
      paidAt: new Date(),
      items: {
        create: {
          tenantId,
          itemType: "COURSE",
          courseId: ids.course1,
          titleSnapshot: `${name} Course One`,
          originalPrice: "1499.00",
          finalPrice: "1499.00",
        },
      },
      payment: { create: { tenantId, gateway: "RAZORPAY", status: "COMPLETED" } },
    },
  });

  // Tenant-specific Settings/CommunitySettings — WisdomQuant's already exist
  // (created by the backfill migration), Demo Academy's don't yet.
  await db.settings.upsert({
    where: { tenantId },
    create: { tenantId, platformName: name, primaryColor: tenantId === DEMO_ACADEMY_TENANT_ID ? "#7c3aed" : "#0ea5e9" },
    update: { platformName: name },
  });
  await db.communitySettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });

  await db.notification.create({
    data: {
      id: ids.notification,
      tenantId,
      internalName: `${slug}-welcome`,
      title: `Welcome to ${name}`,
      richContent: "<p>Hello</p>",
      audienceType: "ALL_USERS",
      status: "PUBLISHED",
      createdById: ids.admin,
      recipients: { create: { tenantId, userId: ids.learner } },
    },
  });

  await db.quiz.create({
    data: {
      id: ids.quiz,
      tenantId,
      courseId: ids.course1,
      title: `${name} Quiz`,
      passPercentage: 70,
      questions: {
        create: {
          tenantId,
          questionText: "1+1=?",
          questionType: "SINGLE_CHOICE",
          optionsJson: ["1", "2", "3"],
          correctOptionsJson: ["2"],
          order: 1,
        },
      },
    },
  });
  await db.quizAttempt.create({
    data: { id: ids.quizAttempt, tenantId, userId: ids.learner, quizId: ids.quiz, score: 100, passed: true },
  });

  await db.userGamificationProfile.upsert({
    where: { userId: ids.learner },
    create: { tenantId, userId: ids.learner, totalXp: 50, currentStreak: 2, longestStreak: 2 },
    update: {},
  });
  await db.userXpTransaction.create({
    data: { tenantId, userId: ids.learner, amount: 50, reason: "Quiz passed" },
  });

  // The raw `db` client above intentionally bypasses recordQuizAttempt() (the
  // real quiz-submission pipeline), so nothing has ever called
  // evaluateAchievements() for this learner. Without this, the four quiz
  // badges satisfied by the QuizAttempt just created (first-quiz,
  // perfect-score, high-achiever, first-attempt-ace) would compute 100%
  // progress on the Achievements page forever while staying unearned/
  // grayscale, since nothing else in this fixture ever re-triggers a
  // QUIZ_* evaluation. Route through the real award engine so seeded data
  // converges to the same state real usage would produce.
  await runWithTenantContext({ tenantId, tenantSlug: slug }, () =>
    prisma.$transaction((tx) =>
      evaluateAchievements(tx, {
        userId: ids.learner,
        relevantKinds: ["QUIZ_PASS_COUNT", "QUIZ_PERFECT_COUNT", "QUIZ_HIGH_SCORE_COUNT", "QUIZ_FIRST_ATTEMPT_HIGH"],
        quizId: ids.quiz,
      }),
    ),
  );

  await db.communityCategory.create({
    data: { id: ids.category, tenantId, name: "General", slug: `${slug}-general`, createdById: ids.admin },
  });
  await db.discussionThread.create({
    data: {
      id: ids.thread,
      tenantId,
      authorId: ids.learner,
      categoryId: ids.category,
      title: `${name} thread`,
      bodyHtml: "<p>Hi</p>",
      threadType: "DISCUSSION",
    },
  });

  return ids;
}

async function main() {
  // WisdomQuant already exists (fixed id from the backfill migration).
  const wisdomQuant = await db.tenant.findUniqueOrThrow({ where: { id: WISDOMQUANT_TENANT_ID } });
  console.log(`[staging] WisdomQuant tenant confirmed: ${wisdomQuant.slug}`);

  const demoAcademy = await db.tenant.upsert({
    where: { id: DEMO_ACADEMY_TENANT_ID },
    create: {
      id: DEMO_ACADEMY_TENANT_ID,
      name: "Demo Academy",
      slug: "demo-academy",
      subdomain: "demo-academy",
      status: "ACTIVE",
    },
    update: {},
  });
  console.log(`[staging] Demo Academy tenant created: ${demoAcademy.slug}`);

  const wq = await seedTenant(WISDOMQUANT_TENANT_ID, "WisdomQuant", "wisdomquant-fixture");
  const da = await seedTenant(DEMO_ACADEMY_TENANT_ID, "Demo Academy", "demoacademy");

  // Global user who is a member of both tenants, with different roles.
  await db.user.create({
    data: {
      id: CROSS_TENANT_USER_ID,
      name: "Cross Tenant User",
      email: "cross-tenant-user@example.test",
      role: "STUDENT",
      tenantMemberships: {
        create: [
          { tenantId: WISDOMQUANT_TENANT_ID, role: "STUDENT", status: "ACTIVE" },
          { tenantId: DEMO_ACADEMY_TENANT_ID, role: "ADMIN", status: "ACTIVE" },
        ],
      },
    },
  });

  console.log("[staging] Tenant fixtures seeded.");
  console.log("WisdomQuant fixture ids:", wq);
  console.log("Demo Academy fixture ids:", da);
  console.log("Cross-tenant user id:", CROSS_TENANT_USER_ID);

  await db.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
