import { useEffect, useRef } from 'react'

/** Always calls the latest callback without restarting the frame loop. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  ref.current = value
  return ref
}

/**
 * Frame loop for canvas drills.
 * `dt` is clamped so a backgrounded tab cannot teleport targets.
 * The callback ref is updated every render so the loop stays closed over fresh state
 * without re-subscribing requestAnimationFrame.
 */
export function useRaf(active: boolean, onFrame: (dt: number, now: number) => void): void {
  const onFrameRef = useLatest(onFrame)

  useEffect(() => {
    if (!active) return
    let frame = 0
    let last = performance.now()

    const loop = (now: number) => {
      const dt = Math.min(34, now - last)
      last = now
      onFrameRef.current(dt, now)
      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [active, onFrameRef])
}
