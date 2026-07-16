import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DistributionBars({ title, data }: { title: string; data: { label: string; count: number }[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.count, 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((d) => {
          const percent = Math.round((d.count / total) * 100);
          const widthPercent = Math.max(2, percent);
          return (
            <div key={d.label} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0 truncate text-muted-foreground" title={d.label}>
                {d.label}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${widthPercent}%` }} />
              </div>
              <span className="w-20 shrink-0 text-right text-muted-foreground">
                {d.count} ({percent}%)
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
