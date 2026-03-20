import type { CricketTelemetry } from "./types";

/**
 * Sample cricket telemetry - mirrors Kafka cricket_telemetry payload.
 * Replace getTelemetryStream() with Kafka consumer when integrating.
 */
export function generateSampleTelemetry(): CricketTelemetry[] {
  const baseTime = Date.now() / 1000 - 3600; // 1 hour ago
  const outcomes: ("hit" | "miss")[] = ["hit", "miss", "hit", "miss", "hit", "hit", "miss", "hit", "miss", "miss"];
  
  return Array.from({ length: 48 }, (_, i) => {
    const outcome = outcomes[i % outcomes.length];
    return {
      timestamp: baseTime + i * 75,
      outcome,
      parameters: {
        speed_kph: 110 + Math.random() * 45,
        target_length: Math.random() * 8 + 1,
        target_line: (Math.random() - 0.5) * 2,
        spin_rpm: Math.random() * 2500 + 200,
        swing_angle: (Math.random() - 0.5) * 16,
      },
    } satisfies CricketTelemetry;
  });
}

export const SAMPLE_TELEMETRY = generateSampleTelemetry();
