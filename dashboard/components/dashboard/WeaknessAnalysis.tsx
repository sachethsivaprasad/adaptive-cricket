import type { CricketTelemetry } from "@/lib/types";

function computeWeaknessIndicators(telemetry: CricketTelemetry[]) {
  const misses = telemetry.filter((t) => t.outcome === "miss");
  const hits = telemetry.filter((t) => t.outcome === "hit");
  if (misses.length < 3 || hits.length < 3) return null;

  const avg = (arr: CricketTelemetry[], key: keyof CricketTelemetry["parameters"]) => {
    const vals = arr.map((t) => t.parameters[key] as number);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const params = ["speed_kph", "target_length", "target_line", "spin_rpm", "swing_angle"] as const;
  const labels: Record<string, string> = {
    speed_kph: "Higher speed",
    target_length: "Fuller length",
    target_line: "Off stump",
    spin_rpm: "More spin",
    swing_angle: "Swing",
  };

  const indicators: { param: string; label: string; missAvg: number; hitAvg: number; weakness: boolean }[] = [];
  for (const p of params) {
    const missAvg = avg(misses, p);
    const hitAvg = avg(hits, p);
    const diff = missAvg - hitAvg;
    const weakness = Math.abs(diff) > 0.05 * (hitAvg || 1);
    indicators.push({
      param: p,
      label: labels[p],
      missAvg,
      hitAvg,
      weakness,
    });
  }
  return indicators;
}

export function WeaknessAnalysis({ telemetry }: { telemetry: CricketTelemetry[] }) {
  const indicators = computeWeaknessIndicators(telemetry);
  if (!indicators) {
    return (
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-slate-900">Weakness Analysis</h2>
        <p className="mt-2 text-sm text-slate-500">
          Play at least 6 balls (3 hits, 3 misses) to see weakness indicators.
        </p>
      </div>
    );
  }

  const weaknesses = indicators.filter((i) => i.weakness);

  return (
    <div className="dashboard-card p-6">
      <h2 className="text-lg font-semibold text-slate-900">Weakness Analysis</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ball types that tend to cause more misses than hits
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {weaknesses.length > 0 ? (
          weaknesses.map((w) => (
            <span
              key={w.param}
              className="inline-flex max-w-full items-center rounded-full bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700 shadow-sm"
            >
              <span className="truncate">{w.label}</span>
              <span className="ml-2 shrink-0 text-xs font-normal text-red-600/90">
                (Miss avg:{" "}
                {typeof w.missAvg === "number" && w.param.includes("rpm")
                  ? Math.round(w.missAvg)
                  : w.missAvg.toFixed(1)}{" "}
                vs Hit:{" "}
                {typeof w.hitAvg === "number" && w.param.includes("rpm")
                  ? Math.round(w.hitAvg)
                  : w.hitAvg.toFixed(1)}
                )
              </span>
            </span>
          ))
        ) : (
          <span className="inline-flex rounded-full bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700">
            Not enough difference yet — keep playing to uncover weaknesses.
          </span>
        )}
      </div>
      <details className="group mt-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-violet-600 transition hover:bg-slate-50 hover:text-violet-700 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1">
            View detailed breakdown
            <span className="text-violet-400 transition group-open:rotate-180">▾</span>
          </span>
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-2">
          <table className="w-full text-sm text-slate-700">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Parameter
                </th>
                <th className="pb-2 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Avg when Missed
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Avg when Hit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {indicators.map((i) => (
                <tr key={i.param} className="hover:bg-white/80">
                  <td className="py-2.5 pr-4">
                    <span
                      className={
                        i.weakness
                          ? "inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700"
                          : "inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700"
                      }
                    >
                      {i.label}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-slate-600">
                    {i.param.includes("rpm") ? Math.round(i.missAvg) : i.missAvg.toFixed(2)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-slate-600">
                    {i.param.includes("rpm") ? Math.round(i.hitAvg) : i.hitAvg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
