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
          className="rounded-xl border border-cricket-gold/20 bg-white p-6 shadow-sm"
        >
          <p className="text-sm font-medium text-cricket-green/70">{card.label}</p>
          <p className="mt-2 text-2xl font-bold text-cricket-green">
            {card.icon} {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
