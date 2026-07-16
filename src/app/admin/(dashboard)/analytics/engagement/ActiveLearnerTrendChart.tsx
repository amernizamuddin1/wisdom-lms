"use client";

import { useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActiveTrendPoint, ActiveTrendGranularity } from "@/lib/analytics/active-learner-trend";

type MetricKey = "dau" | "wau" | "mau";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "dau", label: "DAU", color: "var(--color-primary)" },
  { key: "wau", label: "WAU", color: "var(--color-success)" },
  { key: "mau", label: "MAU", color: "var(--color-accent)" },
];

export default function ActiveLearnerTrendChart({ points, granularity }: { points: ActiveTrendPoint[]; granularity: ActiveTrendGranularity }) {
  const [active, setActive] = useState<Set<MetricKey>>(new Set(["dau", "wau", "mau"]));

  function toggle(key: MetricKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasData = points.length >= 2;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Active Learner Trend</CardTitle>
          <p className="text-xs text-muted-foreground">
            {granularity === "daily" ? "Daily points" : granularity === "weekly" ? "Weekly points" : "Monthly points"}, each a trailing-window value as of that date.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <Button key={m.key} type="button" size="sm" variant={active.has(m.key) ? "default" : "outline"} onClick={() => toggle(m.key)}>
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Not enough activity in this range to plot a trend yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={points}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
              <Tooltip content={<ChartTooltip />} />
              {METRICS.filter((m) => active.has(m.key)).map((m) => (
                <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium text-foreground">
          <span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}
