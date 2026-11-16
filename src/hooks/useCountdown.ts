import { useEffect, useState } from 'react'
import { useLatest } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'

/** 3-2-1 countdown. `onDone` is read from a ref so parent rerenders don't restart it. */
export function useCountdown(active: boolean, onDone: () => void): number {
  const [value, setValue] = useState(3)
  const onDoneRef = useLatest(onDone)

  useEffect(() => {
    if (!active) return
    let current = 3
    setValue(3)
    playTone(440, 0.05)
    triggerHaptic('tick')
    const id = window.setInterval(() => {
      current -= 1
      if (current <= 0) {
        window.clearInterval(id)
        setValue(0)
        playTone(660, 0.07)
        triggerHaptic('medium')
        onDoneRef.current()
        return
      }
      setValue(current)
      playTone(440, 0.05)
      triggerHaptic('tick')
    }, 680)
    return () => window.clearInterval(id)
  }, [active, onDoneRef])

  return value
}
