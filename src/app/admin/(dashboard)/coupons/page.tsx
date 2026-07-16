import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function CouponsPage() {
  await requireAdmin();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Coupons</h2>
        <Button asChild>
          <Link href="/admin/coupons/new">New Coupon</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Code</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Scope</th>
              <th className="px-4 py-3 font-medium">Redemptions</th>
              <th className="px-4 py-3 font-medium">Valid window</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-muted/50">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/coupons/${coupon.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {coupon.code}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {coupon.type === "PERCENTAGE" ? `${coupon.value}%` : `₹${coupon.value}`}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {coupon.scope === "ALL" ? "Whole cart" : "Specific items"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {coupon.redemptionsUsed}
                  {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ""}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {coupon.validFrom ? coupon.validFrom.toLocaleDateString() : "—"}
                  {" – "}
                  {coupon.validUntil ? coupon.validUntil.toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={coupon.isActive ? "success" : "secondary"}>
                    {coupon.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
