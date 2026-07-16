"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { XP_CATEGORIES } from "@/lib/analytics/definitions";
import type { XpTrendPoint } from "@/lib/analytics/gamification-analytics";

const CATEGORY_COLORS: Record<(typeof XP_CATEGORIES)[number], string> = {
  "Learning Progress": "var(--color-primary)",
  Quizzes: "var(--color-success)",
  Community: "var(--color-info)",
  Achievements: "var(--color-warning)",
  Other: "var(--color-muted-foreground)",
};

export default function XpTrendChart({ points }: { points: XpTrendPoint[] }) {
  const hasData = points.some((p) => XP_CATEGORIES.some((c) => p[c] > 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>XP Awarded Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No XP awarded in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {XP_CATEGORIES.map((c) => (
                <Bar key={c} dataKey={c} name={c} stackId="a" fill={CATEGORY_COLORS[c]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
