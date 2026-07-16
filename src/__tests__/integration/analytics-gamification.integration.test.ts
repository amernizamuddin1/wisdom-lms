import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("Analytics & gamification tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let learnerA: string, activityEventA: string, xpTransactionA: string, levelA: string, badgeA: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();
    learnerA = (await platformPrisma.user.create({ data: { name: "Learner", email: `ag-learner-${s}@test.local`, role: "STUDENT" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learnerA } }));

    await platformPrisma.userGamificationProfile.create({
      data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA, totalXp: 120, currentStreak: 3, longestStreak: 3 },
    });
    cleanup.track(() => platformPrisma.userGamificationProfile.delete({ where: { userId: learnerA } }));

    activityEventA = (
      await platformPrisma.userActivityEvent.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA, type: "LESSON_COMPLETED", xpAwarded: 10 },
      })
    ).id;
    cleanup.track(() => platformPrisma.userActivityEvent.delete({ where: { id: activityEventA } }));

    xpTransactionA = (
      await platformPrisma.userXpTransaction.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA, amount: 10, reason: "test" },
      })
    ).id;
    cleanup.track(() => platformPrisma.userXpTransaction.delete({ where: { id: xpTransactionA } }));

    levelA = (
      await platformPrisma.gamificationLevel.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, order: 777, name: `AG Level ${s}`, minXp: 100000 },
      })
    ).id;
    cleanup.track(() => platformPrisma.gamificationLevel.delete({ where: { id: levelA } }));

    badgeA = `ag-badge-${s}`;
    await platformPrisma.achievementDefinition.create({
      data: {
        id: badgeA,
        tenantId: WISDOMQUANT_TENANT_ID,
        name: "AG Badge",
        description: "test",
        category: "SPECIAL",
        unlockCriteriaJson: { kind: "LESSON_COUNT", count: 1 },
        assetPath: "/x.svg",
      },
    });
    cleanup.track(() => platformPrisma.achievementDefinition.delete({ where: { id: badgeA } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("Tenant B cannot read Tenant A's gamification profile, XP ledger, or activity events", async () => {
    const { prisma } = await loadPrismaModule();
    const [profile, xpTx, events] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", () =>
      Promise.all([
        prisma.userGamificationProfile.findUnique({ where: { userId: learnerA } }),
        prisma.userXpTransaction.findUnique({ where: { id: xpTransactionA } }),
        prisma.userActivityEvent.findMany({ where: { userId: learnerA } }),
      ]),
    );
    expect(profile).toBeNull();
    expect(xpTx).toBeNull();
    expect(events).toHaveLength(0);
  });

  it("Tenant B's gamification catalog (levels/achievements) never includes Tenant A's custom entries", async () => {
    const { prisma } = await loadPrismaModule();
    const [levels, achievements] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", () =>
      Promise.all([prisma.gamificationLevel.findMany({}), prisma.achievementDefinition.findMany({})]),
    );
    expect(levels.some((l) => l.id === levelA)).toBe(false);
    expect(achievements.some((a) => a.id === badgeA)).toBe(false);
  });

  it("Tenant A's own analytics/gamification scoped queries see its own data", async () => {
    const profile = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.userGamificationProfile.findUnique({ where: { userId: learnerA } });
    });
    expect(profile?.totalXp).toBe(120);
  });
});
