import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import CourseCard from "../CourseCard";
import CatalogFilters from "../CatalogFilters";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `Browse Courses | ${branding.platformName}`,
    description: "Explore our catalog of courses designed to get you job-ready.",
  };
}

export default async function CoursesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; price?: string; tag?: string }>;
}) {
  const { q, price, tag } = await searchParams;

  const [courses, publishedCourses] = await Promise.all([
    prisma.course.findMany({
      where: {
        status: "PUBLISHED",
        ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
        ...(tag && tag !== "all" ? { tags: { has: tag } } : {}),
        ...(price === "free" ? { isFree: true } : {}),
        ...(price === "paid" ? { isFree: false } : {}),
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
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { tags: true } }),
  ]);

  const allTags = Array.from(new Set(publishedCourses.flatMap((c) => c.tags))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Browse Courses</h1>
        <p className="font-body text-muted-foreground">
          Case-study-driven courses that teach real workplace skills.
        </p>
      </div>

      <div className="mb-8">
        <CatalogFilters
          tags={allTags}
          defaults={{ q: q ?? "", price: price ?? "all", tag: tag ?? "all" }}
        />
      </div>

      {courses.length === 0 ? (
        <p className="text-muted-foreground">No courses match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}
