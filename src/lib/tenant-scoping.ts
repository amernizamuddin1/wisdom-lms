// Pure, DB-free scoping logic for the Prisma tenant-auto-scoping extension
// (src/lib/prisma.ts). Kept separate so it can be unit tested without
// spinning up a Prisma client / DB connection.

// Every model that carries a tenantId column (everything except the globally
// shared User, and Tenant/TenantMembership themselves). Settings/
// CommunitySettings are deliberately excluded: their primary key IS tenantId,
// so callers already filter by it directly — there's no secondary field to
// auto-inject.
export const TENANT_SCOPED_MODELS = new Set([
  "Course",
  "Instructor",
  "CourseInstructor",
  "CoursePrice",
  "Chapter",
  "Lesson",
  "LessonFile",
  "Quiz",
  "QuizQuestion",
  "QuizAttempt",
  "QuizAttemptAnswer",
  "CourseBundle",
  "BundleCourse",
  "BundlePrice",
  "Enrollment",
  "EnrollmentGrant",
  "BundleEnrollment",
  "LessonProgress",
  "Certificate",
  "Payment",
  "Order",
  "OrderItem",
  "OrderPayment",
  "Cart",
  "CartItem",
  "Coupon",
  "CouponCourse",
  "CouponBundle",
  "CouponRedemption",
  "Refund",
  "ImportJob",
  "EmailCampaign",
  "EmailCampaignRecipient",
  "Notification",
  "NotificationRecipient",
  "AdminAuditLog",
  "CommerceEvent",
  "UserActivityEvent",
  "UserXpTransaction",
  "UserGamificationProfile",
  "UserAchievement",
  "UserDailyLearningActivity",
  "UserCourseLearningTime",
  "UserSegmentSnapshot",
  "CommunityCategory",
  "DiscussionThread",
  "DiscussionAnswer",
  "DiscussionReply",
  "DiscussionReaction",
  "DiscussionFollow",
  "DiscussionReport",
  "CommunityUserRestriction",
  "CommunityModerationLog",
  "DiscussionNotification",
  "GamificationLevel",
  "XpRule",
  "AchievementDefinition",
  "Group",
  "GroupMembership",
]);

export const READ_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

export const WHERE_MUTATIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);

export interface ScopableArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown> | Record<string, unknown>[];
  create?: Record<string, unknown>;
  [key: string]: unknown;
}

function injectWhere(
  where: Record<string, unknown> | undefined,
  tenantId: string,
): Record<string, unknown> {
  return { ...(where ?? {}), tenantId };
}

// Returns a NEW args object with tenantId injected according to the
// operation's shape — never mutates the input. Returns the same args
// reference unmodified for models/operations that don't need scoping.
export function applyTenantScope(
  model: string | undefined,
  operation: string,
  args: ScopableArgs,
  tenantId: string,
): ScopableArgs {
  if (!model || !TENANT_SCOPED_MODELS.has(model)) {
    return args;
  }

  if (READ_OPERATIONS.has(operation) || WHERE_MUTATIONS.has(operation)) {
    return { ...args, where: injectWhere(args.where, tenantId) };
  }

  if (operation === "create") {
    return { ...args, data: { ...(args.data as Record<string, unknown>), tenantId } };
  }

  if (operation === "createMany") {
    return {
      ...args,
      data: Array.isArray(args.data)
        ? args.data.map((row) => ({ ...row, tenantId }))
        : args.data,
    };
  }

  if (operation === "upsert") {
    return {
      ...args,
      where: injectWhere(args.where, tenantId),
      create: { ...(args.create as Record<string, unknown>), tenantId },
    };
  }

  return args;
}
