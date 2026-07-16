import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import InfoTooltip from "@/components/analytics/InfoTooltip";
import { METRIC_TOOLTIPS } from "@/lib/analytics/definitions";
import type { FunnelStageCount } from "@/lib/analytics/funnel";

export default function EnrollmentFunnel({
  stages,
  learnersHref,
}: {
  stages: FunnelStageCount[];
  learnersHref: (stage: string) => string;
}) {
  const maxCount = Math.max(1, ...stages.map((s) => s.count));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle>Enrollment-to-Completion Funnel</CardTitle>
          <InfoTooltip text={METRIC_TOOLTIPS.enrollmentFunnel} />
        </div>
      </CardHeader>
      <CardContent>
        {maxCount <= 1 && stages.every((s) => s.count === 0) ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No enrollments match the selected filters yet.
          </p>
        ) : (
          <div className="space-y-3">
            {stages.map((stage) => {
              const widthPercent = Math.max(4, Math.round((stage.count / maxCount) * 100));
              return (
                <Link
                  key={stage.stage}
                  href={learnersHref(stage.stage)}
                  className="block rounded-md border border-transparent px-1 py-1 transition-colors hover:border-primary/50 hover:bg-muted/30"
                >
                  <div className="flex items-center justify-between py-1 text-sm">
                    <span className="font-medium text-foreground">{stage.label}</span>
                    <span className="text-muted-foreground">
                      {stage.count.toLocaleString()} <span className="text-xs">({stage.percentOfEnrolled}%)</span>
                    </span>
                  </div>
                  <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
                    <div
                      className="h-full rounded-md bg-primary/80 transition-all"
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
