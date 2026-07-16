import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return { title: `Order History | ${branding.platformName}` };
}

const STATUS_VARIANT: Record<string, "default" | "success" | "destructive" | "outline"> = {
  PENDING: "outline",
  PAID: "success",
  FAILED: "destructive",
  CANCELLED: "destructive",
  REFUNDED: "outline",
  PARTIALLY_REFUNDED: "outline",
};

export default async function OrderHistoryPage() {
  const user = await requireUser();

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Order History</h1>

      {orders.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Order</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Amount Paid</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-primary hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {order.items.map((i) => i.titleSnapshot).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    ₹{Number(order.totalAmount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
