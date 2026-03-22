"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { CricketTelemetry } from "@/lib/types";

function computeAverages(telemetry: CricketTelemetry[]) {
  const hits = telemetry.filter((t) => t.outcome === "hit");
  const misses = telemetry.filter((t) => t.outcome === "miss");

  const avg = (arr: CricketTelemetry[], key: keyof CricketTelemetry["parameters"]) => {
    const vals = arr.map((t) => t.parameters[key] as number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };

  const keys = ["speed_kph", "target_length", "target_line", "spin_rpm", "swing_angle"] as const;
  const labels: Record<string, string> = {
    speed_kph: "Speed (kph)",
    target_length: "Length",
    target_line: "Line",
    spin_rpm: "Spin (rpm)",
    swing_angle: "Swing",
  };

  return keys.map((k) => ({
    subject: labels[k],
    hit: Math.round(avg(hits, k) * 10) / 10,
    miss: Math.round(avg(misses, k) * 10) / 10,
  }));
}

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 2px 8px rgb(0 0 0 / 0.08)",
};

export function BallParametersChart({
  telemetry,
}: {
  telemetry: CricketTelemetry[];
}) {
  const data = computeAverages(telemetry);

  return (
    <div className="dashboard-card p-6">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Ball Parameters: Hit vs Miss</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <PolarRadiusAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Radar
              name="When Hit"
              dataKey="hit"
              stroke="#7c3aed"
              fill="#7c3aed"
              fillOpacity={0.35}
            />
            <Radar
              name="When Missed"
              dataKey="miss"
              stroke="#94a3b8"
              fill="#cbd5e1"
              fillOpacity={0.2}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
            <Tooltip contentStyle={tooltipStyle} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
