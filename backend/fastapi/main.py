from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable
import json
import numpy as np
import time
from sb3_contrib import RecurrentPPO

# --- CONFIGURATION ---
KAFKA_TOPIC = "cricket_telemetry"
KAFKA_SERVER = "localhost:9092"

app = FastAPI()

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
        "speed_kph": float(np.interp(act[0], [-1, 1], [100, 160])),
        "target_length": float(np.interp(act[1], [-1, 1], [0, 10])),
        "target_line": float(np.interp(act[2], [-1, 1], [-1, 1])),
        "spin_rpm": float(np.interp(act[3], [-1, 1], [0, 3000])),
        "swing_angle": float(np.interp(act[4], [-1, 1], [-10, 10]))
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