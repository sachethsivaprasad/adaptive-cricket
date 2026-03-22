import type { CricketTelemetry } from "@/lib/types";

export function RecentBallsTable({ telemetry }: { telemetry: CricketTelemetry[] }) {
  const recent = [...telemetry].slice(-15).reverse();

  return (
    <div className="dashboard-card overflow-hidden">
      <div className="border-b border-slate-200/80 bg-slate-50/80 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Recent Balls</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Speed (kph)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Length
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Line
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Spin (rpm)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Swing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {recent.map((row, i) => (
              <tr key={i} className="transition hover:bg-slate-50/80">
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {new Date(row.timestamp * 1000).toLocaleTimeString()}
                </td>
                <td className="whitespace-nowrap px-6 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.outcome === "hit"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {row.outcome.toUpperCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {row.parameters.speed_kph.toFixed(1)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {row.parameters.target_length.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {row.parameters.target_line.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {Math.round(row.parameters.spin_rpm)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">
                  {row.parameters.swing_angle.toFixed(1)}°
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
