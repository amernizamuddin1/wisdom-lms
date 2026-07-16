import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CouponDetailsForm from "./CouponDetailsForm";
import CouponScopeSection from "./CouponScopeSection";
import CouponActions from "./CouponActions";

export default async function CouponEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const coupon = await prisma.coupon.findUnique({
    where: { id },
    include: {
      courses: { include: { course: { select: { id: true, title: true, thumbnailUrl: true } } } },
      bundles: { include: { bundle: { select: { id: true, name: true, thumbnailUrl: true } } } },
    },
  });
  if (!coupon) notFound();

  const [allCourses, allBundles] = await Promise.all([
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const toDateInput = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{coupon.code}</h2>
          <p className="text-sm text-muted-foreground">
            Redeemed {coupon.redemptionsUsed}
            {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ""} times
          </p>
        </div>
        <CouponActions couponId={coupon.id} isActive={coupon.isActive} />
      </div>

      <CouponDetailsForm
        couponId={coupon.id}
        code={coupon.code}
        description={coupon.description ?? ""}
        type={coupon.type}
        value={coupon.value.toString()}
        maxDiscountAmount={coupon.maxDiscountAmount?.toString() ?? ""}
        minOrderAmount={coupon.minOrderAmount?.toString() ?? ""}
        validFrom={toDateInput(coupon.validFrom)}
        validUntil={toDateInput(coupon.validUntil)}
        maxRedemptions={coupon.maxRedemptions?.toString() ?? ""}
        maxRedemptionsPerUser={coupon.maxRedemptionsPerUser?.toString() ?? ""}
        isActive={coupon.isActive}
        scope={coupon.scope}
      />

      {coupon.scope === "SPECIFIC" && (
        <CouponScopeSection
          couponId={coupon.id}
          allCourses={allCourses}
          allBundles={allBundles}
          selectedCourses={coupon.courses.map((c) => c.course)}
          selectedBundles={coupon.bundles.map((b) => b.bundle)}
        />
      )}
    </div>
  );
}
