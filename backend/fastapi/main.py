from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable
import asyncio
import json
import numpy as np
import time
from sb3_contrib import RecurrentPPO

# --- CONFIGURATION ---
KAFKA_TOPIC = "cricket_telemetry"
KAFKA_SERVER = "localhost:9092"

# FastAPI is simulation server + control router.
app = FastAPI()


class ConnectionManager:
    """Tracks active Unity and Flask websocket clients."""

    def __init__(self):
        self.unity_connections: set[WebSocket] = set()
        self.flask_connections: set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, role: str) -> None:
        await websocket.accept()
        async with self._lock:
            if role == "flask":
                self.flask_connections.add(websocket)
            else:
                self.unity_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket, role: str) -> None:
        async with self._lock:
            if role == "flask":
                self.flask_connections.discard(websocket)
            else:
                self.unity_connections.discard(websocket)

    async def send_to_unity(self, payload: dict) -> None:
        message = json.dumps(payload)
        async with self._lock:
            sockets = list(self.unity_connections)
        for ws in sockets:
            try:
                await ws.send_text(message)
            except Exception:
                pass

    async def send_to_flask(self, payload: dict) -> None:
        message = json.dumps(payload)
        async with self._lock:
            sockets = list(self.flask_connections)
        for ws in sockets:
            try:
                await ws.send_text(message)
            except Exception:
                pass

    async def counts(self) -> dict:
        async with self._lock:
            return {
                "unity": len(self.unity_connections),
                "flask": len(self.flask_connections),
            }


manager = ConnectionManager()


class GameState:
    """Shared game/control state. RL is default; manual/persona can override."""

    def __init__(self):
        self.lstm_states = None
        self.episode_starts = np.ones((1,), dtype=bool)
        self.last_action = np.zeros(5)
        self.last_ball_params: dict | None = None
        self.mode = "rl"  # rl | manual | persona
        self.manual_ball: dict | None = None
        self.persona_id: str | None = None
        self.persona_ball: dict | None = None
        self._lock = asyncio.Lock()

    async def snapshot(self) -> dict:
        async with self._lock:
            return {
                "mode": self.mode,
                "manual_ball": self.manual_ball,
                "persona_id": self.persona_id,
                "persona_ball": self.persona_ball,
                "last_ball_params": self.last_ball_params,
            }


state = GameState()


def _validate_ball_params(ball: dict) -> tuple[bool, str]:
    required = ["speed_kph", "target_length", "target_line", "spin_rpm", "swing_angle"]
    for key in required:
        if key not in ball:
            return False, f"missing field '{key}'"
        try:
            float(ball[key])
        except (TypeError, ValueError):
            return False, f"'{key}' must be numeric"
    return True, ""


# 1. Initialize AI Model
try:
    model = RecurrentPPO.load("cricket_hit_miss_model.zip")
    print("🧠 AI Model Loaded Successfully")
except Exception as e:
    print(f"⚠️ Error loading AI Model: {e}")
    model = None

# 2. Initialize Kafka Producer (Safe Connection)
producer = None
try:
    producer = KafkaProducer(
        bootstrap_servers=[KAFKA_SERVER],
        value_serializer=lambda x: json.dumps(x).encode("utf-8"),
    )
    print(f"✅ Connected to Kafka at {KAFKA_SERVER}")
except NoBrokersAvailable:
    print(f"❌ WARNING: Kafka not found at {KAFKA_SERVER}. Data will NOT be saved.")


def decode_action(act):
    """Converts AI normalized values (-1..1) to real cricket units."""
    return {
        "speed_kph": float(np.interp(act[0], [-1, 1], [80, 100])),
        "target_length": float(np.interp(act[1], [-1, 1], [0, 10])),
        "target_line": float(np.interp(act[2], [-1, 1], [-1, 1])),
        "spin_rpm": float(np.interp(act[3], [-1, 1], [0, 100])),
        "swing_angle": float(np.interp(act[4], [-1, 1], [-40, 40])),
    }


def send_to_kafka(ball_params, result):
    """Fire-and-forget data streaming."""
    if producer:
        payload = {
            "timestamp": time.time(),
            "outcome": result,
            "parameters": ball_params,
        }
        producer.send(KAFKA_TOPIC, value=payload)


