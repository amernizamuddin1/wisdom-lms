import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { effectivePrice, isDiscountActive } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BundleDeleteButton from "./BundleDeleteButton";

export default async function BundlesPage() {
  await requireAdmin();

  const bundles = await prisma.courseBundle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      prices: true,
      courses: { include: { course: { include: { prices: true } } } },
      _count: { select: { enrollments: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Course Bundles</h2>
        <Button asChild>
          <Link href="/admin/bundles/new">New Bundle</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Courses</th>
              <th className="px-4 py-3 font-medium">Individual value</th>
              <th className="px-4 py-3 font-medium">Bundle price</th>
              <th className="px-4 py-3 font-medium">Effective price</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Launch date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Enrolments</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {bundles.map((bundle) => {
              const usdPrice = bundle.prices.find((p) => p.currency === "USD");
              const individualValueUsd = bundle.courses.reduce((sum, bc) => {
                const p = bc.course.prices.find((cp) => cp.currency === "USD");
                return sum + (p ? Number(p.amount) : 0);
              }, 0);

              const discountActive = usdPrice
                ? isDiscountActive({
                    discountedPrice: usdPrice.discountedPrice != null ? Number(usdPrice.discountedPrice) : null,
                    discountStartAt: usdPrice.discountStartAt,
                    discountEndAt: usdPrice.discountEndAt,
                    maxDiscountedEnrollments: usdPrice.maxDiscountedEnrollments,
                    discountedEnrollmentsUsed: usdPrice.discountedEnrollmentsUsed,
                  })
                : false;

              const effective = usdPrice
                ? effectivePrice({
                    amount: Number(usdPrice.amount),
                    discountedPrice: usdPrice.discountedPrice != null ? Number(usdPrice.discountedPrice) : null,
                    discountStartAt: usdPrice.discountStartAt,
                    discountEndAt: usdPrice.discountEndAt,
                    maxDiscountedEnrollments: usdPrice.maxDiscountedEnrollments,
                    discountedEnrollmentsUsed: usdPrice.discountedEnrollmentsUsed,
                  })
                : 0;

              return (
                <tr key={bundle.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bundles/${bundle.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {bundle.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{bundle.courses.length}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bundle.isFree ? "—" : `$${individualValueUsd.toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bundle.isFree ? "Free" : usdPrice ? `$${Number(usdPrice.amount).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bundle.isFree ? "Free" : usdPrice ? `$${effective.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {discountActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="secondary">None</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {bundle.launchDate ? bundle.launchDate.toISOString().slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        bundle.status === "ACTIVE"
                          ? "success"
                          : bundle.status === "PAUSED"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {bundle.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{bundle._count.enrollments}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/bundles/${bundle.id}`}>Edit</Link>
                      </Button>
                      <BundleDeleteButton bundleId={bundle.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {bundles.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                  No bundles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
