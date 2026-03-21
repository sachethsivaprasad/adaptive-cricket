from flask import Flask, jsonify, request
from flask_cors import CORS
from kafka import KafkaConsumer
import threading
import json
import asyncio
import queue
import websockets

# --- CONFIGURATION ---
KAFKA_TOPIC = "cricket_telemetry"
KAFKA_SERVER = "localhost:9092"
TELEMETRY_BUFFER_MAX = 500
FASTAPI_WS_URL = "ws://localhost:8000/ws/game?client=flask"

DB_URL = "postgresql://admin:password123@localhost:5432/cricket_stats"


# In-memory buffer (for fast dashboard reads)
telemetry_buffer: list = []
buffer_lock = threading.Lock()

# PostgreSQL (optional)
_db_conn = None
_db_ready = False
_db_lock = threading.Lock()

# Bridge state (Flask <-> FastAPI websocket)
_bridge_connected = False
_bridge_last_error = None
_bridge_last_state: dict = {"mode": "rl"}
_bridge_lock = threading.Lock()
_bridge_outbox: "queue.Queue[dict]" = queue.Queue()


def _init_db():
    """Create telemetry table if not exists."""
    global _db_conn, _db_ready
    try:
        import psycopg2

        _db_conn = psycopg2.connect(DB_URL)
        with _db_conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ball_telemetry (
                    id SERIAL PRIMARY KEY,
                    ts TIMESTAMPTZ DEFAULT NOW(),
                    timestamp_unix DOUBLE PRECISION,
                    outcome VARCHAR(10),
                    speed_kph DOUBLE PRECISION,
                    target_length DOUBLE PRECISION,
                    target_line DOUBLE PRECISION,
                    spin_rpm DOUBLE PRECISION,
                    swing_angle DOUBLE PRECISION
                )
                """
            )
            _db_conn.commit()
        _db_ready = True
        print("✅ Flask: connected to PostgreSQL")
    except Exception as e:
        print(f"⚠️ Flask: PostgreSQL not available: {e}. Telemetry will not be persisted.")


def _save_telemetry_to_db(data: dict):
    if not _db_ready or not _db_conn:
        return
    try:
        p = data.get("parameters", {})
        with _db_lock:
            with _db_conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ball_telemetry (
                        timestamp_unix, outcome, speed_kph, target_length, target_line, spin_rpm, swing_angle
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        data.get("timestamp"),
                        data.get("outcome"),
                        p.get("speed_kph"),
                        p.get("target_length"),
                        p.get("target_line"),
                        p.get("spin_rpm"),
                        p.get("swing_angle"),
                    ),
                )
                _db_conn.commit()
    except Exception as e:
        print(f"⚠️ Flask: DB write error: {e}")


def _kafka_consumer_loop():
    """Background worker: consume Kafka and serve from in-memory buffer."""
    global telemetry_buffer
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=[KAFKA_SERVER],
            auto_offset_reset="earliest",
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        )
        print(f"📥 Flask: Kafka consumer started on '{KAFKA_TOPIC}'")
        for msg in consumer:
            val = msg.value
            _save_telemetry_to_db(val)
            with buffer_lock:
                telemetry_buffer.append(val)
                if len(telemetry_buffer) > TELEMETRY_BUFFER_MAX:
                    telemetry_buffer = telemetry_buffer[-TELEMETRY_BUFFER_MAX:]
    except Exception as e:
        print(f"❌ Flask: Kafka consumer error: {e}")


async def _bridge_sender(ws):
    """Flush outbound command messages from Flask API to FastAPI websocket."""
    while True:
        payload = await asyncio.to_thread(_bridge_outbox.get)
        await ws.send(json.dumps(payload))


async def _bridge_receiver(ws):
    """Receive state/ack events from FastAPI."""
    global _bridge_last_state
    async for raw in ws:
        try:
            msg = json.loads(raw)
        except json.JSONDecodeError:
            continue

        if isinstance(msg, dict) and msg.get("type") == "state":
            with _bridge_lock:
                _bridge_last_state = msg


async def _bridge_loop():
    """Persistent websocket client connection to FastAPI with reconnect."""
    global _bridge_connected, _bridge_last_error
    backoff = 1
    while True:
        try:
            async with websockets.connect(FASTAPI_WS_URL, ping_interval=20, ping_timeout=20) as ws:
                with _bridge_lock:
                    _bridge_connected = True
                    _bridge_last_error = None
                print("🔌 Flask bridge connected to FastAPI")

                sender = asyncio.create_task(_bridge_sender(ws))
                receiver = asyncio.create_task(_bridge_receiver(ws))
                done, pending = await asyncio.wait(
                    [sender, receiver],
                    return_when=asyncio.FIRST_EXCEPTION,
                )
                for task in pending:
                    task.cancel()
                for task in done:
                    exc = task.exception()
                    if exc:
                        raise exc
        except Exception as e:
            with _bridge_lock:
                _bridge_connected = False
                _bridge_last_error = str(e)
            print(f"⚠️ Flask bridge disconnected: {e}")
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 10)


def _start_bridge_thread():
    def runner():
        asyncio.run(_bridge_loop())
    t = threading.Thread(target=runner, daemon=True)
    t.start()


def _enqueue_command(payload: dict):
    _bridge_outbox.put(payload)


def create_app() -> Flask:
    app = Flask(__name__)

    CORS(
        app,
        resources={r"/api/*": {"origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ]}},
        supports_credentials=True,
    )

    @app.get("/api/telemetry")
    def get_telemetry():
        with buffer_lock:
            return jsonify(list(telemetry_buffer))

    @app.get("/api/telemetry/history")
    def get_telemetry_history():
        limit = request.args.get("limit", default=500, type=int)

        if not _db_ready or not _db_conn:
            return jsonify([])

        try:
            with _db_lock:
                with _db_conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT timestamp_unix, outcome, speed_kph, target_length, target_line, spin_rpm, swing_angle
                        FROM ball_telemetry ORDER BY id DESC LIMIT %s
                        """,
                        (limit,),
                    )
                    rows = cur.fetchall()

            return jsonify(
                [
                    {
                        "timestamp": r[0],
                        "outcome": r[1],
                        "parameters": {
                            "speed_kph": r[2],
                            "target_length": r[3],
                            "target_line": r[4],
                            "spin_rpm": r[5],
                            "swing_angle": r[6],
                        },
                    }
                    for r in reversed(rows)
                ]
            )
        except Exception as e:
            print(f"⚠️ Flask: DB read error: {e}")
            return jsonify([])

    @app.get("/api/control/state")
    def control_state():
        with _bridge_lock:
            return jsonify(
                {
                    "bridge_connected": _bridge_connected,
                    "bridge_last_error": _bridge_last_error,
                    "fastapi_state": _bridge_last_state,
                }
            )

    @app.post("/api/control/mode")
    def control_mode():
        body = request.get_json(silent=True) or {}
        mode = body.get("mode")
        if mode not in ["rl", "manual", "persona"]:
            return jsonify({"ok": False, "error": "mode must be rl|manual|persona"}), 400
        _enqueue_command({"type": "command", "command": "mode_set", "mode": mode})
        return jsonify({"ok": True, "queued": True})

    @app.post("/api/control/manual")
    def control_manual():
        body = request.get_json(silent=True) or {}
        enabled = bool(body.get("enabled", True))
        ball = body.get("ball")
        if enabled and not isinstance(ball, dict):
            return jsonify({"ok": False, "error": "ball payload is required when enabled=true"}), 400

        payload = {"type": "command", "command": "manual_override", "enabled": enabled}
        if isinstance(ball, dict):
            payload["ball"] = ball

        _enqueue_command(payload)
        return jsonify({"ok": True, "queued": True})

    @app.post("/api/control/persona")
    def control_persona():
        body = request.get_json(silent=True) or {}
        persona = body.get("persona")
        if not isinstance(persona, dict):
            return jsonify({"ok": False, "error": "persona object is required"}), 400
        if not persona.get("id") or not isinstance(persona.get("ball"), dict):
            return jsonify({"ok": False, "error": "persona.id and persona.ball are required"}), 400

        _enqueue_command({"type": "command", "command": "persona_select", "persona": persona})
        return jsonify({"ok": True, "queued": True})

    return app


if __name__ == "__main__":
    # Start background Kafka consumer + optional DB persistence.
    _init_db()
    t = threading.Thread(target=_kafka_consumer_loop, daemon=True)
    t.start()
    _start_bridge_thread()

    app = create_app()
    # Expose dashboard API on a different port than FastAPI (WebSocket).
    app.run(host="0.0.0.0", port=8001, debug=True)

