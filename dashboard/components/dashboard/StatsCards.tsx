import type { SessionStats } from "@/lib/types";

export function StatsCards({ stats }: { stats: SessionStats }) {
  const cards = [
    { label: "Total Balls", value: stats.totalBalls, icon: "🎯" },
    { label: "Hits", value: stats.hits, icon: "✓" },
    { label: "Misses", value: stats.misses, icon: "✗" },
    { label: "Hit Rate", value: `${stats.hitRate.toFixed(1)}%`, icon: "📊" },
    { label: "Miss Rate", value: `${stats.missRate.toFixed(1)}%`, icon: "🎯" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="dashboard-card flex flex-row items-center gap-4 p-5 transition hover:border-violet-200/60 hover:shadow-[0_2px_4px_-1px_rgb(15,23,42,0.05),0_12px_32px_-8px_rgb(91,33,182,0.08)]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg text-violet-600">
            {card.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <p className="mt-0.5 truncate text-xl font-bold text-slate-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
