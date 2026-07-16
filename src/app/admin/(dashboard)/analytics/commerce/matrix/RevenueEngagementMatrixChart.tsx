"use client";

import {
  ScatterChart,
  Scatter,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { REVENUE_ENGAGEMENT_QUADRANT_LABELS, type RevenueEngagementQuadrant } from "@/lib/analytics/definitions";
import type { RevenueEngagementCourseRow } from "@/lib/analytics/commerce-engagement-matrix";

const QUADRANT_COLORS: Record<RevenueEngagementQuadrant, string> = {
  HIGH_REVENUE_HIGH_ENGAGEMENT: "var(--color-success)",
  HIGH_REVENUE_LOW_ENGAGEMENT: "var(--color-primary)",
  LOW_REVENUE_HIGH_ENGAGEMENT: "var(--color-accent)",
  LOW_REVENUE_LOW_ENGAGEMENT: "var(--color-destructive)",
};

const QUADRANT_ORDER: RevenueEngagementQuadrant[] = [
  "HIGH_REVENUE_HIGH_ENGAGEMENT",
  "HIGH_REVENUE_LOW_ENGAGEMENT",
  "LOW_REVENUE_HIGH_ENGAGEMENT",
  "LOW_REVENUE_LOW_ENGAGEMENT",
];

export default function RevenueEngagementMatrixChart({
  courses,
  medianRevenue,
  medianCompletionRate,
}: {
  courses: RevenueEngagementCourseRow[];
  medianRevenue: number;
  medianCompletionRate: number;
}) {
  const hasData = courses.length > 0;

  const byQuadrant = QUADRANT_ORDER.map((quadrant) => ({
    quadrant,
    points: courses.filter((c) => c.quadrant === quadrant),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue vs. Engagement Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">
          Each course plotted by completion rate (x-axis) and revenue (y-axis), split into quadrants at the platform
          median for each ({medianCompletionRate}% completion, {medianRevenue.toLocaleString()} revenue).
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No courses with revenue or engagement data in this range.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                type="number"
                dataKey="completionRate"
                name="Completion Rate"
                unit="%"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <YAxis
                type="number"
                dataKey="revenue"
                name="Revenue"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <ReferenceLine x={medianCompletionRate} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
              <ReferenceLine y={medianRevenue} stroke="var(--color-muted-foreground)" strokeDasharray="4 4" />
              <Tooltip content={<MatrixTooltip />} cursor={{ strokeDasharray: "3 3" }} />
              <Legend
                formatter={(_value, entry) => {
                  const quadrant = (entry as { payload?: { quadrant?: RevenueEngagementQuadrant } }).payload?.quadrant;
                  return quadrant ? REVENUE_ENGAGEMENT_QUADRANT_LABELS[quadrant] : "";
                }}
              />
              {byQuadrant.map(({ quadrant, points }) => (
                <Scatter
                  key={quadrant}
                  name={REVENUE_ENGAGEMENT_QUADRANT_LABELS[quadrant]}
                  data={points}
                  fill={QUADRANT_COLORS[quadrant]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function MatrixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RevenueEngagementCourseRow }[];
}) {
  if (!active || !payload?.length) return null;
  const course = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-1 font-medium text-foreground">{course.title}</p>
      <p className="text-muted-foreground">Revenue: {course.revenue.toLocaleString()}</p>
      <p className="text-muted-foreground">Completion rate: {course.completionRate}%</p>
      <p className="text-muted-foreground">{REVENUE_ENGAGEMENT_QUADRANT_LABELS[course.quadrant]}</p>
    </div>
  );
}
