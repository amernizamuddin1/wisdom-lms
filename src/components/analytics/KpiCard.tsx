import type { LucideIcon } from "lucide-react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import InfoTooltip from "./InfoTooltip";
import Sparkline from "./Sparkline";

export default function KpiCard({
  label,
  value,
  changePercent,
  sparkline,
  tooltip,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  changePercent?: number | null;
  sparkline?: number[];
  tooltip?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const hasChange = changePercent !== undefined && changePercent !== null;
  const isPositive = hasChange && changePercent! > 0;
  const isNegative = hasChange && changePercent! < 0;

  return (
    <Card variant="kpi" className={cn("gap-2 py-4", className)}>
      <CardContent className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
            {tooltip && <InfoTooltip text={tooltip} />}
          </div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {hasChange && (
            <div
              className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground",
              )}
            >
              {isPositive && <ArrowUpIcon className="size-3" />}
              {isNegative && <ArrowDownIcon className="size-3" />}
              <span>
                {isPositive ? "+" : ""}
                {changePercent}%
              </span>
              <span className="font-normal text-muted-foreground">vs. previous period</span>
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {Icon && (
            <div className="flex size-9 items-center justify-center rounded-full bg-surface-brand-subtle text-primary transition-transform duration-[240ms] ease-out motion-safe:group-hover:scale-[1.07] motion-safe:group-hover:rotate-[2deg]">
              <Icon className="size-4" />
            </div>
          )}
          {sparkline && sparkline.length >= 2 && (
            <Sparkline
              values={sparkline}
              className="opacity-80 transition-opacity duration-[240ms] ease-out motion-safe:group-hover:opacity-100"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
