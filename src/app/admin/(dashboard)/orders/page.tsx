import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ReceiptDownloadButton from "@/components/ReceiptDownloadButton";
import RefundDialog from "./RefundDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Prisma, OrderStatus } from "@/generated/prisma/client";

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; status?: string; from?: string; to?: string; course?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (params.email) {
    where.user = { email: { contains: params.email, mode: "insensitive" } };
  }
  if (params.status) {
    where.status = params.status as OrderStatus;
  }
  if (params.course) {
    where.items = { some: { titleSnapshot: { contains: params.course, mode: "insensitive" } } };
  }
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T23:59:59`) } : {}),
    };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: true, items: true, payment: true, refunds: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Orders</h2>

      <form method="get" className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">User email</Label>
          <Input id="email" name="email" defaultValue={params.email} placeholder="user@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course">Course / bundle</Label>
          <Input id="course" name="course" defaultValue={params.course} placeholder="Title contains..." />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={params.status ?? "any"}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={params.from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={params.to} />
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Original</th>
              <th className="px-4 py-3 font-medium">Discount</th>
              <th className="px-4 py-3 font-medium">Coupon</th>
              <th className="px-4 py-3 font-medium">Paid</th>
              <th className="px-4 py-3 font-medium">Gateway</th>
              <th className="px-4 py-3 font-medium">Payment ID</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Receipt</th>
              <th className="px-4 py-3 font-medium">Refund</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map((order) => {
              const refundedSoFar = order.refunds.reduce((sum, r) => sum + Number(r.amount), 0);
              const refundable = Number(order.totalAmount) - refundedSoFar;
              const canRefund = (order.status === "PAID" || order.status === "PARTIALLY_REFUNDED") && refundable > 0;
              return (
              <tr key={order.id} className="hover:bg-muted/50">
                <td className="px-4 py-3 font-medium text-foreground">{order.orderNumber}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.user.name}
                  <br />
                  <span className="text-xs">{order.user.email}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.items.map((i) => i.titleSnapshot).join(", ")}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  ₹{Number(order.subtotal).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  ₹{Number(order.discountTotal).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.couponCode ? (
                    <>
                      {order.couponCode}
                      <br />
                      <span className="text-xs">
                        -₹{Number(order.couponDiscountAmount).toLocaleString()}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-foreground">
                  ₹{Number(order.totalAmount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{order.payment?.gateway ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {order.payment?.gatewayPaymentId ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={order.status === "PAID" ? "success" : "outline"}>
                    {order.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {order.createdAt.toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {order.status === "PAID" && <ReceiptDownloadButton orderId={order.id} size="sm" />}
                </td>
                <td className="px-4 py-3">
                  {canRefund ? (
                    <RefundDialog
                      target={{ orderId: order.id, orderNumber: order.orderNumber, maxAmount: refundable }}
                    />
                  ) : refundedSoFar > 0 ? (
                    <span className="text-xs text-muted-foreground">
                      -₹{refundedSoFar.toLocaleString()} refunded
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">
                  No orders match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
