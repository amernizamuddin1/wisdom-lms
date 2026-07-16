import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { COMMERCE_METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import type { CommercialFunnelStageRow } from "@/lib/analytics/commerce-funnel";

export default function CommercialFunnelChart({ stages }: { stages: CommercialFunnelStageRow[] }) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const allZero = stages.every((s) => s.count === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle>Commercial Funnel</CardTitle>
          <InfoTooltip text={COMMERCE_METRIC_TOOLTIPS.commercialFunnel} />
        </div>
      </CardHeader>
      <CardContent>
        {allZero ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No commercial activity matches the selected filters yet.
          </p>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => {
              const widthPercent = Math.max(4, Math.round((stage.count / maxCount) * 100));
              return (
                <div key={stage.stage} className="px-1 py-1">
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="font-medium text-foreground">{stage.label}</span>
                    <span className="text-muted-foreground">
                      {stage.count.toLocaleString()} <span className="text-xs">({stage.percentOfViewed}%)</span>
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className="h-full rounded-md bg-primary/80 transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Product Viewed, Added to Cart, Checkout Started, and Payment Initiated only reflect authenticated
          visitors and only have data from this feature&apos;s launch date forward. Payment Completed has full
          history.
        </p>
      </CardContent>
    </Card>
  );
}
