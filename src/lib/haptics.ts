/**
 * Tactile feedback for mobile browsers using navigator.vibrate.
 * Safely no-ops on desktop or unsupported devices.
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'tick'

const PATTERNS: Record<HapticType, number | number[]> = {
  light: 12,
  medium: 22,
  heavy: 40,
  tick: 8,
  success: [15, 40, 25],
  warning: [30, 40, 30],
}

let hapticsEnabled = true

export function setHapticsEnabled(enabled: boolean): void {
  hapticsEnabled = enabled
}

export function triggerHaptic(type: HapticType = 'light'): void {
  if (!hapticsEnabled) return
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(PATTERNS[type])
    } catch {
      // Ignore vibration blocks in restricted frames
    }
  }
}
