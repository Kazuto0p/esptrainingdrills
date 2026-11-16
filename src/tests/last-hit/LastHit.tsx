import { useRef, useState } from 'react'
import { DrillFrame } from '@/components/test/DrillFrame'
import { useLatest, useRaf } from '@/hooks/useRaf'
import { playTone } from '@/lib/audio'
import { triggerHaptic } from '@/lib/haptics'
import { clamp, randomBetween } from '@/lib/cn'
import { scoreMean } from '@/lib/scoring'
import { median, stdDev } from '@/lib/stats'
import type { AttemptPayload, Difficulty, TestModuleProps } from '@/types'

interface CreepResult {
  point: number
  rt: number | null
}

const SETTINGS: Record<Difficulty, { count: number; drainMs: number; bandHigh: number }> = {
  easy: { count: 5, drainMs: 2500, bandHigh: 32 },
  normal: { count: 6, drainMs: 1900, bandHigh: 22 },
  hard: { count: 8, drainMs: 1450, bandHigh: 16 },
}

const BAND_LOW = 8

/**
 * The bar is drained on the frame clock and painted by writing the DOM
 * directly, so React does not re-render at 60fps.
 * A tap inside [bandLow, bandHigh] is a clean last-hit. Prediction is allowed,
 * so this drill has no reaction-time floor.
 */
export default function LastHit({ mode, onComplete, onExit }: TestModuleProps) {
  const onCompleteRef = useLatest(onComplete)
  const fillRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const hpRef = useRef(100)
  const speedRef = useRef(0.05)
  const bandHighRef = useRef(22)
  const runningRef = useRef(false)
  const gapUntilRef = useRef(0)
  const windowOpenedAt = useRef<number | null>(null)
  const resultsRef = useRef<CreepResult[]>([])
  const totalRef = useRef(6)
  const indexRef = useRef(0)
  const difficultyRef = useRef<Difficulty>('normal')
  const startedAtRef = useRef(0)
  const doneRef = useRef(false)
  const [live, setLive] = useState(false)
  const [progress, setProgress] = useState('')
  const [note, setNote] = useState('Wait for the bracket')

  const paint = (hp: number) => {
    const play = fillRef.current
    const label = valueRef.current
    const track = trackRef.current
    const clamped = clamp(hp, 0, 100)
    if (play) play.style.left = `${100 - clamped}%`
    if (label) label.textContent = String(Math.max(0, Math.round(clamped)))
    if (track) track.dataset.hot = clamped <= bandHighRef.current && clamped >= BAND_LOW ? '1' : '0'
  }

  const spawn = () => {
    const config = SETTINGS[difficultyRef.current]
    hpRef.current = 100
    speedRef.current = 100 / (config.drainMs * (0.9 + Math.random() * 0.2))
    windowOpenedAt.current = null
    runningRef.current = true
    gapUntilRef.current = 0
    indexRef.current += 1
    setProgress(`${indexRef.current} / ${totalRef.current}`)
    setNote('Tap inside the bracket')
    paint(100)
  }

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    runningRef.current = false
    const results = resultsRef.current
    const clean = results.filter((item) => item.point === 1)
    const times = clean.map((item) => item.rt).filter((rt): rt is number => rt != null)
    const reaction = median(times)
    const spread = stdDev(times)
    const accuracy = results.length === 0 ? 0 : (clean.length / results.length) * 100
    const payload: AttemptPayload = {
      testId: 'last-hit',
      score: scoreMean(results.map((item) => item.point)),
      reactionTime: reaction,
      accuracy,
      metadata: {
        difficulty: difficultyRef.current,
        mode,
        samples: times.length,
        rtStd: spread == null ? 0 : Math.round(spread),
        durationMs: Math.round(performance.now() - startedAtRef.current),
      },
    }
    onCompleteRef.current(payload)
  }

  useRaf(live, (dt, now) => {
    if (doneRef.current) return
    if (gapUntilRef.current) {
      if (now < gapUntilRef.current) return
      gapUntilRef.current = 0
      if (resultsRef.current.length >= totalRef.current) {
        finish()
        return
      }
      spawn()
      return
    }
    if (!runningRef.current) return
    hpRef.current -= speedRef.current * dt
    if (hpRef.current <= bandHighRef.current && windowOpenedAt.current == null) {
      windowOpenedAt.current = now
    }
    if (hpRef.current <= 0) {
      hpRef.current = 0
      paint(0)
      resultsRef.current.push({ point: 0, rt: null })
      runningRef.current = false
      gapUntilRef.current = now + 420
      setNote('Late')
      playTone(160, 0.06, 'triangle')
      return
    }
    paint(hpRef.current)
  })

  const tap = () => {
    if (!runningRef.current || doneRef.current) return
    const hp = hpRef.current
    const high = bandHighRef.current
    let point = 0
    let rt: number | null = null
    if (hp <= high && hp >= BAND_LOW) {
      point = 1
      rt = windowOpenedAt.current == null ? 0 : performance.now() - windowOpenedAt.current
      setNote('Clean')
      playTone(760, 0.05)
      triggerHaptic('light')
    } else if (Math.abs(hp - high) < 8 || (hp < BAND_LOW && hp > BAND_LOW - 8)) {
      point = 0.4
      setNote(hp > high ? 'Early' : 'Late')
      playTone(240, 0.05, 'triangle')
      triggerHaptic('warning')
    } else {
      setNote(hp > high ? 'Early' : 'Late')
      playTone(160, 0.06, 'triangle')
      triggerHaptic('warning')
    }
    resultsRef.current.push({ point, rt })
    runningRef.current = false
    paint(hp)
    gapUntilRef.current = performance.now() + randomBetween(380, 520)
  }

  return (
    <DrillFrame
      testId="last-hit"
      mode={mode}
      onExit={onExit}
      progress={progress}
      onArmed={(difficulty) => {
        const config = SETTINGS[difficulty]
        difficultyRef.current = difficulty
        bandHighRef.current = config.bandHigh
        totalRef.current = config.count
        resultsRef.current = []
        indexRef.current = 0
        doneRef.current = false
        startedAtRef.current = performance.now()
        setLive(true)
        spawn()
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-center px-5 pb-6">
        <p className="mb-6 text-center text-sm text-mute" aria-live="polite">
          {note}
        </p>
        <button
          type="button"
          className="arena rounded-3xl border border-white/10 bg-[#0c0e16] px-4 py-8"
          onPointerDown={(event) => {
            event.preventDefault()
            tap()
          }}
        >
          <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wider text-mute">
            <span>Creep</span>
            <span ref={valueRef} className="font-mono text-base text-white">
              100
            </span>
          </div>
          <div ref={trackRef} className="relative h-12 rounded-full bg-white/5 data-[hot=1]:ring-2 data-[hot=1]:ring-gold">
            <div
              className="absolute inset-y-1 rounded-md border border-gold/80 bg-gold/20 flex items-center justify-center overflow-hidden"
              style={{
                left: `${100 - bandHighRef.current}%`,
                width: `${bandHighRef.current - BAND_LOW}%`,
              }}
            >
              <span className="text-[9px] uppercase font-bold tracking-wider text-gold select-none opacity-80">
                Hit
              </span>
            </div>
            <div
              ref={fillRef}
              className="absolute top-1 h-10 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-glow"
              style={{ left: '0%' }}
            />
          </div>
          <p className="mt-4 text-center text-sm text-white/80">Tap once while the fill sits in the gold bracket</p>
        </button>
      </div>
    </DrillFrame>
  )
}
