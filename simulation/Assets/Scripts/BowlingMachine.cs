using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

public class BowlingMachine : MonoBehaviour
{
    [Header("Dependencies")]
    public NetworkManager networkManager;
    public BallLauncher ballLauncher;

    /// <summary>Fired each time a delivery is actually spawned (after previous ball is gone).</summary>
    public event Action OnDeliverySpawned;

    [System.Serializable]
    public class BallParams
    {
        public float speed_kph;
        public float target_length;
        public float target_line;
        public float spin_rpm;
        public float swing_angle;
    }

    private readonly Queue<BallParams> _pending = new Queue<BallParams>();
    private Rigidbody _activeBall;

    private void Start()
    {
        if (networkManager != null)
            networkManager.OnBallReceived += HandleNewBall;
    }

    private void OnDestroy()
    {
        if (networkManager != null)
            networkManager.OnBallReceived -= HandleNewBall;
    }

    private void HandleNewBall(string jsonArgs)
    {
        try
        {
            if (string.IsNullOrEmpty(jsonArgs) || !jsonArgs.Contains("\"speed_kph\""))
                return;

            BallParams data = JsonUtility.FromJson<BallParams>(jsonArgs);
            if (data == null)
            {
                Debug.LogError("[BowlingMachine] Failed to read ball parameters!");
                return;
            }

            if (_activeBall != null)
            {
                _pending.Enqueue(data);
                Debug.Log($"[BowlingMachine] Queued next delivery (speed={data.speed_kph:0.0} kph). Active ball still in play.");
                return;
            }

            SpawnDelivery(data);
        }
        catch (Exception e)
        {
            Debug.LogError("[BowlingMachine] Error parsing JSON: " + e.Message);
        }
    }

    private void SpawnDelivery(BallParams data)
    {
        if (ballLauncher == null)
        {
            Debug.LogError("[BowlingMachine] BallLauncher missing.");
            return;
        }

        Debug.Log($"[BowlingMachine] Spawning delivery {data.speed_kph:0.0} kph, length={data.target_length:0.00} m");
        _activeBall = ballLauncher.Bowl(
            data.speed_kph,
            data.target_length,
            data.target_line,
            data.spin_rpm,
            data.swing_angle);
        OnDeliverySpawned?.Invoke();
    }

    // TEST: Simulate receiving a network message by pressing 'T'
    private void UpdateTestKey()
    {
        if (Keyboard.current != null && Keyboard.current.tKey.wasPressedThisFrame)
        {
            Debug.Log("[BowlingMachine] Test key T — mock ball JSON");
            string mockJson = "{\"speed_kph\": 135.0, \"target_length\": 6.0, \"target_line\": -0.2, \"spin_rpm\": 2200, \"swing_angle\": 0}";
            HandleNewBall(mockJson);
        }
    }

    private void Update()
    {
        // When the active ball is destroyed, _activeBall becomes null; then spawn next queued delivery.
        if (_activeBall == null && _pending.Count > 0)
            SpawnDelivery(_pending.Dequeue());

        UpdateTestKey();
    }
}
