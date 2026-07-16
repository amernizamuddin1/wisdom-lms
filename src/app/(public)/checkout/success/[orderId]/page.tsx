import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2Icon } from "lucide-react";

export default async function CheckoutSuccessPage({
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

  if (!order || order.status !== "PAID") notFound();

  const symbol = order.currency === "INR" ? "₹" : order.currency === "EUR" ? "€" : "$";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
      <CheckCircle2Icon className="mx-auto size-14 text-success" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">Order confirmed</h1>
      <p className="mt-1 font-body text-muted-foreground">Order #{order.orderNumber}</p>

      <Card className="mt-6 text-left">
        <CardContent className="space-y-3">
          <ul className="space-y-1.5">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">{item.titleSnapshot}</span>
                <span className="text-muted-foreground">
                  {Number(item.finalPrice) === 0 ? "Free" : `${symbol}${Number(item.finalPrice).toLocaleString()}`}
                </span>
              </li>
            ))}
          </ul>
          {Number(order.couponDiscountAmount) > 0 && (
            <div className="flex justify-between border-t pt-3 text-sm text-muted-foreground">
              <span>Coupon ({order.couponCode})</span>
              <span>
                -{symbol}
                {Number(order.couponDiscountAmount).toLocaleString()}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-base font-semibold text-foreground">
            <span>Amount paid</span>
            <span>
              {symbol}
              {Number(order.totalAmount).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <Button asChild className="mt-6">
        <Link href="/dashboard">Go to Dashboard</Link>
      </Button>
    </div>
  );
}
