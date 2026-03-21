/**
 * Cricket telemetry types - matches Kafka payload from FastAPI
 * Topic: cricket_telemetry
 */
export type BallOutcome = "hit" | "miss";

export interface BallParameters {
  speed_kph: number;      // 100-160
  target_length: number;  // 0-10
  target_line: number;    // -1 to 1
  spin_rpm: number;       // 0-3000
  swing_angle: number;    // -10 to 10
}

export interface CricketTelemetry {
  timestamp: number;
  outcome: BallOutcome;
  parameters: BallParameters;
}

export interface SessionStats {
  totalBalls: number;
  hits: number;
  misses: number;
  hitRate: number;
  missRate: number;
}

export interface PersonaCommandPayload {
  id: string;
  name?: string;
  ball: BallParameters;
}

export interface FastapiStateSnapshot {
  type?: "state";
  mode: "rl" | "manual" | "persona";
  manual_ball?: BallParameters | null;
  persona_id?: string | null;
  persona_ball?: BallParameters | null;
  last_ball_params?: BallParameters | null;
  connections?: { unity: number; flask: number };
}

export interface FastapiControlState {
  bridge_connected: boolean;
  bridge_last_error: string | null;
  fastapi_state: FastapiStateSnapshot;
}
