using UnityEngine;
using UnityEngine.InputSystem; // <--- REQUIRED for the New Input System

public class BowlingMachine : MonoBehaviour
{
    [Header("Dependencies")]
    public NetworkManager networkManager;
    public BallLauncher ballLauncher;

    [System.Serializable]
    public class BallParams
    {
        public float speed_kph;
        public float target_length;
        public float target_line;
        public float spin_rpm;
        public float swing_angle;
    }

    void Start()
    {
        // Subscribe to the network message event
        if (networkManager != null)
        {
            networkManager.OnBallReceived += HandleNewBall;
        }
    }

    void HandleNewBall(string jsonArgs)
    {
        try 
        {
            BallParams data = JsonUtility.FromJson<BallParams>(jsonArgs);

            if (data == null) 
            {
                Debug.LogError("Failed to read ball parameters!");
                return;
            }

            Debug.Log($"Bowling: {data.speed_kph}kph at Length {data.target_length}m");
            
            ballLauncher.Bowl(
                data.speed_kph, 
                data.target_length, 
                data.target_line, 
                data.spin_rpm, 
                data.swing_angle
            );
        }
        catch (System.Exception e)
        {
            Debug.LogError("Error parsing JSON: " + e.Message);
        }
    }

    // TEST: Simulate receiving a network message by pressing 'T'
    void Update()
    {
        // OLD CODE (Causes Crash): if (Input.GetKeyDown(KeyCode.T))
        
        // NEW CODE (Works):
        if (Keyboard.current != null && Keyboard.current.tKey.wasPressedThisFrame)
        {
            Debug.Log("Test Key 'T' Pressed - Sending Mock Data");
            string mockJson = "{\"speed_kph\": 135.0, \"target_length\": 6.0, \"target_line\": -0.2, \"spin_rpm\": 2200, \"swing_angle\": 0}";
            HandleNewBall(mockJson);
        }
    }
}