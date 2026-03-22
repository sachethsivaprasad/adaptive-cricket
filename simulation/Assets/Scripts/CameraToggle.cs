using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// Press C to switch between Main Camera and Secondary Camera.
/// Assign both cameras in the Inspector. Only one stays enabled at a time.
/// </summary>
public class CameraToggle : MonoBehaviour
{
    [Header("Cameras")]
    [SerializeField] private Camera mainCamera;
    [SerializeField] private Camera secondaryCamera;

    [Header("Input")]
    [SerializeField] private Key toggleKey = Key.C;

    private bool useSecondary;

    private void Start()
    {
        // Start with main view (secondary off) if references are set.
        if (mainCamera != null) mainCamera.enabled = true;
        if (secondaryCamera != null) secondaryCamera.enabled = false;
    }

    private void Update()
    {
        if (Keyboard.current == null) return;
        if (!Keyboard.current[toggleKey].wasPressedThisFrame) return;
        if (mainCamera == null || secondaryCamera == null)
        {
            Debug.LogWarning("[CameraToggle] Assign Main Camera and Secondary Camera in the Inspector.");
            return;
        }

        useSecondary = !useSecondary;
        mainCamera.enabled = !useSecondary;
        secondaryCamera.enabled = useSecondary;
    }
}
