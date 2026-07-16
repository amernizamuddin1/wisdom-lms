"use client";

import { Line, LineChart, ResponsiveContainer } from "recharts";

export default function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const data = values.map((v, i) => ({ i, v }));

  return (
    <div className={className} style={{ width: 72, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="v" stroke="var(--color-primary)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
