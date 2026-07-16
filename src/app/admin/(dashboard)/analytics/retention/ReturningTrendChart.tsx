"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReturningTrendPoint } from "@/lib/analytics/returning";

export default function ReturningTrendChart({ points }: { points: ReturningTrendPoint[] }) {
  const hasData = points.some((p) => p.new + p.returning + p.resurrected > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>New, Returning &amp; Resurrected Learners</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No learner activity in this range yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="new" name="New" stackId="a" fill="var(--color-primary)" />
              <Bar dataKey="returning" name="Returning" stackId="a" fill="var(--color-success)" />
              <Bar dataKey="resurrected" name="Resurrected" stackId="a" fill="var(--color-warning)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
