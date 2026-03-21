import { getTelemetry, computeStats } from "@/lib/dataService";
import {
  OutcomeChart,
  StatsCards,
  BallParametersChart,
  RecentBallsTable,
  WeaknessAnalysis,
  ControlPanel,
} from "@/components/dashboard";
import { AutoRefresh } from "@/components/AutoRefresh";

export default async function DashboardPage() {
  const { data: telemetry, source } = await getTelemetry();
  const stats = computeStats(telemetry);

  return (
    <div className="min-h-screen">
      <header className="border-b border-cricket-gold/30 bg-cricket-green text-cricket-cream">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight">
            🏏 Adaptive Cricket Dashboard
          </h1>
          <p className="mt-1 text-sm text-cricket-cream/80">
            Analytics and performance visualization •
            {source === "kafka" ? (
              <span className="text-green-300"> Live (Kafka)</span>
            ) : (
              <span> Sample data (start Kafka + FastAPI for live)</span>
            )}
            <AutoRefresh />
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <StatsCards stats={stats} />
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <OutcomeChart telemetry={telemetry} />
          <BallParametersChart telemetry={telemetry} />
        </div>
        <div className="mt-8">
          <WeaknessAnalysis telemetry={telemetry} />
        </div>
        <div className="mt-8">
          <ControlPanel />
        </div>
        <div className="mt-8">
          <RecentBallsTable telemetry={telemetry} />
        </div>
      </main>
    </div>
  );
}
