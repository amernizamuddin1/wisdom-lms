"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DailyActivityPoint } from "@/lib/gamification/analytics-data";

const RANGES = [
  { key: "7", label: "7 days", days: 7 },
  { key: "30", label: "30 days", days: 30 },
  { key: "90", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function formatDateLabel(dateKey: string): string {
  const [, m, d] = dateKey.split("-");
  return `${Number(m)}/${Number(d)}`;
}

// Charts render only once there's at least a few days of data — an empty or
// single-point chart reads as broken, not informative (see Part 28's empty
// state guidance).
const MIN_POINTS_FOR_CHART = 2;

export default function AnalyticsCharts({ data }: { data: DailyActivityPoint[] }) {
  const [range, setRange] = useState<RangeKey>("30");

  const filtered = useMemo(() => {
    const option = RANGES.find((r) => r.key === range)!;
    if (option.days === null) return data;
    return data.slice(-option.days);
  }, [data, range]);

  const chartData = filtered.map((p) => ({ ...p, label: formatDateLabel(p.date) }));
  const hasEnoughData = chartData.length >= MIN_POINTS_FOR_CHART;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Learning Activity</CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <Button
              key={r.key}
              size="sm"
              variant={range === r.key ? "default" : "outline"}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!hasEnoughData ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Your learning activity will appear here as you progress through your courses.
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <ChartBlock title="Learning minutes by day">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" min" />} />
                <Line
                  type="monotone"
                  dataKey="learningMinutes"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartBlock>

            <ChartBlock title="Lessons completed">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="lessonsCompleted" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartBlock>

            <ChartBlock title="XP earned">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" XP" />} />
                <Bar dataKey="xpEarned" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartBlock>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  suffix = "",
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-sm">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">
        {payload[0].value}
        {suffix}
      </p>
    </div>
  );
}
