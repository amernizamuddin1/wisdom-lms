import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import BundleCard from "../BundleCard";
import CatalogFilters from "../CatalogFilters";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `Browse Course Bundles | ${branding.platformName}`,
    description: "Save more with curated bundles of related courses.",
  };
}

export default async function BundlesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; price?: string; tag?: string }>;
}) {
  const { q, price, tag } = await searchParams;

  const [bundles, activeBundles] = await Promise.all([
    prisma.courseBundle.findMany({
      where: {
        status: "ACTIVE",
        ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
        ...(tag && tag !== "all" ? { tags: { has: tag } } : {}),
        ...(price === "free" ? { isFree: true } : {}),
        ...(price === "paid" ? { isFree: false } : {}),
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
    prisma.courseBundle.findMany({ where: { status: "ACTIVE" }, select: { tags: true } }),
  ]);

  const allTags = Array.from(new Set(activeBundles.flatMap((b) => b.tags))).sort();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Course Bundles</h1>
        <p className="font-body text-muted-foreground">
          Curated collections of related courses, bundled together at a better price.
        </p>
      </div>

      <div className="mb-8">
        <CatalogFilters
          tags={allTags}
          defaults={{ q: q ?? "", price: price ?? "all", tag: tag ?? "all" }}
          action="/bundles"
          searchPlaceholder="Search bundles..."
        />
      </div>

      {bundles.length === 0 ? (
        <p className="text-muted-foreground">No bundles match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <BundleCard
              key={bundle.slug}
              bundle={{ ...bundle, courseCount: bundle._count.courses }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
