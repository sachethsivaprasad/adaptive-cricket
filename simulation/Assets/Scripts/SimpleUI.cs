using UnityEngine;
using UnityEngine.InputSystem; // Required for Keyboard.current

public class SimpleUI : MonoBehaviour
{
    public NetworkManager networkManager;

    void Update()
    {
        // Check if keyboard is connected to avoid errors
        if (Keyboard.current == null) return;

        // Press 'H' for HIT (Bad for AI)
        if (Keyboard.current.hKey.wasPressedThisFrame)
        {
            SendOutcome("hit");
        }

        // Press 'M' for MISS (Good for AI)
        if (Keyboard.current.mKey.wasPressedThisFrame)
        {
            SendOutcome("miss");
        }
    }

    void SendOutcome(string result)
    {
        if (networkManager != null)
        {
            // Construct JSON: {"result": "hit"} or {"result": "miss"}
            string json = "{\"result\": \"" + result + "\"}";
            networkManager.SendJson(json);
            
            Debug.Log("Sent Result: " + result.ToUpper());
        }
    }
}