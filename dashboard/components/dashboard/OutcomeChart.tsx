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

export function OutcomeChart({ telemetry }: { telemetry: CricketTelemetry[] }) {
  const data = aggregateByOutcome(telemetry);

  return (
    <div className="rounded-xl border border-cricket-gold/20 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-cricket-green">
        Hit vs Miss Over Time
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#0d4d2b20" />
            <XAxis dataKey="time" stroke="#0d4d2b" fontSize={12} />
            <YAxis stroke="#0d4d2b" fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="hits" fill="#c9a227" name="Hits" radius={[4, 4, 0, 0]} />
            <Bar dataKey="misses" fill="#0d4d2b" name="Misses" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
