import { Badge } from "@/components/ui/badge";
import { effectivePrice, isDiscountActive, discountPercentage } from "@/lib/pricing";

type PriceLike = {
  currency: string;
  amount: unknown;
  discountedPrice: unknown;
  discountStartAt: Date | null;
  discountEndAt: Date | null;
  maxDiscountedEnrollments: number | null;
  discountedEnrollmentsUsed: number;
};

const CURRENCY_SYMBOL: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };

export function selectDisplayPrice<T extends { currency: string }>(prices: T[]): T | undefined {
  return prices.find((p) => p.currency === "INR") ?? prices.find((p) => p.currency === "USD") ?? prices[0];
}

export default function PriceDisplay({
  isFree,
  prices,
  size = "default",
}: {
  isFree: boolean;
  prices: PriceLike[];
  size?: "default" | "sm";
}) {
  if (isFree) {
    return <Badge variant="success">Free</Badge>;
  }

  const display = selectDisplayPrice(prices);
  if (!display) {
    return <span className="text-sm text-muted-foreground">Contact us for pricing</span>;
  }

  const amount = Number(display.amount);
  const discountedRaw = display.discountedPrice != null ? Number(display.discountedPrice) : null;
  const priceInput = {
    amount,
    discountedPrice: discountedRaw,
    discountStartAt: display.discountStartAt,
    discountEndAt: display.discountEndAt,
    maxDiscountedEnrollments: display.maxDiscountedEnrollments,
    discountedEnrollmentsUsed: display.discountedEnrollmentsUsed,
  };
  const active = isDiscountActive(priceInput);
  const current = effectivePrice(priceInput);
  const pct = active && discountedRaw != null ? discountPercentage(amount, discountedRaw) : 0;
  const symbol = CURRENCY_SYMBOL[display.currency] ?? "";

  return (
    <div className="flex items-baseline gap-2">
      <span
        className={
          size === "sm"
            ? "text-base font-semibold text-foreground"
            : "text-xl font-semibold text-foreground"
        }
      >
        {symbol}
        {current.toLocaleString()}
      </span>
      {active && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {symbol}
            {amount.toLocaleString()}
          </span>
          <Badge variant="destructive">{pct}% off</Badge>
        </>
      )}
    </div>
  );
}
