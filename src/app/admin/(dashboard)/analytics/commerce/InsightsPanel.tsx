import { LightbulbIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Insight } from "@/lib/analytics/commerce-insights";

export default function InsightsPanel({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-surface-brand-subtle/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LightbulbIcon className="size-4 text-primary" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {insights.map((insight) => (
            <li key={insight.id} className="flex gap-2 text-sm text-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <span>{insight.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
