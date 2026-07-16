import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BundleDetailsForm from "./BundleDetailsForm";
import BundlePricingForm from "./BundlePricingForm";
import BundlePricingSummary from "./BundlePricingSummary";
import BundleAccessPolicyForm from "./BundleAccessPolicyForm";
import BundleThumbnailUploader from "./BundleThumbnailUploader";
import BundleActions from "./BundleActions";
import BundleCoursesSection, { type BundleCourseOption } from "./BundleCoursesSection";
import AssignBundleForm from "./AssignBundleForm";

export default async function BundleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const bundle = await prisma.courseBundle.findUnique({
    where: { id },
    include: {
      prices: true,
      courses: { orderBy: { order: "asc" }, include: { course: { include: { prices: true } } } },
    },
  });

  if (!bundle) notFound();

  const allCoursesRaw = await prisma.course.findMany({
    orderBy: { title: "asc" },
    include: { prices: true },
  });

  const toOption = (c: (typeof allCoursesRaw)[number]): BundleCourseOption => {
    const usdPrice = c.prices.find((p) => p.currency === "USD");
    return {
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
      status: c.status,
      isFree: c.isFree,
      priceUsd: usdPrice ? Number(usdPrice.amount) : null,
    };
  };

  const allCourses = allCoursesRaw.map(toOption);
  const selectedCourses = bundle.courses.map((bc) => toOption(bc.course));

  const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  const toCurrencyPrice = (currency: "INR" | "USD" | "EUR") => {
    const p = bundle.prices.find((price) => price.currency === currency);
    return {
      amount: p?.amount.toString() ?? "",
      discountedPrice: p?.discountedPrice?.toString() ?? "",
      discountStartAt: toDateInput(p?.discountStartAt ?? null),
      discountEndAt: toDateInput(p?.discountEndAt ?? null),
      maxDiscountedEnrollments: p?.maxDiscountedEnrollments?.toString() ?? "",
      discountedEnrollmentsUsed: p?.discountedEnrollmentsUsed ?? 0,
    };
  };

  const usdPriceRow = bundle.prices.find((p) => p.currency === "USD");
  const combinedValueUsd = selectedCourses.reduce((sum, c) => sum + (c.priceUsd ?? 0), 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">{bundle.name}</h2>
        <BundleActions bundleId={bundle.id} status={bundle.status} />
      </div>

      <BundleDetailsForm
        bundleId={bundle.id}
        name={bundle.name}
        slug={bundle.slug}
        shortDescription={bundle.shortDescription ?? ""}
        description={bundle.description ?? ""}
        isFree={bundle.isFree}
        tags={bundle.tags}
        launchDate={toDateInput(bundle.launchDate)}
      />

      <div>
        <h3 className="mb-3 font-medium text-foreground">Courses in this Bundle</h3>
        <BundleCoursesSection
          bundleId={bundle.id}
          allCourses={allCourses}
          selectedCourses={selectedCourses}
          bundleStatus={bundle.status}
        />
      </div>

      {!bundle.isFree && (
        <>
          <BundlePricingSummary
            combinedValueUsd={combinedValueUsd}
            usdPrice={
              usdPriceRow
                ? {
                    amount: Number(usdPriceRow.amount),
                    discountedPrice:
                      usdPriceRow.discountedPrice != null ? Number(usdPriceRow.discountedPrice) : null,
                    discountStartAt: usdPriceRow.discountStartAt,
                    discountEndAt: usdPriceRow.discountEndAt,
                    maxDiscountedEnrollments: usdPriceRow.maxDiscountedEnrollments,
                    discountedEnrollmentsUsed: usdPriceRow.discountedEnrollmentsUsed,
                  }
                : null
            }
          />

          <BundlePricingForm
            bundleId={bundle.id}
            inr={toCurrencyPrice("INR")}
            usd={toCurrencyPrice("USD")}
            eur={toCurrencyPrice("EUR")}
          />
        </>
      )}

      <BundleAccessPolicyForm
        bundleId={bundle.id}
        isPermanentAccess={bundle.isPermanentAccess}
        accessDurationMonths={bundle.accessDurationMonths}
      />

      <BundleThumbnailUploader bundleId={bundle.id} thumbnailUrl={bundle.thumbnailUrl} />

      <AssignBundleForm bundleId={bundle.id} />
    </div>
  );
}
