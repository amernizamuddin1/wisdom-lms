import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Cleanup, DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule, uniqueSuffix } from "./db-helper";

describe.skipIf(!hasStagingDb)("Notifications, messaging & community tenant isolation", () => {
  const cleanup = new Cleanup();
  let platformPrisma: Awaited<ReturnType<typeof loadPrismaModule>>["platformPrisma"];
  let adminA: string, learnerA: string, notificationA: string, campaignA: string, threadA: string, categoryA: string;

  beforeAll(async () => {
    ({ platformPrisma } = await loadPrismaModule());
    const s = uniqueSuffix();
    adminA = (await platformPrisma.user.create({ data: { name: "Admin", email: `nc-admin-${s}@test.local`, role: "ADMIN" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: adminA } }));
    learnerA = (await platformPrisma.user.create({ data: { name: "Learner", email: `nc-learner-${s}@test.local`, role: "STUDENT" } })).id;
    cleanup.track(() => platformPrisma.user.delete({ where: { id: learnerA } }));

    notificationA = (
      await platformPrisma.notification.create({
        data: {
          tenantId: WISDOMQUANT_TENANT_ID,
          internalName: `nc-notif-${s}`,
          title: "Hi",
          richContent: "<p>hi</p>",
          audienceType: "ALL_USERS",
          status: "PUBLISHED",
          createdById: adminA,
          recipients: { create: { tenantId: WISDOMQUANT_TENANT_ID, userId: learnerA } },
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.notification.delete({ where: { id: notificationA } }));

    campaignA = (
      await platformPrisma.emailCampaign.create({
        data: {
          tenantId: WISDOMQUANT_TENANT_ID,
          internalName: `nc-campaign-${s}`,
          subject: "Subj",
          htmlContent: "<p>body</p>",
          createdById: adminA,
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.emailCampaign.delete({ where: { id: campaignA } }));

    categoryA = (
      await platformPrisma.communityCategory.create({
        data: { tenantId: WISDOMQUANT_TENANT_ID, name: "General", slug: `nc-general-${s}`, createdById: adminA },
      })
    ).id;
    cleanup.track(() => platformPrisma.communityCategory.delete({ where: { id: categoryA } }));

    threadA = (
      await platformPrisma.discussionThread.create({
        data: {
          tenantId: WISDOMQUANT_TENANT_ID,
          authorId: learnerA,
          categoryId: categoryA,
          title: `nc-thread-${s}`,
          bodyHtml: "<p>q</p>",
        },
      })
    ).id;
    cleanup.track(() => platformPrisma.discussionThread.delete({ where: { id: threadA } }));
  });

  afterAll(async () => {
    await cleanup.run();
  });

  it("Tenant B cannot read Tenant A's notification, campaign, or thread by id", async () => {
    const [notif, campaign, thread] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
      Promise.all([
        prisma.notification.findUnique({ where: { id: notificationA } }),
        prisma.emailCampaign.findUnique({ where: { id: campaignA } }),
        prisma.discussionThread.findUnique({ where: { id: threadA } }),
      ]),
    );
    expect(notif).toBeNull();
    expect(campaign).toBeNull();
    expect(thread).toBeNull();
  });

  it("Tenant B enumerating discussion threads/categories never includes Tenant A's community content", async () => {
    const [threads, categories] = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async ({ prisma }) =>
      Promise.all([prisma.discussionThread.findMany({}), prisma.communityCategory.findMany({})]),
    );
    expect(threads.some((t) => t.id === threadA)).toBe(false);
    expect(categories.some((c) => c.id === categoryA)).toBe(false);
  });

  it("Tenant B replying to Tenant A's thread id via the real createReply() action is rejected", async () => {
    // createReply() (src/lib/community/replies.ts) looks the thread up
    // through the auto-scoped `prisma` client first — scoped as Tenant B,
    // that lookup can never resolve Tenant A's thread id, so it throws
    // before any DiscussionReply row is ever created. (A raw, unchecked
    // `prisma.discussionReply.create` would NOT be blocked by any DB
    // constraint — there's no composite FK tying reply.tenant_id to
    // thread.tenant_id — so isolation here depends entirely on every real
    // write path re-deriving the thread through the scoped client first,
    // as this one does.)
    const { createReply } = await import("@/lib/community/replies");
    await expect(
      asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", () =>
        createReply({ threadId: threadA, authorId: learnerA, bodyHtml: "<p>hijack</p>" }),
      ),
    ).rejects.toThrow();
  });
});
