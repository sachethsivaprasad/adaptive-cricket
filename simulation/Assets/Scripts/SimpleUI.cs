using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// S = start game (sends "start", server returns first ball JSON).
/// Reaction window arms when a ball is actually spawned (not when server message is queued).
/// Space = hit, timeout = miss. Next physical ball only after current one is destroyed (BowlingMachine).
/// </summary>
public class SimpleUI : MonoBehaviour
{
    [Header("Dependencies")]
    [SerializeField] private NetworkManager networkManager;
    [SerializeField] private BowlingMachine bowlingMachine;

    [Header("Input")]
    [SerializeField] private Key startKey = Key.S;
    [SerializeField] private Key hitKey = Key.Space;

    [Header("Reaction window (seconds)")]
    [Tooltip("Random window per delivery: min to max.")]
    [SerializeField] private Vector2 reactionWindowSeconds = new Vector2(5f, 10f);

    private bool gameStarted;
    private bool waitingForShot;
    private float reactionDeadline;

    private void Start()
    {
        if (bowlingMachine != null)
            bowlingMachine.OnDeliverySpawned += OnDeliverySpawned;
    }

    private void OnDestroy()
    {
        if (bowlingMachine != null)
            bowlingMachine.OnDeliverySpawned -= OnDeliverySpawned;
    }

    /// <summary>Physical ball just spawned — start hit/miss window.</summary>
    private void OnDeliverySpawned()
    {
        if (!gameStarted)
            return;

        if (waitingForShot)
        {
            Debug.LogWarning("[SimpleUI] New delivery spawned while still in reaction window — overlapping windows.");
        }

        float window = Random.Range(
            Mathf.Max(0.5f, reactionWindowSeconds.x),
            Mathf.Max(reactionWindowSeconds.x + 0.01f, reactionWindowSeconds.y));
        waitingForShot = true;
        reactionDeadline = Time.time + window;
        Debug.Log($"[SimpleUI] Window: {window:0.0}s — {hitKey} = HIT, else MISS.");
    }

    private void Update()
    {
        if (Keyboard.current == null) return;

        if (!gameStarted && Keyboard.current[startKey].wasPressedThisFrame)
        {
            gameStarted = true;
            SendOutcome("start");
            Debug.Log("[SimpleUI] Game started — waiting for first delivery.");
        }

        if (!gameStarted || !waitingForShot) return;

        if (Keyboard.current[hitKey].wasPressedThisFrame)
        {
            waitingForShot = false;
            SendOutcome("hit");
            Debug.Log("[SimpleUI] HIT");
            return;
        }

        if (Time.time >= reactionDeadline)
        {
            waitingForShot = false;
            SendOutcome("miss");
            Debug.Log("[SimpleUI] MISS (timeout)");
        }
    }

    private void SendOutcome(string resultValue)
    {
        if (networkManager == null) return;
        string json = "{\"result\": \"" + resultValue + "\"}";
        networkManager.SendJson(json);
    }

    public void ReportHitFromBat()
    {
        if (!gameStarted || !waitingForShot) return;
        waitingForShot = false;
        SendOutcome("hit");
        Debug.Log("[SimpleUI] HIT (bat)");
    }

    public void ReportMissFromBat()
    {
        if (!gameStarted || !waitingForShot) return;
        waitingForShot = false;
        SendOutcome("miss");
        Debug.Log("[SimpleUI] MISS (bat)");
    }
}
