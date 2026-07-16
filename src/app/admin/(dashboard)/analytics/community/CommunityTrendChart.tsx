"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommunityTrendPoint } from "@/lib/analytics/community-analytics";

export default function CommunityTrendChart({ points }: { points: CommunityTrendPoint[] }) {
  const hasData = points.some((p) => p.posts + p.replies > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Community Activity Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No community activity in this range.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="posts" name="Posts" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="replies" name="Replies" stroke="var(--color-success)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="participants" name="Unique participants" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
