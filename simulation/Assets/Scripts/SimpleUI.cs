using UnityEngine;
using UnityEngine.InputSystem;

public class SimpleUI : MonoBehaviour
{
    public NetworkManager networkManager;
    private bool gameStarted = false;

    void Update()
    {
        if (Keyboard.current == null) return;

        // Press 'S' to request the very first ball
        if (!gameStarted && Keyboard.current.sKey.wasPressedThisFrame)
        {
            gameStarted = true;
            SendOutcome("start");
            Debug.Log("Game Started: Requesting first ball...");
        }

        // Press 'H' for HIT
        if (gameStarted && Keyboard.current.hKey.wasPressedThisFrame)
        {
            SendOutcome("hit");
        }

        // Press 'M' for MISS
        if (gameStarted && Keyboard.current.mKey.wasPressedThisFrame)
        {
            SendOutcome("miss");
        }
    }

    void SendOutcome(string resultValue)
    {
        if (networkManager != null)
        {
            // This sends the result and tells Python "I am ready for the next one"
            string json = "{\"result\": \"" + resultValue + "\"}";
            networkManager.SendJson(json);
        }
    }
}