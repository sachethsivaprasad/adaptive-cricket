from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json

import numpy as np
from sb3_contrib import RecurrentPPO


# Load the new model
model = RecurrentPPO.load("rl_model.zip")
app = FastAPI()

# Action Decoder (Same as before)
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
    
    # State Memory
    lstm_states = None
    episode_starts = np.ones((1,), dtype=bool)
    last_action = np.zeros(5)

    # 1. Send the first ball (Neutral Guess)
    action, lstm_states = model.predict(np.zeros((1, 6)), state=lstm_states, deterministic=True)
    last_action = action[0]
    await websocket.send_text(json.dumps(decode_action(last_action)))

    try:
        while True:
            # 2. Wait for Unity: "hit" or "miss"
            response = await websocket.receive_text()
            data = json.loads(response) # Expects: {"result": "hit"} or {"result": "miss"}
            
            # 3. Convert to AI Number (Miss = 1.0, Hit = -1.0)
            outcome_val = 1.0 if data["result"] == "miss" else -1.0
            
            print(f"User says: {data['result'].upper()} (Reward: {outcome_val})")

            # 4. Prepare Observation [Last_Action + Outcome]
            obs = np.concatenate((last_action, [outcome_val])).reshape(1, -1)
            
            # 5. Predict Next Ball
            action, lstm_states = model.predict(obs, state=lstm_states, episode_start=episode_starts)
            last_action = action[0]
            episode_starts = np.zeros((1,), dtype=bool)

            # 6. Send
            await websocket.send_text(json.dumps(decode_action(last_action)))

    except WebSocketDisconnect:
        print("Disconnected")