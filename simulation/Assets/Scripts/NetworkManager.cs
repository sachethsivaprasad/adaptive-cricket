using UnityEngine;
using NativeWebSocket;
using System.Text;
using System;

public class NetworkManager : MonoBehaviour
{
    WebSocket websocket;

    [Header("Connection Settings")]
    // Replace 8000 with your FastAPI port
    public string serverUrl = "ws://localhost:8000/ws/game"; 
    public bool connectOnStart = true;

    // Events to tell other scripts when things happen
    public event Action<string> OnBallReceived; 

    async void Start()
    {
        if (connectOnStart)
        {
            await ConnectToServer();
        }
    }

    async System.Threading.Tasks.Task ConnectToServer()
    {
        websocket = new WebSocket(serverUrl);

        websocket.OnOpen += () => Debug.Log("Connection open!");
        websocket.OnError += (e) => Debug.Log("Error: " + e);
        websocket.OnClose += (e) => Debug.Log("Connection closed!");

        // When Python sends a message, this runs:
        websocket.OnMessage += (bytes) =>
        {
            // 1. Decode the bytes to a string
            string message = Encoding.UTF8.GetString(bytes);
            Debug.Log("Received: " + message);

            // 2. Notify the BowlingMachine script
            if (OnBallReceived != null)
            {
                OnBallReceived.Invoke(message);
            }
        };

        await websocket.Connect();
    }

    void Update()
    {
        // Required by NativeWebSocket to process messages on the main thread
        #if !UNITY_WEBGL || UNITY_EDITOR
            if (websocket != null) websocket.DispatchMessageQueue();
        #endif
    }

    private async void OnApplicationQuit()
    {
        if (websocket != null) await websocket.Close();
    }
}