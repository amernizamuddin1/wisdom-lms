import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComparisonResult } from "@/lib/analytics/gamification-comparison";

function formatValue(value: number, unit: "percent" | "minutes" | "days" | "score"): string {
  if (unit === "percent") return `${value}%`;
  if (unit === "minutes") return `${value}m`;
  return String(value);
}

// Renders an observational-only comparison — used for both the gamification
// (streak vs. no-streak) and community (participant vs. non-participant)
// pages. Always labeled as correlation, never causation (see spec §14/§16),
// and suppressed entirely below MIN_COMPARISON_SAMPLE_SIZE per group.
export default function ComparisonPanel({ title, withLabel, withoutLabel, result }: { title: string; withLabel: string; withoutLabel: string; result: ComparisonResult }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-xs text-muted-foreground">Observational comparison only — not a proven cause-and-effect relationship.</p>
      </CardHeader>
      <CardContent>
        {result.suppressed ? (
          <p className="text-sm text-muted-foreground">
            Not enough data for a reliable comparison yet — need at least {result.minSampleSize} learners in each group (currently {result.withGroupSize} vs. {result.withoutGroupSize}).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Metric</th>
                  <th className="py-2 font-medium">{withLabel} ({result.withGroupSize})</th>
                  <th className="py-2 font-medium">{withoutLabel} ({result.withoutGroupSize})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.metrics.map((m) => (
                  <tr key={m.label}>
                    <td className="py-2 text-foreground">{m.label}</td>
                    <td className="py-2 font-medium text-foreground">{formatValue(m.withGroupValue, m.unit)}</td>
                    <td className="py-2 text-muted-foreground">{formatValue(m.withoutGroupValue, m.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
