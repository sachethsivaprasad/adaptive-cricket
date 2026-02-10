using UnityEngine;
using UnityEngine.InputSystem; // Required for the new system

public class BallLauncher : MonoBehaviour
{
    [Header("Assignments")]
    public Rigidbody ballPrefab;   // Drag your Ball Prefab here
    public Transform releasePoint; // Drag the ReleasePoint object here
    public Transform stumpsTarget; // Drag the Wickets object here

    [Header("Settings")]
    public float gravity = 9.81f;
    
    [Header("Lifecycle")]
    [SerializeField] private Vector2 ballLifetimeSecondsRange = new Vector2(5f, 10f);

    // This function acts as the "Trigger"
    public void Bowl(float speedKph, float targetLengthM, float targetLineM, float spinRpm, float swingAngle)
    {
        // 1. Create the ball at the release point
        Rigidbody ball = Instantiate(ballPrefab, releasePoint.position, Quaternion.identity);
        
        // 1b. Auto-cleanup: delete this ball after 5–10 seconds so old deliveries don't pile up.
        // (This doesn't affect physics; Unity will destroy the GameObject after the delay.)
        float lifetime = Mathf.Max(0.1f, UnityEngine.Random.Range(ballLifetimeSecondsRange.x, ballLifetimeSecondsRange.y));
        Destroy(ball.gameObject, lifetime);

        // 2. Add the Magnus Effect script dynamically (if not already on the prefab)
        if (ball.GetComponent<MagnusEffect>() == null)
        {
            ball.gameObject.AddComponent<MagnusEffect>();
        }

        // 3. Calculate where the ball should land
        // Target Z is calculated relative to the stumps.
        Vector3 targetPos = new Vector3(
            stumpsTarget.position.x + targetLineM, 
            0, 
            stumpsTarget.position.z + targetLengthM
        );

        // 4. Do the math to find the velocity vector
        Vector3 launchVelocity = CalculateLaunchVelocity(releasePoint.position, targetPos, speedKph);

        // 5. Fire!
        ball.linearVelocity = launchVelocity;

        // 6. Apply Spin (This causes the curve)
        float spinRad = spinRpm * 0.1047f; // Convert RPM to Radians
        // Calculate spin axis based on seam angle
        Vector3 spinAxis = Quaternion.Euler(0, swingAngle, 0) * Vector3.right;
        ball.angularVelocity = spinAxis * spinRad;
    }

    // Physics calculation to hit a target X,Z given a speed
    Vector3 CalculateLaunchVelocity(Vector3 start, Vector3 end, float speedKph)
    {
        float speedMs = speedKph / 3.6f; // Convert kph to m/s

        Vector3 toTarget = end - start;
        Vector3 toTargetXZ = new Vector3(toTarget.x, 0, toTarget.z);
        
        // Time = Distance / Speed
        float time = toTargetXZ.magnitude / speedMs;

        // Calculate required vertical velocity (Vy) to fight gravity
        // Formula: Vy = (DifferenceInY + 0.5 * g * t^2) / t
        float vy = (toTarget.y + (0.5f * gravity * time * time)) / time;

        Vector3 finalVelocity = toTargetXZ.normalized * speedMs;
        finalVelocity.y = vy;

        return finalVelocity;
    }

    // TEST BUTTON: Press Spacebar to fire
    void Update()
    {
        // New Input System check
        if (Keyboard.current.spaceKey.wasPressedThisFrame)
        {
            Bowl(100f, 4.0f, 0f, 0f, 0f);
            Debug.Log("Fired!");
        }
    }
}   