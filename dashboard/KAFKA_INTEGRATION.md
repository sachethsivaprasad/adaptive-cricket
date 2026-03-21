
# Kafka Integration Guide

**Kafka integration is implemented.** The dashboard fetches from Flask's `/api/telemetry` endpoint, which consumes from the `cricket_telemetry` topic.

## Current Data Flow

- **Flask** runs a background Kafka consumer, stores messages in a buffer
- **GET /api/telemetry** returns the buffer
- **Dashboard** fetches from that endpoint; falls back to sample data if API is down

## Payload Shape (from FastAPI)

Matches `CricketTelemetry` in `lib/types.ts`:

```json
{
  "timestamp": 1234567890.123,
  "outcome": "hit" | "miss",
  "parameters": {
    "speed_kph": 135.5,
    "target_length": 5.2,
    "target_line": 0.3,
    "spin_rpm": 1500,
    "swing_angle": -2.1
  }
}
```

## Start Services

```bash
# 1. Start Kafka + Postgres (via Docker)
docker-compose up -d zookeeper kafka db

# 2. Start FastAPI (simulation-only: produces to Kafka, serves WebSocket)
cd backend/fastapi
uvicorn main:app --reload --port 8000

# 3. Start Flask (consumes from Kafka, serves dashboard telemetry API)
cd backend/flask
python app.py

# 4. (Optional) Seed sample data if not running Unity
cd backend && python seed_kafka.py

# 5. Start Dashboard
cd dashboard && npm run dev
```

Open http://localhost:3000. The header shows "Live (Kafka)" when connected.

**PostgreSQL (optional):** If `db` is running, telemetry is saved to `ball_telemetry` table. Use `GET /api/telemetry/history` for persistent history.
