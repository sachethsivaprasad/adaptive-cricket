"""
Seed Kafka with sample cricket telemetry for dashboard demo.
Run when Kafka is up but you don't have Unity/game data yet.

  python seed_kafka.py
"""
import json
import time
from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

KAFKA_TOPIC = "cricket_telemetry"
KAFKA_SERVER = "localhost:9092"


def main():
    try:
        producer = KafkaProducer(
            bootstrap_servers=[KAFKA_SERVER],
            value_serializer=lambda x: json.dumps(x).encode("utf-8"),
        )
        print(f"✅ Connected to Kafka. Seeding '{KAFKA_TOPIC}'...")
    except NoBrokersAvailable:
        print(f"❌ Kafka not found at {KAFKA_SERVER}. Start with: docker-compose up -d zookeeper kafka")
        return

    base_time = time.time() - 3600
    outcomes = ["hit", "miss", "hit", "miss", "hit", "hit", "miss", "hit", "miss", "miss"]
    for i in range(40):
        outcome = outcomes[i % len(outcomes)]
        payload = {
            "timestamp": base_time + i * 80,
            "outcome": outcome,
            "parameters": {
                "speed_kph": 110 + (i % 5) * 10,
                "target_length": 2 + (i % 4) * 2,
                "target_line": -0.5 + (i % 3) * 0.5,
                "spin_rpm": 500 + (i % 6) * 400,
                "swing_angle": -4 + (i % 5) * 2,
            },
        }
        producer.send(KAFKA_TOPIC, value=payload)
    producer.flush()
    print("✅ Sent 40 sample balls. Refresh the dashboard to see them.")


if __name__ == "__main__":
    main()
