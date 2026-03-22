"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { CricketTelemetry } from "@/lib/types";

function aggregateByOutcome(telemetry: CricketTelemetry[]) {
  const buckets: Record<string, { hit: number; miss: number }> = {};
  const BUCKET_SIZE = 5;
  telemetry.forEach((t) => {
    const idx = Math.floor(t.timestamp / BUCKET_SIZE) * BUCKET_SIZE;
    const key = new Date(idx * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (!buckets[key]) buckets[key] = { hit: 0, miss: 0 };
    buckets[key][t.outcome]++;
  });
  return Object.entries(buckets).map(([time, data]) => ({
    time,
    hits: data.hit,
    misses: data.miss,
  }));
}

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 2px 8px rgb(0 0 0 / 0.08)",
};

export function OutcomeChart({ telemetry }: { telemetry: CricketTelemetry[] }) {
  const data = aggregateByOutcome(telemetry);

  return (
    <div className="dashboard-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Hit vs Miss Over Time</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f1f5f9"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
            <Bar dataKey="hits" fill="#8b5cf6" name="Hits" radius={[6, 6, 0, 0]} />
            <Bar dataKey="misses" fill="#e2e8f0" name="Misses" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
