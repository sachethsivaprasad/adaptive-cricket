from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
import json
import random

app = FastAPI()

# This class matches your Unity "BallParams" C# class exactly
class BallParams:
    def __init__(self, speed, length, line, spin, swing):
        self.speed_kph = speed
        self.target_length = length
        self.target_line = line
        self.spin_rpm = spin
        self.swing_angle = swing

    def to_json(self):
        return json.dumps(self.__dict__)

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    print("⏳ Unity is trying to connect...")
    await websocket.accept()
    print("✅ Unity Connected!")

    try:
        while True:
            # 1. Wait for Unity to ask for a ball (or just send one every 5 seconds)
            # For now, let's just send a new ball every 3 seconds automatically
            await asyncio.sleep(3)

            # 2. DECIDE: (The AI Logic goes here later)
            # Random "Mock" Decision
            decision = BallParams(
                speed=random.uniform(120.0, 150.0),      # Fast to Medium
                length=random.uniform(2.0, 8.0),         # Yorker to Short
                line=random.uniform(-0.5, 0.5),          # Leg to Off stump
                spin=random.uniform(0, 3000),            # No spin to heavy spin
                swing=random.uniform(-10, 10)            # Slight swing
            )

            # 3. SEND: Send the JSON to Unity
            json_payload = decision.to_json()
            print(f"📡 Sending to Unity: {json_payload}")
            await websocket.send_text(json_payload)

    except WebSocketDisconnect:
        print("❌ Unity Disconnected")
    except Exception as e:
        print(f"⚠️ Error: {e}")