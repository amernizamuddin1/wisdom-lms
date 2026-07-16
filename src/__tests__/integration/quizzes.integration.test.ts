import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("Quiz attempts & results tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let learnerA: string, courseA: string, quizA: string, attemptA: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();
    const admin = await platformPrisma.user.create({ data: { name: "Admin", email: `qz-admin-${s}@test.local`, role: "ADMIN" } });
    cleanup.track(() => platformPrisma.user.delete({ where: { id: admin.id } }));
    learnerA = (await platformPrisma.user.create({ data: { name: "Learner", email: `qz-learner-${s}@test.local`, role: "STUDENT" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learnerA } }));

    courseA = (
      await platformPrisma.course.create({ data: { tenantId: WISDOMQUANT_TENANT_ID, title: `QZ Course ${s}`, createdById: admin.id } })
    ).id;
    cleanup.track(() => platformPrisma.course.delete({ where: { id: courseA } }));

    quizA = (
      await platformPrisma.quiz.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, courseId: courseA, title: `QZ Quiz ${s}`, passPercentage: 70 },
      })
    ).id;
    cleanup.track(() => platformPrisma.quiz.delete({ where: { id: quizA } }));

    attemptA = (
      await platformPrisma.quizAttempt.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA, quizId: quizA, score: 88, passed: true },
      })
    ).id;
    cleanup.track(() => platformPrisma.quizAttempt.delete({ where: { id: attemptA } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("Tenant B cannot read Tenant A's quiz or attempt by id", async () => {
    const [quiz, attempt] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return Promise.all([
        prisma.quiz.findUnique({ where: { id: quizA } }),
        prisma.quizAttempt.findUnique({ where: { id: attemptA } }),
      ]);
    });
    expect(quiz).toBeNull();
    expect(attempt).toBeNull();
  });

  it("Tenant B enumerating a learner's quiz attempts never includes Tenant A's results", async () => {
    const attempts = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.quizAttempt.findMany({ where: { userId: learnerA } });
    });
    expect(attempts).toHaveLength(0);
  });

  it("Tenant A sees its own quiz attempt", async () => {
    const attempts = await asTenant(WISDOMQUANT_TENANT_ID, "wisdomquant", async () => {
      const { prisma } = await loadPrismaModule();
      return prisma.quizAttempt.findMany({ where: { userId: learnerA } });
    });
    expect(attempts.map((a) => a.id)).toContain(attemptA);
  });
});
