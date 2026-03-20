import type { CricketTelemetry, SessionStats } from "./types";
import { SAMPLE_TELEMETRY } from "./sampleData";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Fetch telemetry from FastAPI (Kafka consumer). Falls back to sample data if API unreachable.
 */
export async function getTelemetry(): Promise<{
  data: CricketTelemetry[];
  source: "kafka" | "sample";
}> {
  try {
    const res = await fetch(`${API_URL}/api/telemetry`, {
      next: { revalidate: 5 }, // Revalidate every 5 seconds for fresh Kafka data
    });
    if (!res.ok) throw new Error("API error");
    const data: CricketTelemetry[] = await res.json();
    return {
      data: Array.isArray(data) ? data : [],
      source: "kafka",
    };
  } catch {
    return { data: SAMPLE_TELEMETRY, source: "sample" };
  }
}

export function computeStats(telemetry: CricketTelemetry[]): SessionStats {
  const hits = telemetry.filter((t) => t.outcome === "hit").length;
  const misses = telemetry.filter((t) => t.outcome === "miss").length;
  const total = telemetry.length;
  return {
    totalBalls: total,
    hits,
    misses,
    hitRate: total > 0 ? (hits / total) * 100 : 0,
    missRate: total > 0 ? (misses / total) * 100 : 0,
  };
}
