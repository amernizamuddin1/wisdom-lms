import "server-only";
import { unstable_cache } from "next/cache";
import { platformPrisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/tenant-context";

const PUBLIC_DATA_REVALIDATE_SECONDS = 60;

function tenantTag(tenantId: string, resource: string): string {
  return `tenant:${tenantId}:${resource}`;
}

function revivePriceDates<T extends {
  discountStartAt: Date | string | null;
  discountEndAt: Date | string | null;
}>(price: T) {
  return {
    ...price,
    discountStartAt: price.discountStartAt ? new Date(price.discountStartAt) : null,
    discountEndAt: price.discountEndAt ? new Date(price.discountEndAt) : null,
  };
}

export type CatalogFilters = {
  q?: string;
  price?: string;
  tag?: string;
};

export async function getPublishedCourseCatalog(filters: CatalogFilters) {
  const tenantId = await getTenantId();
  const normalized = {
    q: filters.q?.trim() || "",
    price: filters.price || "all",
    tag: filters.tag || "all",
  };

  const result = await unstable_cache(
    async () => {
      const [courses, publishedCourses] = await Promise.all([
        platformPrisma.course.findMany({
          where: {
            tenantId,
            status: "PUBLISHED",
            ...(normalized.q
              ? { title: { contains: normalized.q, mode: "insensitive" as const } }
              : {}),
            ...(normalized.tag !== "all" ? { tags: { has: normalized.tag } } : {}),
            ...(normalized.price === "free" ? { isFree: true } : {}),
            ...(normalized.price === "paid" ? { isFree: false } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            isFree: true,
            tags: true,
            prices: {
              select: {
                currency: true,
                amount: true,
                discountedPrice: true,
                discountStartAt: true,
                discountEndAt: true,
                maxDiscountedEnrollments: true,
                discountedEnrollmentsUsed: true,
              },
            },
          },
        }),
        platformPrisma.course.findMany({
          where: { tenantId, status: "PUBLISHED" },
          select: { tags: true },
        }),
      ]);

      return {
        courses,
        tags: Array.from(new Set(publishedCourses.flatMap((course) => course.tags))).sort(),
      };
    },
    ["published-course-catalog", tenantId, JSON.stringify(normalized)],
    {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
      tags: [tenantTag(tenantId, "courses")],
    },
  )();

  return {
    ...result,
    courses: result.courses.map((course) => ({
      ...course,
      prices: course.prices.map(revivePriceDates),
    })),
  };
}

export async function getPublishedCourse(courseId: string) {
  const tenantId = await getTenantId();

  const course = await unstable_cache(
    () =>
      platformPrisma.course.findFirst({
        where: { tenantId, id: courseId, status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          shortDescription: true,
          description: true,
          isFree: true,
          thumbnailUrl: true,
          previewVideoUrl: true,
          learningStatus: true,
          level: true,
          tags: true,
          prerequisites: true,
          learningObjectives: true,
          outcomes: true,
          targetAudience: true,
          materialsIncluded: true,
          durationMinutes: true,
          certificateEnabled: true,
          isPermanentAccess: true,
          accessDurationMonths: true,
          launchDate: true,
          updatedAt: true,
          prices: {
            select: {
              currency: true,
              amount: true,
              discountedPrice: true,
              discountStartAt: true,
              discountEndAt: true,
              maxDiscountedEnrollments: true,
              discountedEnrollmentsUsed: true,
            },
          },
          instructors: {
            orderBy: { order: "asc" },
            select: {
              instructor: {
                select: {
                  id: true,
                  name: true,
                  title: true,
                  bio: true,
                  avatarUrl: true,
                },
              },
            },
          },
          chapters: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              lessons: {
                orderBy: { order: "asc" },
                select: { id: true, title: true, lessonType: true },
              },
              quizzes: { select: { id: true, title: true } },
            },
          },
        },
      }),
    ["published-course", tenantId, courseId],
    {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
      tags: [
        tenantTag(tenantId, "courses"),
        tenantTag(tenantId, `course:${courseId}`),
      ],
    },
  )();

  return course
    ? {
        ...course,
        launchDate: course.launchDate ? new Date(course.launchDate) : null,
        updatedAt: new Date(course.updatedAt),
        prices: course.prices.map(revivePriceDates),
      }
    : null;
}

export async function getActiveBundleCatalog(filters: CatalogFilters) {
  const tenantId = await getTenantId();
  const normalized = {
    q: filters.q?.trim() || "",
    price: filters.price || "all",
    tag: filters.tag || "all",
  };

  const result = await unstable_cache(
    async () => {
      const [bundles, activeBundles] = await Promise.all([
        platformPrisma.courseBundle.findMany({
          where: {
            tenantId,
            status: "ACTIVE",
            ...(normalized.q
              ? { name: { contains: normalized.q, mode: "insensitive" as const } }
              : {}),
            ...(normalized.tag !== "all" ? { tags: { has: normalized.tag } } : {}),
            ...(normalized.price === "free" ? { isFree: true } : {}),
            ...(normalized.price === "paid" ? { isFree: false } : {}),
          },
          orderBy: { createdAt: "desc" },
          select: {
            slug: true,
            name: true,
            shortDescription: true,
            thumbnailUrl: true,
            isFree: true,
            tags: true,
            prices: {
              select: {
                currency: true,
                amount: true,
                discountedPrice: true,
                discountStartAt: true,
                discountEndAt: true,
                maxDiscountedEnrollments: true,
                discountedEnrollmentsUsed: true,
              },
            },
            _count: { select: { courses: true } },
          },
        }),
        platformPrisma.courseBundle.findMany({
          where: { tenantId, status: "ACTIVE" },
          select: { tags: true },
        }),
      ]);

      return {
        bundles,
        tags: Array.from(new Set(activeBundles.flatMap((bundle) => bundle.tags))).sort(),
      };
    },
    ["active-bundle-catalog", tenantId, JSON.stringify(normalized)],
    {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
      tags: [tenantTag(tenantId, "bundles")],
    },
  )();

  return {
    ...result,
    bundles: result.bundles.map((bundle) => ({
      ...bundle,
      prices: bundle.prices.map(revivePriceDates),
    })),
  };
}

export async function getActiveBundle(slug: string) {
  const tenantId = await getTenantId();

  const bundle = await unstable_cache(
    () =>
      platformPrisma.courseBundle.findFirst({
        where: { tenantId, slug, status: "ACTIVE" },
        include: {
          prices: true,
          courses: {
            orderBy: { order: "asc" },
            include: {
              course: {
                select: { id: true, title: true, thumbnailUrl: true },
              },
            },
          },
        },
      }),
    ["active-bundle", tenantId, slug],
    {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
      tags: [
        tenantTag(tenantId, "bundles"),
        tenantTag(tenantId, `bundle:${slug}`),
      ],
    },
  )();

  return bundle
    ? {
        ...bundle,
        createdAt: new Date(bundle.createdAt),
        updatedAt: new Date(bundle.updatedAt),
        prices: bundle.prices.map(revivePriceDates),
      }
    : null;
}
