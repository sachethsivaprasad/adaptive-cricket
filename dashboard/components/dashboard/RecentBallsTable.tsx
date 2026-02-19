import type { CricketTelemetry } from "@/lib/types";

export function RecentBallsTable({ telemetry }: { telemetry: CricketTelemetry[] }) {
  const recent = [...telemetry].slice(-15).reverse();

  return (
    <div className="overflow-hidden rounded-xl border border-cricket-gold/20 bg-white shadow-sm">
      <div className="border-b border-cricket-gold/20 px-6 py-4">
        <h2 className="text-lg font-semibold text-cricket-green">
          Recent Balls
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-cricket-gold/20">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Speed (kph)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Length
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Line
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Spin (rpm)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-cricket-green/70">
                Swing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cricket-gold/10">
            {recent.map((row, i) => (
              <tr key={i} className="hover:bg-cricket-cream/50">
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
                  {new Date(row.timestamp * 1000).toLocaleTimeString()}
                </td>
                <td className="whitespace-nowrap px-6 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      row.outcome === "hit"
                        ? "bg-cricket-gold/20 text-cricket-gold"
                        : "bg-cricket-green/20 text-cricket-green"
                    }`}
                  >
                    {row.outcome.toUpperCase()}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
                  {row.parameters.speed_kph.toFixed(1)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
                  {row.parameters.target_length.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
                  {row.parameters.target_line.toFixed(2)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
                  {Math.round(row.parameters.spin_rpm)}
                </td>
                <td className="whitespace-nowrap px-6 py-3 text-sm text-cricket-green">
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
