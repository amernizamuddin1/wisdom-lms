import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BundleCourseComparisonRow } from "@/lib/analytics/commerce-bundles";

// Bundle-vs-standalone started-rate comparison for a single selected bundle.
// Visual style mirrors ComparisonPanel.tsx (same "observational only" caption
// and two-column layout), but typed for this page's own comparison shape —
// ComparisonPanel's ComparisonResult type doesn't match BundleCourseComparisonRow.
export default function BundleComparisonTable({
  bundleName,
  rows,
}: {
  bundleName: string;
  rows: BundleCourseComparisonRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bundle vs. Standalone Started Rate — {bundleName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Observational comparison only — not a proven cause-and-effect relationship.
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No member courses to compare for this bundle.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 font-medium">Course</th>
                  <th className="py-2 font-medium">Started via Bundle</th>
                  <th className="py-2 font-medium">Started via Direct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.courseId}>
                    <td className="py-2 text-foreground">{r.title}</td>
                    <td className="py-2 font-medium text-foreground">{r.startedRateViaBundle}%</td>
                    <td className="py-2 text-muted-foreground">{r.startedRateViaDirect}%</td>
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
