import type { Metadata } from "next";
import { getBranding } from "@/lib/branding";
import { getActiveBundleCatalog } from "@/lib/public-data";
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

  const { bundles, tags: allTags } = await getActiveBundleCatalog({ q, price, tag });

  return (
    <div className="mx-auto max-w-(--content-width) px-4 py-10 sm:px-6">
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
          {bundles.map((bundle, index) => (
            <BundleCard
              key={bundle.slug}
              bundle={{ ...bundle, courseCount: bundle._count.courses }}
              preloadImage={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
