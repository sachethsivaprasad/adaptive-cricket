from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import NoBrokersAvailable
import json
import numpy as np
import time
import threading
from contextlib import asynccontextmanager
from sb3_contrib import RecurrentPPO

# --- CONFIGURATION ---
KAFKA_TOPIC = "cricket_telemetry"
KAFKA_SERVER = "localhost:9092"
TELEMETRY_BUFFER_MAX = 500  # Max messages to keep in memory
DB_URL = "postgresql://admin:password123@localhost:5432/cricket_stats"

# In-memory buffer of telemetry from Kafka (consumed in background)
telemetry_buffer: list = []
buffer_lock = threading.Lock()

# PostgreSQL connection (optional - works without DB)
_db_conn = None
_db_ready = False
_db_lock = threading.Lock()


def _init_db():
    """Create telemetry table if not exists."""
    global _db_conn, _db_ready
    try:
        import psycopg2
        _db_conn = psycopg2.connect(DB_URL)
        with _db_conn.cursor() as cur:
            cur.execute("""
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
            """)
            _db_conn.commit()
        _db_ready = True
        print(f"✅ Connected to PostgreSQL")
    except Exception as e:
        print(f"⚠️ PostgreSQL not available: {e}. Telemetry will not be persisted.")


def _save_telemetry_to_db(data: dict):
    """Save one telemetry record to PostgreSQL."""
    if not _db_ready or not _db_conn:
        return
    try:
        import psycopg2
        p = data.get("parameters", {})
        with _db_lock:
            with _db_conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO ball_telemetry (timestamp_unix, outcome, speed_kph, target_length, target_line, spin_rpm, swing_angle)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
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
        print(f"⚠️ DB write error: {e}")


def _kafka_consumer_loop():
    """Background thread: consume from Kafka and append to buffer."""
    global telemetry_buffer
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=[KAFKA_SERVER],
            auto_offset_reset="earliest",
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        )
        print(f"📥 Kafka consumer started on topic '{KAFKA_TOPIC}'")
        for msg in consumer:
            val = msg.value
            _save_telemetry_to_db(val)
            with buffer_lock:
                telemetry_buffer.append(val)
                if len(telemetry_buffer) > TELEMETRY_BUFFER_MAX:
                    telemetry_buffer = telemetry_buffer[-TELEMETRY_BUFFER_MAX:]
    except Exception as e:
        print(f"❌ Kafka consumer error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start Kafka consumer thread and init DB on startup."""
    _init_db()
    t = threading.Thread(target=_kafka_consumer_loop, daemon=True)
    t.start()
    yield


app = FastAPI(lifespan=lifespan)

# CORS for dashboard (localhost:3000, 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize AI Model
try:
    model = RecurrentPPO.load("cricket_hit_miss_model.zip")
    print("🧠 AI Model Loaded Successfully")
except Exception as e:
    print(f"⚠️ Error loading AI Model: {e}")

# 2. Initialize Kafka Producer (Safe Connection)
producer = None
try:
    producer = KafkaProducer(
        bootstrap_servers=[KAFKA_SERVER],
        value_serializer=lambda x: json.dumps(x).encode('utf-8')  # Auto-convert dict to JSON
    )
    print(f"✅ Connected to Kafka at {KAFKA_SERVER}")
except NoBrokersAvailable:
    print(f"❌ WARNING: Kafka not found at {KAFKA_SERVER}. Data will NOT be saved.")

# --- HELPER FUNCTIONS ---
def decode_action(act):
    """Converts AI normalized values (-1..1) to Real Cricket Units"""
    return {
        "speed_kph": float(np.interp(act[0], [-1, 1], [80, 100])),
        "target_length": float(np.interp(act[1], [-1, 1], [0, 10])),
        "target_line": float(np.interp(act[2], [-1, 1], [-1, 1])),
        "spin_rpm": float(np.interp(act[3], [-1, 1], [0, 100])),
        "swing_angle": float(np.interp(act[4], [-1, 1], [-40, 40]))
    }

def send_to_kafka(ball_params, result):
    """Fire-and-forget data streaming"""
    if producer:
        payload = {
            "timestamp": time.time(),
            "outcome": result,      # "hit" or "miss"
            "parameters": ball_params # The physics data
        }
        producer.send(KAFKA_TOPIC, value=payload)
        # print(f"📡 Sent to Kafka: {result}") # Uncomment for debugging


# --- REST API (for Dashboard) ---
@app.get("/api/telemetry")
def get_telemetry():
    """Return telemetry consumed from Kafka. Dashboard calls this."""
    with buffer_lock:
        return list(telemetry_buffer)


@app.get("/api/telemetry/history")
def get_telemetry_history(limit: int = 500):
    """Return telemetry from PostgreSQL (persistent history). Requires DB running."""
    if not _db_ready or not _db_conn:
        return []
    try:
        import psycopg2
        with _db_lock:
            with _db_conn.cursor() as cur:
                cur.execute("""
                    SELECT timestamp_unix, outcome, speed_kph, target_length, target_line, spin_rpm, swing_angle
                    FROM ball_telemetry ORDER BY id DESC LIMIT %s
                """, (limit,))
                rows = cur.fetchall()
        return [
            {
                "timestamp": r[0],
                "outcome": r[1],
                "parameters": {
                    "speed_kph": r[2], "target_length": r[3], "target_line": r[4],
                    "spin_rpm": r[5], "swing_angle": r[6],
                },
            }
            for r in reversed(rows)
        ]
    except Exception as e:
        print(f"⚠️ DB read error: {e}")
        return []


# --- WEBSOCKET SERVER ---
@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Unity Connected & Waiting")
    
    lstm_states = None
    episode_starts = np.ones((1,), dtype=bool)
    last_action = np.zeros(5) # Stores the ball we JUST threw

    try:
        while True:
            # 1. Wait for User Feedback
            response = await websocket.receive_text()
            data = json.loads(response)
            user_result = data.get("result") # "start", "hit", or "miss"

            # 2. LOGIC: If this is feedback (Hit/Miss), save the PREVIOUS ball to Kafka
            if user_result in ["hit", "miss"]:
                # We save 'last_action' because that was the ball the user just played
                real_params = decode_action(last_action)
                send_to_kafka(real_params, user_result)
                
                print(f"📥 Feedback: {user_result.upper()} | Saved to Kafka")
                
                # Update AI Observation
                outcome_val = 1.0 if user_result == "miss" else -1.0
                obs = np.concatenate((last_action, [outcome_val])).reshape(1, -1)

            elif user_result == "start":
                print("🎮 Game Start")
                obs = np.zeros((1, 6)) # Neutral start
            
            # 3. Predict NEXT Ball
            action, lstm_states = model.predict(obs, state=lstm_states, episode_start=episode_starts)
            last_action = action[0] # Store this so we can log it NEXT turn
            episode_starts = np.zeros((1,), dtype=bool)

            # 4. Send to Unity
            ball_data = decode_action(last_action)
            await websocket.send_text(json.dumps(ball_data))

    except WebSocketDisconnect:
        print("❌ Unity Disconnected")