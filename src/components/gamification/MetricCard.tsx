import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MetricCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <Card variant="kpi" className={cn("gap-2 py-4", className)}>
      <CardContent className="flex items-center justify-between gap-3 px-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-brand-subtle text-primary transition-transform duration-[240ms] ease-out motion-safe:group-hover:scale-[1.07] motion-safe:group-hover:rotate-[2deg]">
            <Icon className="size-4" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