async def _next_ball_from_state(obs: np.ndarray) -> dict:
    """Returns the next ball using override mode or RL."""
    async with state._lock:
        if state.mode == "manual" and state.manual_ball is not None:
            state.last_ball_params = dict(state.manual_ball)
            return dict(state.manual_ball)

        if state.mode == "persona" and state.persona_ball is not None:
            state.last_ball_params = dict(state.persona_ball)
            return dict(state.persona_ball)

        # RL fallback/default
        if model is None:
            fallback = {
                "speed_kph": 90.0,
                "target_length": 5.0,
                "target_line": 0.0,
                "spin_rpm": 30.0,
                "swing_angle": 0.0,
            }
            state.last_ball_params = fallback
            return fallback

        action, state.lstm_states = model.predict(
            obs,
            state=state.lstm_states,
            episode_start=state.episode_starts,
        )
        state.last_action = action[0]
        state.episode_starts = np.zeros((1,), dtype=bool)
        real_params = decode_action(state.last_action)
        state.last_ball_params = real_params
        return real_params


async def _handle_unity_feedback(payload: dict):
    user_result = payload.get("result")
    if user_result not in ["start", "hit", "miss"]:
        return

    print(f"[ws] <- {payload}")

    async with state._lock:
        # Save PREVIOUS delivered ball against feedback.
        if user_result in ["hit", "miss"] and state.last_ball_params is not None:
            send_to_kafka(state.last_ball_params, user_result)
            outcome_val = 1.0 if user_result == "miss" else -1.0
            obs = np.concatenate((state.last_action, [outcome_val])).reshape(1, -1)
        else:
            obs = np.zeros((1, 6))
            state.episode_starts = np.ones((1,), dtype=bool)
            state.lstm_states = None

    next_ball = await _next_ball_from_state(obs)
    print(f"[ws] -> {next_ball}")
    await manager.send_to_unity(next_ball)
    await manager.send_to_flask({"type": "next_ball", "ball": next_ball, "source_result": user_result})


async def _handle_flask_command(payload: dict):
    """
    Expected payload:
      {"type":"command","command":"manual_override",...}
      {"type":"command","command":"persona_select",...}
      {"type":"command","command":"mode_set","mode":"rl|manual|persona"}
    """
    if payload.get("type") != "command":
        return

    cmd = payload.get("command")
    ack = {"type": "command_ack", "command": cmd, "status": "ok"}

    async with state._lock:
        if cmd == "mode_set":
            mode = payload.get("mode")
            if mode not in ["rl", "manual", "persona"]:
                ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": "invalid mode"}
            else:
                state.mode = mode

        elif cmd == "manual_override":
            enabled = bool(payload.get("enabled", True))
            ball = payload.get("ball")
            if enabled:
                if not isinstance(ball, dict):
                    ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": "missing ball"}
                else:
                    ok, reason = _validate_ball_params(ball)
                    if not ok:
                        ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": reason}
                    else:
                        state.manual_ball = {k: float(ball[k]) for k in ball}
                        state.mode = "manual"
            else:
                state.manual_ball = None
                if state.mode == "manual":
                    state.mode = "rl"

        elif cmd == "persona_select":
            persona = payload.get("persona", {})
            persona_id = persona.get("id")
            ball = persona.get("ball")
            if not persona_id:
                ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": "missing persona.id"}
            elif not isinstance(ball, dict):
                ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": "missing persona.ball"}
            else:
                ok, reason = _validate_ball_params(ball)
                if not ok:
                    ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": reason}
                else:
                    state.persona_id = str(persona_id)
                    state.persona_ball = {k: float(ball[k]) for k in ball}
                    state.mode = "persona"

        else:
            ack = {"type": "command_ack", "command": cmd, "status": "error", "reason": "unknown command"}

    await manager.send_to_flask(ack)
    await manager.send_to_flask({"type": "state", **(await state.snapshot()), "connections": await manager.counts()})


# --- WEBSOCKET SERVER ---
@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    role = websocket.query_params.get("client", "unity").lower()
    if role not in ["unity", "flask"]:
        role = "unity"

    await manager.connect(websocket, role)
    print(f"✅ Connected: role={role}")
    await websocket.send_text(json.dumps({"type": "connected", "role": role}))
    await manager.send_to_flask({"type": "state", **(await state.snapshot()), "connections": await manager.counts()})

    try:
        while True:
            response = await websocket.receive_text()
            payload = json.loads(response)

            if role == "unity":
                await _handle_unity_feedback(payload)
            else:
                await _handle_flask_command(payload)
    except WebSocketDisconnect:
        print(f"❌ Disconnected: role={role}")
    finally:
        await manager.disconnect(websocket, role)
        await manager.send_to_flask({"type": "state", **(await state.snapshot()), "connections": await manager.counts()})