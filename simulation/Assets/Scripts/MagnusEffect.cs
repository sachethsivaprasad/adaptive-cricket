using UnityEngine;

public class MagnusEffect : MonoBehaviour
{
    [Header("Aerodynamics")]
    // Increase this number to make the ball swing MORE. 
    // 0.002 is realistic. 0.01 is "Video Game" swing.
    public float magnusConstant = 0.002f; 

    private Rigidbody rb;

    void Awake()
    {
        rb = GetComponent<Rigidbody>();
    }

    void FixedUpdate()
    {
        // Safety check: Don't calculate if physics isn't ready
        if (rb == null) return;

        // The Physics Math:
        // Force = Cross Product(Velocity, AngularVelocity)
        // If the ball is moving forward and spinning backwards, this creates LIFT.
        // If it spins sideways, it creates SWING.
        Vector3 magnusForce = Vector3.Cross(rb.linearVelocity, rb.angularVelocity) * magnusConstant;
        
        rb.AddForce(magnusForce);
    }
}