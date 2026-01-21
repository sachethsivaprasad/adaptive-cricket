from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json

import numpy as np
from sb3_contrib import RecurrentPPO

# Load the model
model = RecurrentPPO.load("rl_model.zip")
app = FastAPI()

# Action Decoder
def decode_action(act):
    return {
        "speed_kph": float(np.interp(act[0], [-1, 1], [100, 160])),
        "target_length": float(np.interp(act[1], [-1, 1], [0, 10])),
        "target_line": float(np.interp(act[2], [-1, 1], [-1, 1])),
        "spin_rpm": float(np.interp(act[3], [-1, 1], [0, 3000])),
        "swing_angle": float(np.interp(act[4], [-1, 1], [-10, 10]))
    }

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("✅ Unity Connected & Waiting for First Trigger")
    
    lstm_states = None
    episode_starts = np.ones((1,), dtype=bool)
    last_action = np.zeros(5)

    try:
        while True:
            # 1. Wait for Unity to send result of the previous ball
            # Expected JSON: {"result": "hit"} OR {"result": "start"} for the very first ball
            response = await websocket.receive_text()
            data = json.loads(response)
            
            user_result = data.get("result")

            # 2. Logic for the Very First Ball
            if user_result == "start":
                print("🎮 Game Start Requested")
                obs = np.zeros((1, 6)) # Neutral start
            else:
                # Logic for subsequent balls
                outcome_val = 1.0 if user_result == "miss" else -1.0
                print(f"📥 Result Received: {user_result.upper()}")
                obs = np.concatenate((last_action, [outcome_val])).reshape(1, -1)

            # 3. Predict Next Ball
            action, lstm_states = model.predict(
                obs, 
                state=lstm_states, 
                episode_start=episode_starts
            )
            
            last_action = action[0]
            episode_starts = np.zeros((1,), dtype=bool)

            # 4. Send the new ball data to Unity
            ball_data = decode_action(last_action)
            print(f"🚀 Sending Ball: {ball_data['speed_kph']:.1f} kph")
            await websocket.send_text(json.dumps(ball_data))

    except WebSocketDisconnect:
        print("❌ Connection Closed")