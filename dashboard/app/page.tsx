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
    <div className="min-h-screen bg-slate-100 bg-[radial-gradient(ellipse_120%_65%_at_50%_-8%,rgb(245,243,255),rgb(241,245,249))] pb-12">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Adaptive Cricket Dashboard
          </h1>
          <p className="mt-2 text-sm text-white/90">
            Analytics and performance visualization •
            {source === "kafka" ? (
              <span className="text-emerald-200"> Live (Kafka)</span>
            ) : (
              <span className="text-white/80"> Sample data (start Kafka + FastAPI for live)</span>
            )}
            <AutoRefresh />
          </p>
        </header>
      </div>

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
