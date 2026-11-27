// Steps, from a phone's motion sensor. The sensor cannot say where the phone
// is, only how it is being shaken, so a step is a bump in the acceleration.
// Which way the visitor is walking cannot be told.
//
// Returns a listener for `devicemotion` that calls `onStep` at each one.
export function stepDetector(onStep: () => void) {
    let gravity = 9.81
    let lastStep = 0
    let armed = true
    return (event: DeviceMotionEvent) => {
        const a = event.accelerationIncludingGravity
        if (!a || a.x == null || a.y == null || a.z == null) return
        const size = Math.hypot(a.x, a.y, a.z)
        gravity += (size - gravity) * 0.05
        const bump = size - gravity
        const now = performance.now()
        if (armed && bump > 1.6 && now - lastStep > 320) {
            lastStep = now
            armed = false
            onStep()
        }
        if (bump < 0.4) armed = true
    }
}
