from kafka import KafkaConsumer
import json

print("🎧 Listening for Cricket Data on 'cricket_telemetry'...")

consumer = KafkaConsumer(
    'cricket_telemetry',
    bootstrap_servers=['localhost:9092'],
    auto_offset_reset='latest',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

for message in consumer:
    data = message.value
    result = data['outcome']
    speed = data['parameters']['speed_kph']
    print(f"🔥 RECEIVED: User {result.upper()} a {speed:.1f} kph delivery!")