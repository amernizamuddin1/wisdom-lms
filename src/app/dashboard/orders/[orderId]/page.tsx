import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ReceiptDownloadButton from "@/components/ReceiptDownloadButton";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return { title: `Order Details | ${branding.platformName}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await requireUser();
  const { orderId } = await params;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { items: true, payment: true },
  });

  if (!order) notFound();

  const symbol = order.currency === "INR" ? "₹" : order.currency === "EUR" ? "€" : "$";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Order {order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on {order.createdAt.toLocaleDateString()}
          </p>
        </div>
        {order.status === "PAID" && <ReceiptDownloadButton orderId={order.id} />}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Status</span>
            <Badge variant={order.status === "PAID" ? "success" : "outline"}>{order.status}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Payment method</span>
            <span className="text-sm text-foreground">{order.paymentMethod}</span>
          </div>
          {order.payment?.gatewayPaymentId && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Payment ID</span>
              <span className="font-mono text-xs text-foreground">{order.payment.gatewayPaymentId}</span>
            </div>
          )}

          <div className="space-y-1.5 border-t pt-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">{item.titleSnapshot}</span>
                <div className="flex items-baseline gap-2">
                  {Number(item.finalPrice) < Number(item.originalPrice) && (
                    <span className="text-xs text-muted-foreground line-through">
                      {symbol}
                      {Number(item.originalPrice).toLocaleString()}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {Number(item.finalPrice) === 0
                      ? "Free"
                      : `${symbol}${Number(item.finalPrice).toLocaleString()}`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>
                {symbol}
                {Number(order.subtotal).toLocaleString()}
              </span>
            </div>
            {Number(order.discountTotal) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>
                  -{symbol}
                  {Number(order.discountTotal).toLocaleString()}
                </span>
              </div>
            )}
            {Number(order.couponDiscountAmount) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Coupon ({order.couponCode})</span>
                <span>
                  -{symbol}
                  {Number(order.couponDiscountAmount).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold text-foreground">
              <span>Total</span>
              <span>
                {symbol}
                {Number(order.totalAmount).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
