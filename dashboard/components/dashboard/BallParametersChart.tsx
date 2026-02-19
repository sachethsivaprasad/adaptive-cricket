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

export function BallParametersChart({
  telemetry,
}: {
  telemetry: CricketTelemetry[];
}) {
  const data = computeAverages(telemetry);

  return (
    <div className="rounded-xl border border-cricket-gold/20 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-cricket-green">
        Ball Parameters: Hit vs Miss
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#0d4d2b40" />
            <PolarAngleAxis dataKey="subject" stroke="#0d4d2b" fontSize={11} />
            <PolarRadiusAxis stroke="#0d4d2b" fontSize={10} />
            <Radar
              name="When Hit"
              dataKey="hit"
              stroke="#c9a227"
              fill="#c9a227"
              fillOpacity={0.4}
            />
            <Radar
              name="When Missed"
              dataKey="miss"
              stroke="#0d4d2b"
              fill="#0d4d2b"
              fillOpacity={0.3}
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
