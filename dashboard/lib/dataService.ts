import type {
  BallParameters,
  CricketTelemetry,
  SessionStats,
  FastapiControlState,
  PersonaCommandPayload,
} from "./types";
import { SAMPLE_TELEMETRY } from "./sampleData";

// Dashboard telemetry is now served by Flask (FastAPI is simulation-only).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/**
 * Fetch telemetry from Flask API (Kafka consumer). Falls back to sample data if API unreachable.
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

export async function getControlState(): Promise<FastapiControlState | null> {
  try {
    const res = await fetch(`${API_URL}/api/control/state`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("control state unavailable");
    return (await res.json()) as FastapiControlState;
  } catch {
    return null;
  }
}

export async function setControlMode(mode: "rl" | "manual" | "persona"): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/control/mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
  return res.ok;
}

export async function sendManualOverride(enabled: boolean, ball?: BallParameters): Promise<boolean> {
  const payload: { enabled: boolean; ball?: BallParameters } = { enabled };
  if (ball) payload.ball = ball;
  const res = await fetch(`${API_URL}/api/control/manual`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function sendPersonaSelection(persona: PersonaCommandPayload): Promise<boolean> {
  const res = await fetch(`${API_URL}/api/control/persona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ persona }),
  });
  return res.ok;
}
