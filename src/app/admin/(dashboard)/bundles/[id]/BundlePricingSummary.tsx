import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { effectivePrice, isDiscountActive, discountPercentage } from "@/lib/pricing";

export default function BundlePricingSummary({
  combinedValueUsd,
  usdPrice,
}: {
  combinedValueUsd: number;
  usdPrice: {
    amount: number;
    discountedPrice: number | null;
    discountStartAt: Date | null;
    discountEndAt: Date | null;
    maxDiscountedEnrollments: number | null;
    discountedEnrollmentsUsed: number;
  } | null;
}) {
  if (!usdPrice) {
    return null;
  }

  const discountActive = isDiscountActive(usdPrice);
  const effective = effectivePrice(usdPrice);
  const savingsVsIndividual = Math.max(0, combinedValueUsd - effective);
  const savingsPercent =
    combinedValueUsd > 0 ? Math.max(0, discountPercentage(combinedValueUsd, effective)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Summary (USD)</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Individual course value</dt>
            <dd className="font-medium text-foreground">${combinedValueUsd.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bundle regular price</dt>
            <dd className="font-medium text-foreground">${usdPrice.amount.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {discountActive ? "Current discounted price" : "Current selling price"}
            </dt>
            <dd className="font-medium text-foreground">${effective.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customer savings (vs individual value)</dt>
            <dd className="font-medium text-success">
              ${savingsVsIndividual.toFixed(2)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customer savings %</dt>
            <dd className="font-medium text-success">
              {savingsPercent.toFixed(1)}%
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
