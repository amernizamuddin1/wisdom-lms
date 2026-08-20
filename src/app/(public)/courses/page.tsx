import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";
import { getPublishedCourseCatalog } from "@/lib/public-data";
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

  const { courses, tags: allTags } = await getPublishedCourseCatalog({ q, price, tag });

  return (
    <div className="mx-auto max-w-(--content-width) px-4 py-10 sm:px-6">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {courses.map((course, index) => (
            <CourseCard key={course.id} course={course} preloadImage={index === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
