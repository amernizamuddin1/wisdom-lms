"use client";

import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { RevenueGranularity, RevenueTrendPoint } from "@/lib/analytics/commerce-revenue";

type MetricKey = "revenue" | "refunds" | "discounts";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "revenue", label: "Revenue", color: "var(--color-primary)" },
  { key: "refunds", label: "Refunds", color: "var(--color-destructive)" },
  { key: "discounts", label: "Discounts", color: "var(--color-accent)" },
];

function formatDateLabel(dateKey: string, granularity: RevenueGranularity): string {
  if (granularity === "week") return dateKey; // already "YYYY-Www"
  if (granularity === "month") {
    const [y, m] = dateKey.split("-");
    return `${Number(m)}/${y.slice(2)}`;
  }
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default function RevenueTrendChart({
  points,
  granularity,
}: {
  points: RevenueTrendPoint[];
  granularity: RevenueGranularity;
}) {
  const [active, setActive] = useState<Set<MetricKey>>(new Set(["revenue", "refunds", "discounts"]));

  const chartData = useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: formatDateLabel(p.date, granularity),
      })),
    [points, granularity],
  );

  function toggle(key: MetricKey) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const hasData = chartData.length >= 2;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Revenue Trend</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <Button
              key={m.key}
              type="button"
              size="sm"
              variant={active.has(m.key) ? "default" : "outline"}
              onClick={() => toggle(m.key)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Not enough transactions in this range to plot a trend yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium text-foreground">
          <span className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: ₹{p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}
