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
      <div className="rounded-xl border border-cricket-gold/20 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-cricket-green">
          Weakness Analysis
        </h2>
        <p className="mt-2 text-sm text-cricket-green/70">
          Play at least 6 balls (3 hits, 3 misses) to see weakness indicators.
        </p>
      </div>
    );
  }

  const weaknesses = indicators.filter((i) => i.weakness);

  return (
    <div className="rounded-xl border border-cricket-gold/20 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-cricket-green">
        Weakness Analysis
      </h2>
      <p className="mt-1 text-sm text-cricket-green/70">
        Ball types that tend to cause more misses than hits
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {weaknesses.length > 0 ? (
          weaknesses.map((w) => (
            <div
              key={w.param}
              className="rounded-lg border border-cricket-gold/30 bg-cricket-cream/50 px-4 py-2"
            >
              <span className="font-medium text-cricket-green">{w.label}</span>
              <span className="ml-2 text-sm text-cricket-green/70">
                (Miss avg: {typeof w.missAvg === "number" && w.param.includes("rpm") ? Math.round(w.missAvg) : w.missAvg.toFixed(1)} vs Hit: {typeof w.hitAvg === "number" && w.param.includes("rpm") ? Math.round(w.hitAvg) : w.hitAvg.toFixed(1)})
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-cricket-green/70">
            Not enough difference yet. Keep playing to uncover weaknesses.
          </p>
        )}
      </div>
      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-cricket-green/70 hover:text-cricket-green">
          View all parameter comparisons
        </summary>
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Parameter</th>
              <th className="text-right">Avg when Missed</th>
              <th className="text-right">Avg when Hit</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((i) => (
              <tr key={i.param}>
                <td>{i.label}</td>
                <td className="text-right">{i.param.includes("rpm") ? Math.round(i.missAvg) : i.missAvg.toFixed(2)}</td>
                <td className="text-right">{i.param.includes("rpm") ? Math.round(i.hitAvg) : i.hitAvg.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
