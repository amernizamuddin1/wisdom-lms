import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

// Regression coverage for the "0 of 30 earned despite 1 of 1 progress" bug:
// data written directly (bypassing recordQuizAttempt) must still converge to
// a correct earned/progress state once evaluateAchievements() is run against
// it, that run must be idempotent, and it must never cross tenant lines.
describe.skipIf(!hasStagingDb)("Achievement award engine — evaluateAchievements()", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let admin: string, learner: string, course: string, quiz: string, attempt: string;
  let perfectScoreBadge: string, quizMasterBadge: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();

    admin = (
      await platformPrisma.user.create({ data: { name: "Admin", email: `aw-admin-${s}@test.local`, role: "ADMIN" } })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: admin } }));

    learner = (
      await platformPrisma.user.create({ data: { name: "Learner", email: `aw-learner-${s}@test.local`, role: "STUDENT" } })
    ).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learner } }));

    course = (
      await platformPrisma.course.create({ data: { tenantId: WISDOMQUANT_TENANT_ID, title: `AW Course ${s}`, createdById: admin } })
    ).id;
    cleanup.track(() => platformPrisma.course.delete({ where: { id: course } }));

    quiz = (
      await platformPrisma.quiz.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, courseId: course, title: `AW Quiz ${s}`, passPercentage: 70 },
      })
    ).id;
    cleanup.track(() => platformPrisma.quiz.delete({ where: { id: quiz } }));

    // Written directly, the same way scripts/staging/seed-tenant-fixtures.ts
    // used to (bypassing recordQuizAttempt) — the exact shape that produced
    // the bug: a QuizAttempt satisfying badge criteria with no corresponding
    // UserAchievement row and nothing left to ever trigger one.
    attempt = (
      await platformPrisma.quizAttempt.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learner, quizId: quiz, score: 100, passed: true },
      })
    ).id;
    cleanup.track(() => platformPrisma.quizAttempt.delete({ where: { id: attempt } }));

    // A badge whose criteria this single attempt satisfies (QUIZ_PERFECT_COUNT >= 1).
    perfectScoreBadge = `aw-perfect-${s}`;
    await platformPrisma.achievementDefinition.create({
      data: {
        id: perfectScoreBadge,
        tenantId: WISDOMQUANT_TENANT_ID,
        name: "AW Perfect Score",
        description: "test",
        category: "MASTERY",
        unlockCriteriaJson: { kind: "QUIZ_PERFECT_COUNT", threshold: 1 },
        assetPath: "/x.svg",
      },
    });
    cleanup.track(() => platformPrisma.achievementDefinition.delete({ where: { id: perfectScoreBadge } }));

    // A badge whose criteria this single attempt does NOT satisfy (needs 5 passes, only 1 exists).
    quizMasterBadge = `aw-quizmaster-${s}`;
    await platformPrisma.achievementDefinition.create({
      data: {
        id: quizMasterBadge,
        tenantId: WISDOMQUANT_TENANT_ID,
        name: "AW Quiz Master",
        description: "test",
        category: "MASTERY",
        unlockCriteriaJson: { kind: "QUIZ_PASS_COUNT", threshold: 5 },
        assetPath: "/x.svg",
      },
    });
    cleanup.track(() => platformPrisma.achievementDefinition.delete({ where: { id: quizMasterBadge } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("awards a UserAchievement row when quiz criteria are already met", async () => {
    const unlocked = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async ({ prisma }) => {
      const { evaluateAchievements } = await import("@/lib/gamification/achievements");
      return prisma.$transaction((tx) =>
        evaluateAchievements(tx, {
          userId: learner,
          relevantKinds: ["QUIZ_PASS_COUNT", "QUIZ_PERFECT_COUNT"],
          quizId: quiz,
        }),
      );
    });
    expect(unlocked.map((a) => a.id)).toContain(perfectScoreBadge);

    const row = await platformPrisma.userAchievement.findUnique({
      where: { userId_achievementId: { userId: learner, achievementId: perfectScoreBadge } },
    });
    expect(row).not.toBeNull();
    cleanup.track(() => platformPrisma.userAchievement.delete({ where: { id: row!.id } }));
  });

  it("getAchievementsPageData reports the awarded badge as earned (drives non-grayscale styling) and counts it", async () => {
    const cards = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { getAchievementsPageData } = await import("@/lib/gamification/achievements-data");
      return getAchievementsPageData(learner);
    });

    const perfectCard = cards.find((c) => c.id === perfectScoreBadge);
    expect(perfectCard?.earned).toBe(true);
    expect(perfectCard?.earnedAt).not.toBeNull();

    const totalEarned = cards.filter((c) => c.earned).length;
    expect(totalEarned).toBeGreaterThanOrEqual(1);
  });

  it("a badge whose criteria are unmet stays unearned (drives grayscale) with accurate progress", async () => {
    const cards = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { getAchievementsPageData } = await import("@/lib/gamification/achievements-data");
      return getAchievementsPageData(learner);
    });

    const quizMasterCard = cards.find((c) => c.id === quizMasterBadge);
    expect(quizMasterCard?.earned).toBe(false);
    expect(quizMasterCard?.earnedAt).toBeNull();
    expect(quizMasterCard?.progressCurrent).toBe(1);
    expect(quizMasterCard?.progressThreshold).toBe(5);
  });

  it("re-running evaluateAchievements against the same data does not duplicate the award", async () => {
    const run = () =>
      asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async ({ prisma }) => {
        const { evaluateAchievements } = await import("@/lib/gamification/achievements");
        return prisma.$transaction((tx) =>
          evaluateAchievements(tx, {
            userId: learner,
            relevantKinds: ["QUIZ_PASS_COUNT", "QUIZ_PERFECT_COUNT"],
            quizId: quiz,
          }),
        );
      });

    // Already earned from the first test in this file — both reruns must be no-ops.
    const second = await run();
    const third = await run();
    expect(second.map((a) => a.id)).not.toContain(perfectScoreBadge);
    expect(third.map((a) => a.id)).not.toContain(perfectScoreBadge);

    const rows = await platformPrisma.userAchievement.findMany({
      where: { userId: learner, achievementId: perfectScoreBadge },
    });
    expect(rows).toHaveLength(1);
  });

  it("tenant isolation: another tenant evaluating the same userId sees no progress and awards nothing", async () => {
    const unlocked = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) => {
      const { evaluateAchievements } = await import("@/lib/gamification/achievements");
      return prisma.$transaction((tx) =>
        evaluateAchievements(tx, { userId: learner, relevantKinds: ["QUIZ_PASS_COUNT", "QUIZ_PERFECT_COUNT"] }),
      );
    });
    expect(unlocked).toHaveLength(0);

    const cards = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { getAchievementsPageData } = await import("@/lib/gamification/achievements-data");
      return getAchievementsPageData(learner);
    });
    expect(cards.find((c) => c.id === perfectScoreBadge)).toBeUndefined();

    const row = await platformPrisma.userAchievement.findFirst({
      where: { userId: learner, achievementId: perfectScoreBadge, tenantId: DEMO_ACADEMY_TENANT_ID },
    });
    expect(row).toBeNull();
  });
});
